import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useListState } from '@mantine/hooks'
import { useNavigate } from 'react-router'

import { GameResultData, GameState, GameItem } from '../types'
import { games } from '../utils/games'
import { playSound } from '../utils/sound'
import { useSettings } from '../contexts/SettingsContext'
import { waniKaniService } from '../services/wanikaniService'
import moment from 'moment'
import { encounterService } from '../services/encounterService'

type UseGameLogicProps = {
  gameId: string
  onComplete?: (data: GameResultData) => void
  maxScore?: number // Optional static max score, otherwise calculated dynamically
  totalRounds?: number
  initialRoundNumber?: number
  canSkip?: boolean
  scoreDelay?: number
  onRoundFinish?: () => void
}

export type GameLogic<T extends GameItem> = ReturnType<typeof useGameLogic<T>>

export type GameStep<T extends GameItem> = T & {
  correct?: boolean
}

export const useGameLogic = <T extends GameItem>({
  gameId,
  onComplete,
  maxScore: initialMaxScore = 0,
  totalRounds = 7,
  initialRoundNumber,
  canSkip = true,
  scoreDelay = 1500,
  onRoundFinish,
}: UseGameLogicProps) => {
  const navigate = useNavigate()

  const { soundEnabled } = useSettings()

  const [score, setScore] = useState(0)
  const [maxScore, setMaxScore] = useState(initialMaxScore)
  const [gameItems, gameItemsHandlers] = useListState<GameStep<T>>()
  const [isFinished, setIsFinished] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [roundNumber, setRoundNumber] = useState(initialRoundNumber ?? 1)
  const [maxRounds, setMaxRounds] = useState(totalRounds)
  const [isAnswerIncorrect, setIsAnswerIncorrect] = useState(false)

  const [isWaitingForNextRound, setIsWaitingForNextRound] = useState(false)

  const startTimeRef = useRef<number>(0)
  const timeTakenRef = useRef<string | null>(null)

  const startGame = useCallback((calculatedMaxScore?: number) => {
    setScore(0)
    gameItemsHandlers.setState([])
    setIsFinished(false)
    setIsActive(true)
    if (calculatedMaxScore !== undefined) {
      setMaxScore(calculatedMaxScore)
    }
    setRoundNumber(initialRoundNumber ?? 1)
    startTimeRef.current = Date.now()
    timeTakenRef.current = null
    setIsWaitingForNextRound(false)
  }, [])

  const game = useMemo(() => {
    return games.find(({ id }) => id === gameId)!
  }, [gameId])

  const recordAttempt = (item: T, correct: boolean = false, skip = false) => {
    const index = gameItems.findIndex(prevItem => prevItem.subject.id === item.subject.id)

    if (index === -1) {
      gameItemsHandlers.append({ ...item, correct })
    } else {
      gameItemsHandlers.setItem(index, { ...item, correct })
    }

    if (correct) {
      setIsWaitingForNextRound(true)
      playSound('success', soundEnabled)
      setScore(s => s + 1)

      //   track history
      if (item.isReviewable && item.assignment?.id && !onComplete) {
        waniKaniService.createReview(item.assignment.id, 0, 0)
      }

      setTimeout(() => {
        finishRound()
      }, scoreDelay)
    } else if (!skip) {
      //   todo: if not correct, update with the service as well

      setIsAnswerIncorrect(true)

      playSound('error', soundEnabled)
    }
  }

  const finishRound = () => {
    setIsWaitingForNextRound(false)
    setRoundNumber(roundNumber => roundNumber + 1)

    setIsAnswerIncorrect(false)

    onRoundFinish?.()
  }

  const skip = (item: T) => {
    recordAttempt(item, false, true)
    finishRound()
  }

  const endGame = () => {
    if (timeTakenRef.current) return // Already ended

    const endTime = Date.now()
    const duration = moment.duration(endTime - startTimeRef.current)

    const minutes = duration.minutes()
    const seconds = duration.seconds()
    timeTakenRef.current = `${minutes}:${seconds.toString().padStart(2, '0')}`

    setIsFinished(true)
    setIsActive(false)

    encounterService.saveEncounter(
      gameId,
      score,
      maxScore || Math.max(score, gameItems.length),
      duration.asMilliseconds(),
      gameItems,
    )
  }

  const finishGame = useCallback(() => {
    if (onComplete) {
      // If maxScore wasn't set (endless games), use current score or history length
      const finalMaxScore = maxScore || Math.max(score, gameItems.length)

      onComplete({
        gameId,
        score,
        maxScore: finalMaxScore,
        timeTaken: timeTakenRef.current || '0:00',
        history: gameItems,
      })
    } else {
      navigate('/session/games')
    }
  }, [gameId, onComplete, score, maxScore, gameItems])

  const setGameItems = (items: T[]) => {
    setMaxRounds(items.length)
    setMaxScore(items.length)
    gameItemsHandlers.setState(items)
  }

  useEffect(() => {
    if (roundNumber > maxRounds) {
      endGame()
    }
  }, [roundNumber, maxRounds])

  const gameState: GameState<GameStep<T>> = {
    gameId,
    isActive,
    isFinished,
    score,
    maxScore: maxScore || (isFinished ? score : 0), // Fallback for display
    gameItems,
    startTime: startTimeRef.current,
    time: timeTakenRef.current,
    roundNumber,
    maxRoundNumber: maxRounds,
  }

  return {
    game,
    gameState,
    startGame,
    recordAttempt,
    finishGame,
    skip,
    finishRound,
    isAnswerIncorrect,
    setGameItems,
    canSkip,
    endGame,
    setMaxScore,
    isWaitingForNextRound,
  }
}
