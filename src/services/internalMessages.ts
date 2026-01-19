import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { InternalMessage } from '../types'

import _messages from '../data/internalMessages.json'
import _ from 'lodash'

const CONSTANT_MESSAGES = (_messages as Omit<InternalMessage, 'id'>[]).map(message => {
  return {
    ...message,
    id: _.uniqueId(_.snakeCase(message.title)),
  }
})

type MessageWithId = InternalMessage & { id: string }

const STORAGE_KEY = 'sukistudy_dismissed_messages'

export const useInternalMessages = () => {
  const [messages, setMessages] = useState<MessageWithId[]>([])
  const { user, isGuest } = useUser()

  useEffect(() => {
    const loadMessages = () => {
      try {
        const dismissedJson = localStorage.getItem(STORAGE_KEY)
        const dismissed: string[] = dismissedJson ? JSON.parse(dismissedJson) : []

        const now = new Date()

        // Dynamic Messages
        const dynamicMessages: MessageWithId[] = []

        if (user) {
          const welcomeId = `welcome-level-${user.level}`
          if (!dismissed.includes(welcomeId)) {
            dynamicMessages.push({
              id: welcomeId,
              title: isGuest ? `Welcome, ${user.username}!` : `Level ${user.level} Unlocked!`,
              content: isGuest
                ? 'Your progress is saved locally. Create an account to sync across devices.'
                : `Welcome back, ${user.username}! You are currently on Level ${user.level}. Keep up the momentum!`,
              type: 'main',
              actionLabel: 'View Progress',
              actionLink: '/profile', // Valid route? Or just back to dashboard/lessons
            })
          }
        }

        const active = CONSTANT_MESSAGES.filter(msg => {
          if (dismissed.includes(msg.id)) return false
          if (msg.startDate && new Date(msg.startDate) > now) return false
          if (msg.endDate && new Date(msg.endDate) < now) return false
          if (!msg.guestVisible && isGuest) return false
          return true
        })

        setMessages([...dynamicMessages, ...active])
      } catch (error) {
        console.error('Failed to load internal messages', error)
        // Fallback to showing everything if storage fails? Or nothing?
        // Showing nothing is safer to avoid spamming if something is corrupt.
        setMessages([])
      }
    }

    loadMessages()
  }, [])

  const dismissMessage = (id: string) => {
    try {
      const dismissedJson = localStorage.getItem(STORAGE_KEY)
      const dismissed: string[] = dismissedJson ? JSON.parse(dismissedJson) : []
      if (!dismissed.includes(id)) {
        dismissed.push(id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
      }

      setMessages(prev => prev.filter(m => m.id !== id))

      console.log('Dismissed message', id)
    } catch (error) {
      console.error('Failed to dismiss message', error)
    }
  }

  return { messages, dismissMessage }
}
