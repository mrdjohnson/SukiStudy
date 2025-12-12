import { useMemo } from 'react'
import { games } from '../utils/games'
import { useUser } from '../contexts/UserContext'

export const useGames = () => {
  const { isGuest } = useUser()

  const availableGames = useMemo(() => {
    return games.filter(game => {
      if (game.enabled === false) return false

      if (isGuest) return game.guestFriendly

      return true
    })
  }, [isGuest])

  return availableGames
}
