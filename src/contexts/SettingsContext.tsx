import { useLocalStorage } from '@mantine/hooks'
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import { SubjectType } from '../types'
import _ from 'lodash'
import { useUser } from './UserContext'

interface Step {
  title: string
  description: string
  icon: React.ElementType
}

export interface GameSettings {
  overrideDefaults: boolean
  hiddenSubjects: SubjectType[]
}

const useSettingsContext = () => {
  const { user } = useUser()

  const [soundEnabled, setSoundEnabled] = useLocalStorage({ key: 'suki_sound', defaultValue: true })
  const [romanjiEnabled, setRomanjiEnabled] = useLocalStorage({
    key: 'suki_romanji',
    defaultValue: true,
  })
  const [hiddenGames, setHiddenGames] = useLocalStorage<string[]>({
    key: 'suki_hidden_games',
    defaultValue: [],
  })
  const [autoPlayAudio, setAutoPlayAudio] = useLocalStorage({
    key: 'suki_autoplay_audio',
    defaultValue: true,
  })
  const [autoConvertTyping, setAutoConvertTyping] = useLocalStorage({
    key: 'suki_autoconvert_typing',
    defaultValue: true,
  })

  const [gameLevelMin, setGameLevelMin] = useLocalStorage({
    key: 'suki_level_min',
    defaultValue: 1,
  })
  const [gameLevelMax, setGameLevelMax] = useLocalStorage({
    key: 'suki_level_max',
    defaultValue: 60,
  })

  // Content Settings
  const [hiddenSubjects, setHiddenSubjects] = useLocalStorage<SubjectType[]>({
    key: 'suki_hidden_subjects',
    defaultValue: [],
  })

  // Game Overrides
  const [gameOverrides, setGameOverrides] = useLocalStorage<Record<string, Partial<GameSettings>>>({
    key: 'suki_game_overrides',
    defaultValue: {},
  })

  const [helpSteps, setHelpSteps] = useState<Step[] | null>(null)

  const disabledSubjects = useMemo(() => {
    if (user) return []

    return [SubjectType.RADICAL, SubjectType.KATAKANA, SubjectType.VOCABULARY]
  }, [user, hiddenSubjects])

  const availableSubjects = useMemo(() => {
    return _.chain(SubjectType)
      .values()
      .without(...hiddenSubjects, ...disabledSubjects)
      .value()
  }, [hiddenSubjects, disabledSubjects])

  const toggleSound = () => setSoundEnabled(prev => !prev)
  const toggleRomanji = () => setRomanjiEnabled(prev => !prev)

  const toggleHiddenGame = (gameId: string) => {
    setHiddenGames(prev => _.xor(prev, [gameId]))
  }

  const toggleHiddenSubject = (subjectType: SubjectType) => {
    setHiddenSubjects(prev => _.xor(prev, [subjectType]))
  }

  const toggleAutoPlayAudio = () => setAutoPlayAudio(prev => !prev)
  const toggleAutoConvertTyping = () => setAutoConvertTyping(prev => !prev)

  const getGameSettings = useCallback(
    (gameId: string): Partial<GameSettings> => {
      const defaults: GameSettings = {
        overrideDefaults: false,
        hiddenSubjects,
      }

      if (!gameOverrides[gameId]?.overrideDefaults) return defaults

      return gameOverrides[gameId]
    },
    [gameOverrides, hiddenSubjects],
  )

  const updateGameSettings = (gameId: string, settings?: Partial<GameSettings>) => {
    setGameOverrides(prev => {
      if (!settings) {
        return _.omit(prev, gameId)
      }

      return {
        ...prev,
        [gameId]: { ...(prev[gameId] || {}), ...settings },
      }
    })
  }

  const toggleGameSettingsOverride = (gameId: string) => {
    const overrideDefaults = getGameSettings(gameId)?.overrideDefaults

    if (overrideDefaults) {
      updateGameSettings(gameId, { overrideDefaults: false })
    } else {
      updateGameSettings(gameId, {
        overrideDefaults: true,
        hiddenSubjects: [],
      })
    }
  }

  useEffect(() => {
    if (
      user?.subscription.max_level_granted &&
      gameLevelMax > user.subscription.max_level_granted
    ) {
      setGameLevelMax(user.subscription.max_level_granted)
    }
  }, [user?.subscription.max_level_granted, gameLevelMax])

  return {
    soundEnabled,
    toggleSound,
    romanjiEnabled,
    toggleRomanji,
    helpSteps,
    setHelpSteps,
    hiddenGames,
    toggleHiddenGame,
    autoPlayAudio,
    toggleAutoPlayAudio,
    autoConvertTyping,
    toggleAutoConvertTyping,

    hiddenSubjects,
    disabledSubjects,
    availableSubjects,
    toggleHiddenSubject,

    getGameSettings,
    updateGameSettings,
    toggleGameSettingsOverride,

    gameLevelMin,
    setGameLevelMin,
    gameLevelMax,
    setGameLevelMax,
  }
}

type SettingsContextType = ReturnType<typeof useSettingsContext>

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const settingsContextData = useSettingsContext()

  return <SettingsContext.Provider value={settingsContextData}>{children}</SettingsContext.Provider>
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
