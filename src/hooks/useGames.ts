import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'
import { SubjectType, type GameComponent, type GameDefinition } from '../types'
import { gameMetadata } from '../utils/gameMetadata'

const gameComponents: Record<string, GameComponent> = {
  audio: React.lazy(() =>
    import('../pages/games/AudioQuizGame').then(m => ({ default: m.AudioQuizGame })),
  ),
  connect: React.lazy(() =>
    import('../pages/games/ConnectGame').then(m => ({ default: m.ConnectGame })),
  ),
  matching: React.lazy(() =>
    import('../pages/games/MatchingGame').then(m => ({ default: m.MatchingGame })),
  ),
  memory: React.lazy(() =>
    import('../pages/games/MemoryGame').then(m => ({ default: m.MemoryGame })),
  ),
  quiz: React.lazy(() => import('../pages/games/QuizGame').then(m => ({ default: m.QuizGame }))),
  recall: React.lazy(() =>
    import('../pages/games/RecallGame').then(m => ({ default: m.RecallGame })),
  ),
  typing: React.lazy(() =>
    import('../pages/games/TypingGame').then(m => ({ default: m.TypingGame })),
  ),
  variations: React.lazy(() =>
    import('../pages/games/VariationsQuizGame').then(m => ({ default: m.VariationsQuizGame })),
  ),
}

const games: GameDefinition[] = gameMetadata.map(game => ({
  ...game,
  component: gameComponents[game.id],
}))

export const useGames = ({ includeHidden = false } = {}) => {
  const { hiddenGames, hiddenSubjects, disabledSubjects, getGameSettings } = useSettings()

  const availableGames = useMemo(() => {
    return games.filter(game => {
      if (game.enabled === false) return false

      if (includeHidden) return true

      if (hiddenGames.includes(game.id)) return false

      const { hiddenSubjects = [] } = getGameSettings(game.id)

      // if there are no subject types for this game
      const emptySubjects = _.chain(SubjectType)
        .values()
        .without(...hiddenSubjects)
        .without(...disabledSubjects)
        .without(...game.hiddenSubjectTypes)
        .isEmpty()
        .value()

      return !emptySubjects
    })
  }, [hiddenGames, disabledSubjects, hiddenSubjects, getGameSettings])

  return availableGames
}
