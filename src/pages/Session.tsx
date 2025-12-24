import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { GameItem, GameResultData } from '../types'
import { waniKaniService } from '../services/wanikaniService'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { Flashcard } from '../components/Flashcard'
import { Group, Progress, Select, Stack } from '@mantine/core'
import _ from 'lodash'
import { GameDefinition, games } from '../utils/games'
import { useGames } from '../hooks/useGames'
import { useListState } from '@mantine/hooks'
import { useAssignedSubjects } from '../hooks/useAssignedSubjects'
import { assignments } from '../services/db'

type SessionPhase = 'fetch' | 'learn' | 'game'

export const Session = () => {
  const allowedGames = useGames()
  const [currentIndex, setCurrentIndex] = useState(0)

  const { items, loading } = useAssignedSubjects()

  // Lesson specific state
  const [lessonPhase, setLessonPhase] = useState<SessionPhase>('fetch')
  const [gameQueue, gameQueueHandlers] = useListState<GameDefinition>([])
  const [currentGame, setCurrentGame] = useState<GameDefinition>()
  const gameHistoryRef = useRef<GameItem[]>([])

  const navigate = useNavigate()

  const lessonBatch = useMemo(() => {
    return items.splice(0, 5)
  }, [items])

  useEffect(() => {
    setCurrentIndex(0)
  }, [items])

  const startLessonGame = () => {
    // Finished learning batch, generate game queue
    const learningGameIds = ['quiz', 'typing']

    // // Add type-specific games
    // const isAllVocab = lessonBatch.every(i => i.subject.object === 'vocabulary')
    // const isAllKanji = lessonBatch.every(i => i.subject.object === 'kanji')

    // if (isAllVocab) learningGameIds.push('connect')
    // if (isAllKanji) learningGameIds.push('variations')

    // Pick 2 random games
    const selectedGames = _.chain(games)
      .filter(game => learningGameIds.includes(game.id))
      .intersection(allowedGames)
      .sampleSize(2)
      .value()

    gameQueueHandlers.setState(selectedGames)
    setCurrentGame(selectedGames[0])
    setLessonPhase('game')
  }

  const handleGameComplete = async (data: GameResultData) => {
    const nextIdx = gameQueue.indexOf(currentGame!) + 1

    gameHistoryRef.current.push(...data.history)

    if (nextIdx < gameQueue.length) {
      setCurrentGame(gameQueue[nextIdx])
    } else {
      await submitLessonBatch()
    }
  }

  const submitLessonBatch = async () => {
    // API call to start assignments

    for (const item of lessonBatch) {
      try {
        if (item.assignment?.id) {
          await waniKaniService.startAssignment(item.assignment.id)
        }
      } catch (e) {
        console.error('Failed to start assignment', e)
      }
    }

    assignments.batch(() => {
      for (const { assignment } of lessonBatch) {
        if (assignment?.id) {
          assignments.updateOne({ id: assignment.id }, { $set: { ...assignment, srs_stage: -1 } })
        }
      }
    })
  }

  // --- RENDER HELPERS ---

  if (loading)
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading session data...</p>
      </div>
    )

  if (items.length === 0)
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
          <Icons.BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No items available</h2>
        <p className="text-gray-500 mb-6">No lessons in your queue.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go Back
        </Button>
        .
      </div>
    )

  if (lessonPhase === 'game' && currentGame) {
    const commonProps = {
      items: lessonBatch,
      onComplete: handleGameComplete,
    }

    const Component = currentGame.component

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Icons.Gamepad2 className="w-5 h-5 text-indigo-500" />
            Reviewing Batch
          </h2>
          <div className="flex justify-center gap-1 mt-2">
            {gameQueue.map((g, idx) => (
              <div
                key={g.id}
                className={`h-1.5 w-8 rounded-full ${g.id === currentGame.id ? 'bg-indigo-600' : idx < gameQueue.indexOf(currentGame!) ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        {<Component {...commonProps} />}
      </div>
    )
  }

  // Learn Phase
  const progress = ((currentIndex + 1) / lessonBatch.length) * 100

  return (
    <div className="max-w-4xl mx-auto md:px-4 py-2 flex flex-col min-h-[calc(100vh-64px)]">
      <Stack className="mb-8" gap="sm">
        <Group className="justify-center place-content-center mx-auto flex-nowrap!">
          <Select
            defaultValue="0"
            data={lessonBatch.map(({ subject }, index) => ({
              value: index + '',
              label: subject.characters || 'unknown',
            }))}
            onOptionSubmit={value => setCurrentIndex(_.toNumber(value))}
          />

          <Button onClick={startLessonGame}>Quiz</Button>
        </Group>

        <Progress value={progress} radius={'xl'} />
      </Stack>

      <div className="flex-1 flex flex-col justify-center">
        <Flashcard
          items={lessonBatch.map(item => item.subject)}
          index={currentIndex}
          onIndexChanged={setCurrentIndex}
        />
      </div>
    </div>
  )
}
