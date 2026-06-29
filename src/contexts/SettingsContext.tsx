import { useLocalStorage } from '@mantine/hooks'
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { type NotificationSchedule, SubjectType } from '../core/types'
import type { ThemeBackground } from '../core/types'
import _ from 'lodash'
import { useUser } from './UserContext'
import { waniKaniService } from '../services/wanikaniService'
import { JAPANESE_FONTS } from '../utils/fonts'
import useReactivity from '../hooks/useReactivity'
import { preferences } from '../core/db'
import {
  defaultContentPreferences,
  updateContentPreference,
  updateContentPreferenceKey,
} from '../core/preferencesStore'
import { getDefaultBackground } from '../utils/defaultWallpaper'

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
  const { user, isGuest } = useUser()

  const [isUpdatePromptDismissed, setIsUpdatePromptDismissed] = useLocalStorage({
    key: 'is_update_prompt_dismissed',
    defaultValue: false,
  })
  const [autoUpdatesEnabled, setAutoUpdatesEnabled] = useLocalStorage({
    key: 'auto_updates_enabled',
    defaultValue: false,
  })
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

  const [gameSyncEnabled, setGameSyncEnabled] = useLocalStorage({
    key: 'suki_game_sync_enabled',
    defaultValue: true,
  })

  const [notificationSchedule, setNotificationSchedule] = useLocalStorage<NotificationSchedule>({
    key: 'suki_notification_schedule',
    defaultValue: {
      enabled: false,
      cadence: 'daily',
      daysOfWeek: [new Date().getDay()],
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  })

  // Font Settings
  const [enabledFonts, setEnabledFonts] = useLocalStorage<string[]>({
    key: 'suki_enabled_fonts',
    defaultValue: ['Default'],
  })

  // Game Overrides
  const [gameOverrides, setGameOverrides] = useLocalStorage<Record<string, Partial<GameSettings>>>({
    key: 'suki_game_overrides',
    defaultValue: {},
  })
  const [themeBackground, setThemeBackground] = useLocalStorage<ThemeBackground | null>({
    key: 'suki_theme_background',
    defaultValue: undefined,
  })

  const [helpSteps, setHelpSteps] = useState<Step[] | null>(null)

  const currentPreferences = useReactivity(() => {
    return preferences.findOne({ id: 'current' })
  }, [])

  const contentPreferences = useMemo(() => {
    return {
      ...defaultContentPreferences,
      ...currentPreferences?.content,
    }
  }, [currentPreferences])

  const hiddenSubjects = contentPreferences.hiddenSubjects
  const gameLevelMin = contentPreferences.gameLevelMin
  const gameLevelMax = contentPreferences.gameLevelMax
  const dashboardSubjectSource = contentPreferences.dashboardSubjectSource
  const dashboardCollectionIds = contentPreferences.dashboardCollectionIds
  const studyCollectionIds = contentPreferences.studyCollectionIds
  const notificationCollectionIds = contentPreferences.notificationCollectionIds

  const disabledSubjects = useMemo(() => {
    if (!isGuest) return []

    return [SubjectType.RADICAL, SubjectType.KANJI, SubjectType.VOCABULARY]
  }, [isGuest, hiddenSubjects])

  const availableSubjects = useMemo(() => {
    return _.chain(SubjectType)
      .values()
      .without(...hiddenSubjects, ...disabledSubjects)
      .value()
  }, [hiddenSubjects, disabledSubjects])

  const availableFonts = useMemo(() => {
    return JAPANESE_FONTS.filter(f => enabledFonts.includes(f.name))
  }, [enabledFonts])

  const toggleSound = () => setSoundEnabled(prev => !prev)
  const toggleRomanji = () => setRomanjiEnabled(prev => !prev)

  const toggleHiddenGame = (gameId: string) => {
    setHiddenGames(prev => _.xor(prev, [gameId]))
  }

  const toggleHiddenSubject = (subjectType: SubjectType) => {
    updateContentPreference({ hiddenSubjects: _.xor(hiddenSubjects, [subjectType]) })
  }

  const toggleAutoPlayAudio = () => setAutoPlayAudio(prev => !prev)
  const toggleAutoConvertTyping = () => setAutoConvertTyping(prev => !prev)
  const toggleGameSyncEnabled = () => setGameSyncEnabled(prev => !prev)
  const toggleAutoUpdatesEnabled = () => {
    setAutoUpdatesEnabled(!autoUpdatesEnabled)
    setIsUpdatePromptDismissed(true)
  }

  const toggleEnabledFont = (fontName: string) => {
    setEnabledFonts(prev => _.xor(prev, [fontName]))
  }

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
      updateContentPreference({ gameLevelMax: user.subscription.max_level_granted })
    }
  }, [user?.subscription.max_level_granted, gameLevelMax])

  useEffect(() => {
    if (isGuest) {
      waniKaniService.setSyncEnabled(false)
    } else {
      waniKaniService.setSyncEnabled(gameSyncEnabled)
    }
  }, [gameSyncEnabled, isGuest])

  useEffect(() => {
    if (themeBackground === undefined) {
      setThemeBackground(getDefaultBackground())
    }
  }, [themeBackground])

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
    setGameLevelMin: updateContentPreferenceKey('gameLevelMin'),
    gameLevelMax,
    setGameLevelMax: updateContentPreferenceKey('gameLevelMax'),
    dashboardSubjectSource,
    setDashboardSubjectSource: updateContentPreferenceKey('dashboardSubjectSource'),
    dashboardCollectionIds,
    setDashboardCollectionIds: updateContentPreferenceKey('dashboardCollectionIds'),
    studyCollectionIds,
    setStudyCollectionIds: updateContentPreferenceKey('studyCollectionIds'),
    notificationCollectionIds,
    setNotificationCollectionIds: updateContentPreferenceKey('notificationCollectionIds'),

    gameSyncEnabled,
    toggleGameSyncEnabled,
    autoUpdatesEnabled,
    toggleAutoUpdatesEnabled,
    isUpdatePromptDismissed,
    setIsUpdatePromptDismissed,

    notificationSchedule,
    setNotificationSchedule,

    enabledFonts,
    toggleEnabledFont,
    availableFonts,
    themeBackground,
    setThemeBackground,
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
