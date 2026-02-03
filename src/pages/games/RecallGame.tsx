import React, { useState, useEffect, useMemo } from 'react'
import { GameComponent, GameItem } from '../../types'
import { Icons } from '../../components/Icons'
import { useSettings } from '../../contexts/SettingsContext'
import { playSound } from '../../utils/sound'
import { toHiragana } from '../../utils/kana'
import { openFlashcardModal } from '../../components/modals/FlashcardModal'
import { useGameLogic } from '../../hooks/useGameLogic'
import { GameContainer } from '../../components/GameContainer'
import _ from 'lodash'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'

export const RecallGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems)
  const items = propItems || fetchedItems

  const gameLogic = useGameLogic({
    gameId: 'typing',
    totalRounds: propItems?.length || 1,
    initialRoundNumber: 0,
    canSkip: false,
    scoreDelay: 0,
    onComplete,
  })

  const { startGame, recordAttempt, gameState, setGameItems, setMaxScore, endGame } = gameLogic
  const { gameItems, isFinished } = gameState

  const [startChar, setStartChar] = useState('')
  const [revealedHints, setRevealedHints] = useState<GameItem[]>([])
  const [input, setInput] = useState('')
  const [highlightIds, setHighlightIds] = useState<number[]>([])

  const { soundEnabled, setHelpSteps } = useSettings()

  const foundWords = useMemo(() => {
    return gameItems.filter(item => item.correct)
  }, [gameItems])

  const availableHints = useMemo(() => {
    return _.chain(gameItems)
      .without(...revealedHints)
      .filter(item => !item.correct)
      .value()
  }, [revealedHints, gameItems])

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Start Character',
        description: 'You are given a starting Hiragana character.',
        icon: Icons.FileQuestion,
      },
      {
        title: 'Recall Words',
        description:
          'Type as many learned words as you can that start with that character. Press Enter on empty input to finish.',
        icon: Icons.Brain,
      },
      {
        title: 'Hints',
        description: 'Stuck? Use the hint button to reveal a Kanji.',
        icon: Icons.Lightbulb,
      },
    ])

    return () => setHelpSteps(null)
  }, [])

  const initGame = () => {
    startGame()
    setRevealedHints([])
    setInput('')
    setHighlightIds([])

    const vocab = items.filter(i => i.subject.object === 'vocabulary')
    if (vocab.length === 0) return

    // Pick random start char from available vocab
    const randomItem = _.sample(vocab)
    const reading = randomItem!.subject.readings?.[0]?.reading
    if (!reading) return

    const char = reading.charAt(0)
    setStartChar(char)

    // Find all unique matches
    const matches = _.chain(vocab)
      .filter(i => !!i.subject.readings?.[0]?.reading.startsWith(char))
      .uniqBy(item => item.subject.id)
      .value()

    setGameItems(matches)
    setMaxScore(matches.length)
  }

  useEffect(() => {
    if (!loading && items.length > 0 && gameItems.length === 0) initGame()
  }, [items, loading, gameItems])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() === '') {
      endGame()
      return
    }

    const val = toHiragana(input).trim()

    // Find ALL words matching this reading
    const matches = gameItems.filter(item => item.subject.readings?.some(r => r.reading === val))

    if (matches.length > 0) {
      // Check which are new
      let newItemsFound: boolean = false
      const alreadyIds: number[] = []

      matches.forEach(m => {
        const subjectId = m.subject.id

        if (!m.correct) {
          recordAttempt(m, true)

          newItemsFound = true
        } else {
          alreadyIds.push(subjectId)
        }
      })

      if (!newItemsFound) {
        // All matching words already found -> trigger highlight
        setHighlightIds(alreadyIds)
        playSound('pop', soundEnabled)
        setTimeout(() => setHighlightIds([]), 1000)
      }

      setInput('')
    } else {
      playSound('error', soundEnabled)
    }
  }

  const handleHint = () => {
    const hint = _.sample(availableHints)
    if (!hint) return

    setRevealedHints(prev => [...prev, hint])
    playSound('pop', soundEnabled)

    setInput('')
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  }

  return (
    <GameContainer
      gameLogic={gameLogic}
      onHint={handleHint}
      hintDisabled={availableHints.length === 0}
      isLastGame={isLastGame}
    >
      <div className="text-center mb-8">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">
          Words starting with
        </div>
        <div className="text-6xl font-bold text-indigo-600 mb-6">{startChar}</div>

        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="relative mb-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type reading..."
              className="w-full px-4 py-3 text-center text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 outline-none"
              autoFocus
              disabled={foundWords.length === gameItems.length}
            />
            <p className="text-xs text-gray-400 mt-2">Press Enter with empty input to finish</p>
          </form>

          {/* Live Found List */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {foundWords.map(({ subject }) => {
              const isHighlight = highlightIds.includes(subject.id)
              return (
                <button
                  key={subject.id}
                  onClick={() => openFlashcardModal([subject])}
                  className={`px-3 py-1 rounded-lg text-sm font-bold transition-all duration-300 ${isHighlight ? 'bg-yellow-300 text-yellow-900 scale-110' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                >
                  {subject.characters}
                </button>
              )
            })}
          </div>

          {revealedHints.length > 0 && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {revealedHints.map(({ subject }) => (
                <div
                  key={subject.id}
                  className="px-3 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm font-bold animate-fade-in"
                >
                  {subject.characters}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameContainer>
  )
}
