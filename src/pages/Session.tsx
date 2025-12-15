import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { User, Subject, Assignment, GameItem, GameResultData } from '../types'
import { waniKaniService } from '../services/wanikaniService'
import { Icons } from '../components/Icons'
import { Button } from '../components/ui/Button'
import { Flashcard } from '../components/Flashcard'
import { MatchingGame } from './games/MatchingGame'
import { QuizGame } from './games/QuizGame'
import { MemoryGame } from './games/MemoryGame'
import { ConnectGame } from './games/ConnectGame'
import { VariationsQuizGame } from './games/VariationsQuizGame'
import { useUser } from '../contexts/UserContext'

type SessionPhase = 'fetch' | 'learn' | 'game' | 'submit' | 'complete'

export const Session: React.FC<{ mode: 'lesson' | 'review' }> = ({ mode }) => {
  const { user } = useUser()
  const [items, setItems] = useState<{ subject: Subject; assignment?: Assignment }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [drillDownStack, setDrillDownStack] = useState<Subject[]>([])

  // Lesson specific state
  const [lessonPhase, setLessonPhase] = useState<SessionPhase>('fetch')
  const [lessonBatch, setLessonBatch] = useState<{ subject: Subject; assignment?: Assignment }[]>(
    [],
  )
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([])
  const [gameQueue, setGameQueue] = useState<string[]>([])
  const [currentGame, setCurrentGame] = useState<string | null>(null)

  const navigate = useNavigate()

  // --- REVIEW MODE LOGIC ---
  useEffect(() => {
    if (mode === 'review') {
      const fetchReviews = async () => {
        setLoading(true)
        try {
          // Simplified review fetch for standard mode
          const summary = await waniKaniService.getSummary()
          const reviewIds = summary.data.reviews[0]?.subject_ids || []
          if (reviewIds.length > 0) {
            // Take top 50
            const idsToFetch = reviewIds.slice(0, 50)
            const subCol = await waniKaniService.getSubjects(idsToFetch)
            const assignCol = await waniKaniService.getAssignments(idsToFetch)

            const assignMap = new Map()
            assignCol.data.forEach(a => assignMap.set(a.data.subject_id, a.data))

            const reviewItems = subCol.data.map(s => ({
              subject: { ...s.data, id: s.id, object: s.object, url: s.url },
              assignment: assignMap.get(s.id),
            }))

            setItems(reviewItems.sort(() => 0.5 - Math.random()))
          } else {
            setItems([])
          }
        } catch (e) {
          console.error(e)
        } finally {
          setLoading(false)
        }
      }
      fetchReviews()
    }
  }, [mode])

  // --- LESSON MODE LOGIC ---
  useEffect(() => {
    if (mode === 'lesson') {
      const fetchLessons = async () => {
        setLoading(true)
        try {
          const summary = await waniKaniService.getSummary()
          const lessonIds = summary.data.lessons[0]?.subject_ids || []

          if (lessonIds.length > 0) {
            // Only fetch top 15 lessons as requested
            const idsToFetch = lessonIds.slice(0, 15)
            const subCol = await waniKaniService.getSubjects(idsToFetch)
            const assignCol = await waniKaniService.getAssignments(idsToFetch) // Fetch assignments

            const assignMap = new Map<number, Assignment>()
            if (assignCol.data) {
              assignCol.data.forEach(a => assignMap.set(a.data.subject_id, { ...a.data, id: a.id }))
            }

            const lessonItems = subCol.data.map(s => ({
              subject: { ...s.data, id: s.id, object: s.object, url: s.url },
              assignment: assignMap.get(s.id),
            }))

            setItems(lessonItems)
            startLessonBatch(lessonItems, 0)
          } else {
            setItems([])
            setLessonPhase('complete') // No lessons available
          }
        } catch (e) {
          console.error(e)
        } finally {
          setLoading(false)
        }
      }
      fetchLessons()
    }
  }, [mode])

  const startLessonBatch = (allItems: typeof items, startIndex: number) => {
    const batch = allItems.slice(startIndex, startIndex + 5)
    if (batch.length > 0) {
      setLessonBatch(batch)
      setLessonPhase('learn')
      setCurrentIndex(0)
    } else {
      setLessonPhase('complete')
    }
  }

  const handleLessonNext = async () => {
    // Learning Phase
    if (lessonPhase === 'learn') {
      if (currentIndex < lessonBatch.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        // Finished learning batch, generate game queue
        const games = ['quiz', 'matching', 'memory']

        // Add type-specific games
        const isAllVocab = lessonBatch.every(i => i.subject.object === 'vocabulary')
        const isAllKanji = lessonBatch.every(i => i.subject.object === 'kanji')

        if (isAllVocab) games.push('connect')
        if (isAllKanji) games.push('variations')

        // Pick 2 random games
        const selected = games.sort(() => 0.5 - Math.random()).slice(0, 2)
        setGameQueue(selected)
        setCurrentGame(selected[0])
        setLessonPhase('game')
      }
    }
  }

  const handleGameComplete = async (data?: GameResultData) => {
    const nextIdx = gameQueue.indexOf(currentGame!) + 1
    if (nextIdx < gameQueue.length) {
      setCurrentGame(gameQueue[nextIdx])
    } else {
      setLessonPhase('submit')
      await submitLessonBatch()
    }
  }

  const submitLessonBatch = async () => {
    // API call to start assignments
    for (const item of lessonBatch) {
      try {
        if (item.assignment?.id) {
          await waniKaniService.startAssignment(item.assignment.id)
          setCompletedLessonIds(prev => [...prev, item.subject.id!])
        }
      } catch (e) {
        console.error('Failed to start assignment', e)
      }
    }

    // Check for next batch
    const doneCount = completedLessonIds.length + lessonBatch.length
    if (doneCount < items.length) {
      startLessonBatch(items, doneCount)
    } else {
      setLessonPhase('complete')
    }
  }

  // --- REVIEW NAVIGATION ---
  const handleReviewNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setDrillDownStack([])
    } else {
      setLessonPhase('complete') // Actually just complete review
    }
  }

  const handleReviewPrev = () => {
    if (drillDownStack.length > 0) {
      setDrillDownStack(prev => prev.slice(0, -1))
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  // --- RENDER HELPERS ---

  if (loading)
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading session data...</p>
      </div>
    )

  if (
    lessonPhase === 'complete' ||
    (mode === 'review' && items.length > 0 && currentIndex >= items.length)
  ) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Icons.CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          {mode === 'lesson'
            ? `You've learned ${completedLessonIds.length} new items!`
            : "You've finished your review queue!"}
        </p>
        <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
      </div>
    )
  }

  if (items.length === 0)
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
          <Icons.BookOpen className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No items available</h2>
        <p className="text-gray-500 mb-6">
          {mode === 'lesson' ? 'No lessons in your queue.' : 'No reviews available right now.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go Back
        </Button>
        .
      </div>
    )

  // --- LESSON GAMES RENDER ---
  if (mode === 'lesson') {
    if (lessonPhase === 'game' && currentGame) {
      const gameItems: GameItem[] = lessonBatch.map(l => ({
        subject: l.subject,
        assignment: l.assignment,
        isReviewable: false,
      }))

      const commonProps = {
        user,
        items: gameItems,
        onComplete: handleGameComplete,
      }

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
                  key={g}
                  className={`h-1.5 w-8 rounded-full ${g === currentGame ? 'bg-indigo-600' : idx < gameQueue.indexOf(currentGame!) ? 'bg-green-400' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>

          {currentGame === 'quiz' && <QuizGame {...commonProps} />}
          {currentGame === 'matching' && <MatchingGame {...commonProps} />}
          {currentGame === 'memory' && <MemoryGame {...commonProps} />}
          {currentGame === 'connect' && <ConnectGame {...commonProps} />}
          {currentGame === 'variations' && <VariationsQuizGame {...commonProps} />}
        </div>
      )
    }

    // Learn Phase
    const activeSubject = lessonBatch[currentIndex].subject
    const progress = ((currentIndex + 1) / lessonBatch.length) * 100

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
            <span>Learning Batch</span>
            <span>
              {currentIndex + 1} / {lessonBatch.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <Flashcard
            subject={activeSubject}
            onPrev={() => currentIndex > 0 && setCurrentIndex(p => p - 1)}
            onNext={handleLessonNext}
            hasPrev={currentIndex > 0}
            hasNext={true}
          />
        </div>
      </div>
    )
  }

  // --- STANDARD REVIEW RENDER ---
  const currentItem = items[currentIndex]
  const activeSubject =
    drillDownStack.length > 0 ? drillDownStack[drillDownStack.length - 1] : currentItem.subject
  const activeAssignment = drillDownStack.length > 0 ? undefined : currentItem.assignment
  const isDrillDown = drillDownStack.length > 0

  const progress = ((currentIndex + 1) / items.length) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      {/* Navigation / Breadcrumbs */}
      <div className="mb-8">
        {!isDrillDown ? (
          <>
            <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
              <span>Review Session</span>
              <span>
                {currentIndex + 1} / {items.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </>
        ) : (
          <div className="flex items-center flex-wrap gap-2 text-sm">
            <button
              onClick={() => setDrillDownStack([])}
              className="text-indigo-600 font-medium hover:underline flex items-center"
            >
              <Icons.Layers className="w-3 h-3 mr-1" />
              Session
            </button>
            {drillDownStack?.map((s, idx) => (
              <React.Fragment key={s.id || idx}>
                <Icons.ChevronRight className="w-3 h-3 text-gray-400" />
                <button
                  onClick={() => setDrillDownStack(drillDownStack.slice(0, idx + 1))}
                  className={`hover:underline flex items-center ${idx === drillDownStack.length - 1 ? 'font-bold text-gray-800 pointer-events-none' : 'text-indigo-600 font-medium'}`}
                >
                  {s.characters || s.meanings?.[0]?.meaning}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <Flashcard
          subject={activeSubject}
          assignment={activeAssignment}
          onNext={handleReviewNext}
          onPrev={handleReviewPrev}
          hasPrev={isDrillDown || currentIndex > 0}
          hasNext={!isDrillDown}
          onDrillDown={s => setDrillDownStack(prev => [...prev, s])}
        />
      </div>
    </div>
  )
}
