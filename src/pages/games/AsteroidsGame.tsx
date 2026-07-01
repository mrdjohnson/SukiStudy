import { useEffect, useRef, useState } from 'react'
import { Button } from '@mantine/core'
import { IconHeart, IconHeartFilled } from '@tabler/icons-react'
import clsx from 'clsx'
import _ from 'lodash'

import type { GameComponent, GameItem, Subject } from '../../core/types'
import { SubjectType } from '../../core/types'
import { useLearnedSubjects } from '../../hooks/useLearnedSubjects'
import { useGameLogic } from '../../hooks/useGameLogic'
import { useSettings } from '../../contexts/SettingsContext'
import { GameResults } from '../../components/GameResults'
import { Icons } from '../../components/Icons'
import { playSound } from '../../utils/sound'
import { toRomanji } from '../../utils/kana'

const GAME_DURATION = 60 // seconds to survive
const WAVE_DURATION = 15 // seconds before the target words refresh
const MAX_MISTAKES = 5 // wrong clicks allowed before game over
const TARGETS_PER_WAVE = 3
const DECOYS_PER_WAVE = 5
const SPAWN_INTERVAL = 1300 // ms between falling asteroids
const MAX_ON_SCREEN = 7
const FALL_BASE = 7.5 // base seconds for a short word to cross the screen
const FALL_MIN = 4.5
const FALL_MAX = 12
const MIN_ITEMS = 6

type PromptType = 'meaning' | 'reading' | 'romaji'

type Prompt = { type: PromptType; text: string; label: string }

type Target = {
  item: GameItem
  subject: Subject
  prompt: Prompt
  hits: number
}

type AsteroidStatus = 'falling' | 'correct' | 'wrong'

type Asteroid = {
  id: number
  item: GameItem
  subject: Subject
  leftPct: number
  duration: number
  status: AsteroidStatus
}

type WaveData = {
  spawnList: GameItem[]
  spawnIndex: number
  waveIndex: number
}

const isKanaSubject = (subject: Subject) =>
  subject.isKana ||
  subject.object === SubjectType.HIRAGANA ||
  subject.object === SubjectType.KATAKANA

const glyphOf = (subject: Subject) => subject.characters || subject.slug
const glyphLen = (subject: Subject) => glyphOf(subject).length

const primaryReading = (subject: Subject) =>
  subject.readings?.find(reading => reading.primary)?.reading ?? subject.readings?.[0]?.reading

const primaryMeaning = (subject: Subject) =>
  subject.meanings.find(meaning => meaning.primary)?.meaning ?? subject.meanings[0]?.meaning

// Longer words drift down more slowly so there's time to read them; the wave
// index shaves a little off so later waves feel faster.
const computeDuration = (subject: Subject, waveIndex: number) => {
  const lengthTime = Math.min(glyphLen(subject), 10) * 0.45
  const ramp = waveIndex * 0.5
  return Math.min(FALL_MAX, Math.max(FALL_MIN, FALL_BASE - ramp + lengthTime))
}

// Build the hint shown at the bottom for a target. Kana show their rōmaji;
// kanji/vocabulary randomly show a meaning, kana reading, or rōmaji reading.
const makePrompt = (subject: Subject): Prompt | null => {
  const reading = primaryReading(subject)
  const meaning = primaryMeaning(subject)

  const options: Prompt[] = []

  if (isKanaSubject(subject)) {
    const source = reading || subject.characters
    if (source) options.push({ type: 'romaji', text: toRomanji(source), label: 'Rōmaji' })
  } else {
    if (meaning) options.push({ type: 'meaning', text: meaning, label: 'Meaning' })
    if (reading) {
      options.push({ type: 'reading', text: reading, label: 'Reading' })
      options.push({ type: 'romaji', text: toRomanji(reading), label: 'Rōmaji' })
    }
  }

  const valid = options.filter(option => option.text && option.text !== subject.characters)
  return valid.length ? _.sample(valid)! : null
}

const buildTargets = (items: GameItem[], count: number): Target[] => {
  const targets: Target[] = []
  const usedChars = new Set<string>()
  const usedPrompts = new Set<string>()

  for (const item of _.shuffle(items)) {
    if (targets.length >= count) break

    const glyph = glyphOf(item.subject)
    if (usedChars.has(glyph)) continue

    const prompt = makePrompt(item.subject)
    if (!prompt || usedPrompts.has(prompt.text)) continue

    usedChars.add(glyph)
    usedPrompts.add(prompt.text)
    targets.push({ item, subject: item.subject, prompt, hits: 0 })
  }

  return targets
}

// Pick decoys whose character length mirrors the targets, so you can't spot the
// answer just by which asteroid is longest.
const pickDecoys = (items: GameItem[], targets: Target[], count: number): GameItem[] => {
  const excludeIds = new Set(targets.map(target => target.subject.id))
  const excludeGlyphs = new Set(targets.map(target => glyphOf(target.subject)))
  const targetLens = targets.map(target => glyphLen(target.subject))

  const seen = new Set<string>()
  const pool = _.shuffle(
    items.filter(({ subject }) => {
      const glyph = glyphOf(subject)
      if (excludeIds.has(subject.id) || excludeGlyphs.has(glyph) || seen.has(glyph)) return false
      seen.add(glyph)
      return true
    }),
  )

  const result: GameItem[] = []
  const usedIds = new Set<number>()
  const lengthCycle = _.shuffle(targetLens)

  for (let i = 0; i < count; i++) {
    const wantLen = lengthCycle[i % Math.max(1, lengthCycle.length)] ?? 1
    const pick =
      pool.find(
        item => !usedIds.has(item.subject.id) && Math.abs(glyphLen(item.subject) - wantLen) <= 1,
      ) ?? pool.find(item => !usedIds.has(item.subject.id))

    if (!pick) break
    usedIds.add(pick.subject.id)
    result.push(pick)
  }

  return result
}

export const AsteroidsGame: GameComponent = ({ items: propItems, onComplete, isLastGame }) => {
  const { items: fetchedItems, loading } = useLearnedSubjects(!propItems, 'asteroids')
  const items = propItems || fetchedItems

  const { soundEnabled, setHelpSteps } = useSettings()

  const gameLogic = useGameLogic({
    gameId: 'asteroids',
    totalRounds: Number.MAX_SAFE_INTEGER, // survival game — never auto-ends on rounds
    initialRoundNumber: 1,
    canSkip: false,
    scoreDelay: 0,
    onComplete,
  })
  const { gameState, startGame, recordAttempt, endGame, setMaxScore } = gameLogic

  const [playing, setPlaying] = useState(false)
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [mistakes, setMistakes] = useState(0)
  const [destroyed, setDestroyed] = useState(0)
  const [targets, setTargets] = useState<Target[]>([])
  const [asteroids, setAsteroids] = useState<Asteroid[]>([])

  // Refs mirror state that timer callbacks need to read without going stale.
  const targetsRef = useRef<Target[]>([])
  const waveRef = useRef<WaveData | null>(null)
  const waveCountRef = useRef(0)
  const mistakesRef = useRef(0)
  const clearedIdsRef = useRef<Set<number>>(new Set())
  const facedIdsRef = useRef<Set<number>>(new Set())
  const playingRef = useRef(false)
  const overRef = useRef(false)
  const asteroidIdRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([])
  const mountedRef = useRef(true)
  const endGameRef = useRef(endGame)
  endGameRef.current = endGame

  const addTimer = (id: ReturnType<typeof setInterval>) => {
    timersRef.current.push(id)
    return id
  }

  const clearTimers = () => {
    timersRef.current.forEach(id => {
      clearInterval(id)
      clearTimeout(id)
    })
    timersRef.current = []
  }

  const applyTargets = (next: Target[]) => {
    targetsRef.current = next
    setTargets(next)
  }

  useEffect(() => {
    setHelpSteps([
      {
        title: 'Read your targets',
        description: 'The words at the bottom are meanings or readings you need to find.',
        icon: Icons.ListCheck,
      },
      {
        title: 'Shoot the matches',
        description: 'Tap a falling asteroid whose character matches a target word to destroy it.',
        icon: Icons.Meteor,
      },
      {
        title: 'Mind your health',
        description: `Wrong taps cost health. Survive ${GAME_DURATION} seconds without ${MAX_MISTAKES} mistakes to win!`,
        icon: Icons.CheckCircle,
      },
    ])

    return () => setHelpSteps(null)
  }, [setHelpSteps])

  useEffect(() => {
    // Reset on (re)mount — StrictMode runs an extra mount/unmount cycle, so the
    // flag must be raised in setup, not just initialised, or removals no-op.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimers()
    }
  }, [])

  const removeAsteroid = (id: number) => {
    if (!mountedRef.current) return
    setAsteroids(prev => prev.filter(asteroid => asteroid.id !== id))
  }

  const startWave = () => {
    const waveIndex = waveCountRef.current
    waveCountRef.current += 1

    const nextTargets = buildTargets(items, TARGETS_PER_WAVE)
    nextTargets.forEach(target => facedIdsRef.current.add(target.subject.id))

    const decoys = pickDecoys(items, nextTargets, DECOYS_PER_WAVE)

    // Each target appears twice so a missed one still gets a second chance.
    const spawnList = _.shuffle([
      ...nextTargets.map(target => target.item),
      ...nextTargets.map(target => target.item),
      ...decoys,
    ])

    waveRef.current = { spawnList, spawnIndex: 0, waveIndex }
    applyTargets(nextTargets)
  }

  const nextWave = () => {
    // A target never destroyed this wave counts as a miss (once per subject).
    targetsRef.current.forEach(target => {
      if (target.hits === 0 && !clearedIdsRef.current.has(target.subject.id)) {
        recordAttempt(target.item, false, true)
      }
    })
    startWave()
  }

  const spawnTick = () => {
    const wave = waveRef.current
    if (!wave || wave.spawnList.length === 0) return

    const item = wave.spawnList[wave.spawnIndex % wave.spawnList.length]
    wave.spawnIndex += 1

    // Keep wider words nearer the middle so they don't clip off the edges.
    const margin = Math.min(38, 8 + glyphLen(item.subject) * 3)
    const leftPct = margin + Math.random() * (100 - 2 * margin)

    const id = (asteroidIdRef.current += 1)

    setAsteroids(prev => {
      if (prev.length >= MAX_ON_SCREEN) return prev
      return [
        ...prev,
        {
          id,
          item,
          subject: item.subject,
          leftPct,
          duration: computeDuration(item.subject, wave.waveIndex),
          status: 'falling',
        },
      ]
    })
  }

  const finish = (result: 'win' | 'lose') => {
    if (overRef.current) return
    overRef.current = true
    playingRef.current = false

    clearTimers()
    setPlaying(false)
    setOutcome(result)
    setAsteroids([])

    // Record the current wave's un-destroyed targets and lock in the final score.
    targetsRef.current.forEach(target => {
      if (target.hits === 0 && !clearedIdsRef.current.has(target.subject.id)) {
        recordAttempt(target.item, false, true)
      }
    })
    setMaxScore(Math.max(1, facedIdsRef.current.size))

    playSound(result === 'win' ? 'success' : 'error', soundEnabled)

    // Let the recorded attempts flush before useGameLogic snapshots the results.
    addTimer(setTimeout(() => endGameRef.current(), 80))
  }

  const startPlaying = () => {
    clearTimers()
    startGame()

    overRef.current = false
    playingRef.current = true
    mountedRef.current = true
    mistakesRef.current = 0
    waveCountRef.current = 0
    asteroidIdRef.current = 0
    waveRef.current = null
    clearedIdsRef.current = new Set()
    facedIdsRef.current = new Set()

    setOutcome(null)
    setMistakes(0)
    setDestroyed(0)
    setTimeLeft(GAME_DURATION)
    setAsteroids([])
    setPlaying(true)

    startWave()

    addTimer(setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000))
    addTimer(setInterval(spawnTick, SPAWN_INTERVAL))
    addTimer(setInterval(nextWave, WAVE_DURATION * 1000))
  }

  const handleAsteroidClick = (asteroid: Asteroid) => {
    if (!playingRef.current || asteroid.status !== 'falling') return

    const subjectId = asteroid.subject.id
    const target = targetsRef.current.find(candidate => candidate.subject.id === subjectId)

    if (target) {
      // Correct — every matching asteroid scores, but only record the word once.
      setDestroyed(value => value + 1)

      if (!clearedIdsRef.current.has(subjectId)) {
        clearedIdsRef.current.add(subjectId)
        recordAttempt(target.item, true) // records history + plays the success sound
      } else {
        playSound('pop', soundEnabled)
      }

      applyTargets(
        targetsRef.current.map(candidate =>
          candidate.subject.id === subjectId
            ? { ...candidate, hits: candidate.hits + 1 }
            : candidate,
        ),
      )

      setAsteroids(prev =>
        prev.map(current =>
          current.id === asteroid.id ? { ...current, status: 'correct' } : current,
        ),
      )
      addTimer(setTimeout(() => removeAsteroid(asteroid.id), 320))
      return
    }

    // Wrong tap — costs health.
    playSound('error', soundEnabled)
    setAsteroids(prev =>
      prev.map(current => (current.id === asteroid.id ? { ...current, status: 'wrong' } : current)),
    )
    addTimer(setTimeout(() => removeAsteroid(asteroid.id), 340))

    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    if (mistakesRef.current >= MAX_MISTAKES) finish('lose')
  }

  // Survive the countdown to win. Kept out of the timer's updater so the
  // state setter stays pure under StrictMode.
  useEffect(() => {
    if (playing && timeLeft <= 0) finish('win')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, timeLeft])

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-indigo-600">
          <Icons.RotateCcw />
        </div>
      </div>
    )
  }

  if (items.length < MIN_ITEMS) {
    return (
      <div className="p-8 text-center text-gray-500">
        Not enough items to play Asteroids yet. Learn a few more first!
      </div>
    )
  }

  if (gameState.isFinished) {
    return (
      <div className="flex flex-col">
        <div
          className={clsx(
            'mx-auto mt-2 rounded-full px-4 py-1.5 text-sm font-bold',
            outcome === 'win'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
          )}
        >
          {outcome === 'win' ? '🎉 You survived the storm!' : '💥 Your ship was overwhelmed'}
        </div>
        <GameResults gameLogic={gameLogic} onPlayAgain={startPlaying} isLastGame={isLastGame} />
      </div>
    )
  }

  if (!playing) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="rounded-full bg-slate-100 p-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icons.Meteor className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Asteroids</h2>
          <p className="mt-2 text-gray-500">
            Words rain from the sky. Tap the asteroids whose characters match the target words at
            the bottom. Wrong taps cost health — survive {GAME_DURATION} seconds to win.
          </p>
        </div>
        <Button size="lg" onClick={startPlaying} leftSection={<Icons.Meteor className="h-5 w-5" />}>
          Launch
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col select-none">
      <style>{ASTEROID_KEYFRAMES}</style>

      {/* HUD */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: MAX_MISTAKES }).map((_unused, index) =>
            index < MAX_MISTAKES - mistakes ? (
              <IconHeartFilled key={index} className="h-5 w-5 text-red-500" />
            ) : (
              <IconHeart key={index} className="h-5 w-5 text-gray-300 dark:text-gray-600" />
            ),
          )}
        </div>

        <div className="flex items-center gap-1.5 font-bold text-slate-500">
          <Icons.Meteor className="h-4 w-4" />
          {destroyed}
        </div>

        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-500">
          <Icons.Clock className="h-4 w-4" />
          {timeLeft}s
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
        />
      </div>

      {/* Play area */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {asteroids.map(asteroid => (
          <div
            key={asteroid.id}
            className="absolute -translate-x-1/2"
            style={{
              left: `${asteroid.leftPct}%`,
              animation: `ast-fall ${asteroid.duration}s linear forwards`,
            }}
            onAnimationEnd={event => {
              if (event.animationName === 'ast-fall') removeAsteroid(asteroid.id)
            }}
          >
            <button
              type="button"
              disabled={asteroid.status !== 'falling'}
              onClick={() => handleAsteroidClick(asteroid)}
              aria-label={glyphOf(asteroid.subject)}
              className={clsx(
                'inline-flex h-14 min-w-14 max-w-[80%] items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-br from-slate-600 to-slate-800 px-3 font-bold text-white shadow-lg ring-2 ring-white/10 transition-transform active:scale-90 sm:h-16 sm:min-w-16',
                asteroid.status === 'correct' && 'ast-pop-correct',
                asteroid.status === 'wrong' && 'ast-pop-wrong',
              )}
              translate="no"
            >
              <AsteroidGlyph subject={asteroid.subject} />
            </button>
          </div>
        ))}
      </div>

      {/* Targets */}
      <div className="shrink-0 border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-gray-400">
          Destroy these words
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {targets.map(target => (
            <div
              key={target.subject.id}
              className={clsx(
                'relative flex flex-col items-center rounded-xl border px-3 py-1.5 transition-colors',
                target.hits > 0
                  ? 'border-green-400 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800',
              )}
            >
              {target.hits > 0 && (
                <span className="absolute -right-2 -top-2 rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
                  ×{target.hits}
                </span>
              )}
              <span className="text-base font-bold">{target.prompt.text}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {target.prompt.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const AsteroidGlyph = ({ subject }: { subject: Subject }) => {
  const glyph = subject.characters
  if (glyph) {
    const len = glyph.length
    const size =
      len > 6
        ? 'text-sm'
        : len > 4
          ? 'text-base'
          : len > 2
            ? 'text-lg'
            : len > 1
              ? 'text-2xl'
              : 'text-3xl'
    return <span className={size}>{glyph}</span>
  }

  const svg = subject.character_images?.find(image => image.content_type === 'image/svg+xml')?.url
  if (svg) {
    return <img src={svg} alt="" className="h-8 w-8 brightness-0 invert" />
  }

  return <span className="text-sm">{subject.slug}</span>
}

const ASTEROID_KEYFRAMES = `
@keyframes ast-fall {
  from { top: -16%; }
  to { top: 118%; }
}
@keyframes ast-pop-correct {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes ast-pop-wrong {
  0% { transform: scale(1); opacity: 1; }
  25% { transform: translateX(-5px) rotate(-8deg); }
  50% { transform: translateX(5px) rotate(8deg); }
  100% { transform: scale(0.5); opacity: 0; }
}
.ast-pop-correct { animation: ast-pop-correct 0.32s ease-out forwards; }
.ast-pop-wrong { animation: ast-pop-wrong 0.34s ease-out forwards; }
`
