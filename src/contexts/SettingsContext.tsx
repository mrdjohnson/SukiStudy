import { useLocalStorage } from '@mantine/hooks'
import React, { createContext, useContext, useState, ReactNode } from 'react'

interface Step {
  title: string
  description: string
  icon: React.ElementType
}

interface SettingsContextType {
  soundEnabled: boolean
  toggleSound: () => void
  romanjiEnabled: boolean
  toggleRomanji: () => void
  helpSteps: Step[] | null
  setHelpSteps: (steps: Step[] | null) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>({
    key: 'suki_sound',
    defaultValue: true,
  })

  const [romanjiEnabled, setRomanjiEnabled] = useLocalStorage<boolean>({
    key: 'suki_romanji',
    defaultValue: true,
  })

  const [helpSteps, setHelpSteps] = useState<Step[] | null>(null)

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
  }

  const toggleRomanji = () => {
    setRomanjiEnabled(!romanjiEnabled)
  }

  return (
    <SettingsContext.Provider
      value={{ soundEnabled, toggleSound, romanjiEnabled, toggleRomanji, helpSteps, setHelpSteps }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
