import React, { useState, useEffect, useContext, createContext } from 'react'
import { waniKaniService } from '../services/wanikaniService'
import { syncService } from '../services/syncService'
import { users } from '../services/db'
import { User } from '../types'
import { modals } from '@mantine/modals'
import { Text } from '@mantine/core'

interface UserContextType {
  user: User | null
  isGuest: boolean
  loading: boolean
  isSyncing: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  loginAsGuest: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('wk_token')
      if (storedToken) {
        waniKaniService.setToken(storedToken)
        await users.isReady()

        const dbUser = users.findOne({ id: 'current' })
        if (dbUser) {
          setUser(dbUser)
          setLoading(false)
        }

        try {
          if (!dbUser) {
            const userData = await waniKaniService.getUser()
            if (userData && userData.data) {
              const newUser = { ...userData.data, id: 'current' }
              setUser(newUser)
              users.insert(newUser)
            }
          }

          setIsSyncing(true)
          await syncService.sync()
          setIsSyncing(false)

          const updatedUser = users.findOne({ id: 'current' })
          if (updatedUser) setUser(updatedUser)
        } catch (e: any) {
          console.error('Auth/Sync Error', e)
          if (e.message && (e.message.includes('401') || e.message.includes('Invalid'))) {
            localStorage.removeItem('wk_token')
            await syncService.clearData()
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('wk_token', token)
    const newUser = { ...userData, id: 'current' }
    setUser(newUser)
    users.insert(newUser)

    setIsSyncing(true)
    syncService.sync().then(() => setIsSyncing(false))
  }

  const logout = () => {
    if (isGuest) {
      setIsGuest(false)

      return
    }

    modals.openConfirmModal({
      title: 'Logout?',
      children: (
        <Text>This will remove your account and locally saved progress for SukiStudy.</Text>
      ),
      labels: { confirm: 'Logout', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        localStorage.removeItem('wk_token')
        setUser(null)
        syncService.clearData()
      },
    })
  }

  const loginAsGuest = () => {
    setIsGuest(true)
    setUser(null)
  }

  const value = { user, isGuest, loading, isSyncing, login, logout, loginAsGuest }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }

  return context
}
