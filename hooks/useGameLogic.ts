import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useListState } from '@mantine/hooks'
import { useNavigate } from 'react-router'

import { GameResultData, GameState, GameItem } from '../types'
import { games } from '../utils/games'
import { playSound } from '../utils/sound'
import { useSettings } from '../contexts/SettingsContext'
import { waniKaniService } from '../services/wanikaniService'
import moment from 'moment'

type UseGameLogicProps = {
  gameId: string
  onComplete?: (data: GameResultData) => void
  maxScore?: number // Optional static max score, otherwise calculated dynamically
  totalRounds?: number
  initialRoundNumber?: number
  canSkip?: boolean
  scoreDelay?: number
}

export type GameStep = GameItem & {
  correct?: boolean
}

export type GameLogic = ReturnType<typeof useGameLogic>

export const useGameLogic = ({
  gameId,
  onComplete,
  maxScore: initialMaxScore = 0,
  totalRounds = 7,
  initialRoundNumber,
  canSkip = true,
  scoreDelay = 1500,
}: UseGameLogicProps) => {
  const navigate = useNavigate()

  const { soundEnabled } = useSettings()

  const [score, setScore] = useState(0)
  const [maxScore, setMaxScore] = useState(initialMaxScore)
  const [gameItems, gameItemsHandlers] = useListState<GameStep>()
  const [isFinished, setIsFinished] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [roundNumber, setRoundNumber] = useState(initialRoundNumber ?? 1)
  const [maxRounds, setMaxRounds] = useState(totalRounds)
  const [isAnswerIncorrect, setIsAnswerIncorrect] = useState(false)

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
    startTimeRef.current = Date.now()
    timeTakenRef.current = null
  }, [])

  const game = useMemo(() => {
    return games.find(({ id }) => id === gameId)
  }, [gameId])

  const recordAttempt = (item: GameItem, correct: boolean = false, skip = false) => {
    const index = gameItems.findIndex(prevItem => prevItem.subject.id === item.subject.id)

    if (index === -1) {
      gameItemsHandlers.append({ ...item, correct })
    } else {
      gameItemsHandlers.setItem(index, { ...item, correct })
    }

    if (correct) {
      playSound('success', soundEnabled)
      setScore(s => s + 1)

      //   track history
      if (item.isReviewable && item.assignment?.id) {
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
    setRoundNumber(roundNumber => roundNumber + 1)

    setIsAnswerIncorrect(false)
  }

  const skip = (item: GameItem) => {
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
  }

  const finishGame = useCallback(() => {
    if (onComplete) {
      // If maxScore wasn't set (endless games), use current score or history length
      const finalMaxScore = maxScore || Math.max(score, gameItems.length)

      onComplete({
        gameId,
        score,
        maxScore: finalMaxScore,
        timeTaken: timeTakenRef.current,
        history: gameItems,
      })
    } else {
      navigate('/session/games')
    }
  }, [gameId, onComplete, score, maxScore, gameItems])

  const setGameItems = (items: GameItem[]) => {
    setMaxRounds(items.length)
    gameItemsHandlers.setState(items)
  }

  useEffect(() => {
    if (roundNumber > maxRounds) {
      endGame()
    }
  }, [roundNumber, maxRounds])

  const gameState: GameState = {
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
  }
}
