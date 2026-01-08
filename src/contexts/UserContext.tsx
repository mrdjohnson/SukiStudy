import React, { useState, useEffect, useContext, createContext, useTransition } from 'react'
import { waniKaniService } from '../services/wanikaniService'
import { syncService } from '../services/syncService'
import { users } from '../services/db'
import { User } from '../types'
import { modals } from '@mantine/modals'
import { Text } from '@mantine/core'
import { flush } from '../utils/flush'

interface UserContextType {
  user: User | null
  isGuest: boolean
  loading: boolean
  isSyncing: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  loginAsGuest: () => void
}

const GUEST_USER: User = {
  username: 'Guest',
  level: 1,
  started_at: new Date().toISOString(),
  current_vacation_started_at: null,
  profile_url: '',
  subscription: {
    max_level_granted: 3,
  },
  is_guest: true,
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, startSyncing] = useTransition()

  useEffect(() => {
    const init = async () => {
      await users.isReady()
      const dbUser = users.findOne({ id: 'current' })

      if (dbUser) {
        setUser(dbUser)

        setLoading(false)

        return
      }

      const storedToken = localStorage.getItem('wk_token')
      if (storedToken) {
        waniKaniService.setToken(storedToken)

        try {
          if (!dbUser) {
            const userData = await waniKaniService.getUser()
            if (userData && userData.data) {
              const newUser = { ...userData.data, id: 'current' }
              setUser(newUser)
              users.insert(newUser)
            }
          }

          startSyncing(async () => {
            await syncService.sync()

            const updatedUser = users.findOne({ id: 'current' })
            if (updatedUser) setUser(updatedUser)

            window.location.reload()
          })
        } catch (e: any) {
          console.error('Auth/Sync Error', e)
          if (e.message && (e.message.includes('401') || e.message.includes('Invalid'))) {
            localStorage.removeItem('wk_token')
            await syncService.clearData()
          }
        }
      } else {
        // No token and no db user - truly logged out
        setLoading(false)
      }
    }
    init()
  }, [])

  const login = async (token: string, userData: User) => {
    localStorage.setItem('wk_token', token)
    const newUser = { ...userData, is_guest: false, id: 'current' }
    setUser(newUser)

    users.batch(() => {
      users.removeOne({ id: 'current' })

      users.insert(newUser)
    })

    await flush()

    startSyncing(async () => {
      await syncService.sync()

      window.location.reload()
    })
  }

  const logout = () => {
    if (user?.is_guest) {
      setUser(null)
      users.removeOne({ id: 'current' })
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
        users.removeOne({ id: 'current' })
      },
    })
  }

  const loginAsGuest = async () => {
    if (user) return

    const guestUser = { ...GUEST_USER, id: 'current' }
    setUser(guestUser)
    users.insert(guestUser)

    startSyncing(async () => {
      await syncService.sync()

      window.location.reload()
    })
  }

  const value = {
    user,
    isGuest: user?.is_guest || false,
    loading,
    isSyncing,
    login,
    logout,
    loginAsGuest,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }

  return context
}
