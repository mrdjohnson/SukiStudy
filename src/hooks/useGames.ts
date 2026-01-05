import { useMemo } from 'react'
import { games } from '../utils/games'
import { useSettings } from '../contexts/SettingsContext'
import _ from 'lodash'
import { SubjectType } from '../types'

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
        .isEmpty()
        .value()

      return !emptySubjects
    })
  }, [hiddenGames, disabledSubjects, hiddenSubjects, getGameSettings])

  return availableGames
}
