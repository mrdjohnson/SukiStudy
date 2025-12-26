import { useState, useEffect } from 'react'
import { GameResultData } from '../types'
import { waniKaniService } from '../services/wanikaniService'
import { Center, Loader } from '@mantine/core'
import _ from 'lodash'
import { GameDefinition, games } from '../utils/games'
import { useGames } from '../hooks/useGames'
import { assignments } from '../services/db'

export const Review = () => {
  const allowedGames = useGames()
  const [roundNumber, setRoundNumber] = useState(1)

  // Lesson specific state
  const [currentGame, setCurrentGame] = useState<GameDefinition>()

  const startLessonGame = () => {
    const learningGameIds = ['quiz', 'typing', 'memory', 'matching']

    // Pick random game
    const randomGame = _.chain(games)
      .filter(game => learningGameIds.includes(game.id))
      .intersection(allowedGames)
      .sample()
      .value()

    setCurrentGame(randomGame)
    setRoundNumber(roundNumber => roundNumber + 1)
  }

  const submitLessonBatch = async (data: GameResultData) => {
    for (const { assignment, correct } of data.history) {
      try {
        if (assignment?.id) {
          const score = correct ? 1 : 0
          await waniKaniService.createReview(assignment.id, score, score)
        }
      } catch (e) {
        console.error('Failed to start assignment', e)
      }
    }

    assignments.batch(() => {
      for (const { assignment, correct } of data.history) {
        if (!assignment?.id) continue

        const nextSrsStage = correct
          ? assignment.srs_stage + 1
          : Math.max(1, assignment.srs_stage - 1)

        assignments.updateOne(
          { id: assignment.id },
          { $set: { ...assignment, srs_stage: nextSrsStage } },
        )
      }
    })

    startLessonGame()
  }

  useEffect(() => {
    startLessonGame()
  }, [])

  const commonProps = {
    onComplete: submitLessonBatch,
  }

  if (!currentGame)
    return (
      <Center>
        <Loader />
      </Center>
    )

  const Component = currentGame.component

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* force the key to let the game know this is new data */}
      {<Component {...commonProps} key={currentGame.id + roundNumber} />}
    </div>
  )
}
