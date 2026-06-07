import _ from 'lodash'
import { assignments, subjects } from '../../core/db'
import { gameItemsToLearn } from '../../core/db/gameItems'
import type { ContentPreferenceState, Subject } from '../../core/types'
import { getContentPreferences, getLocalNotificationPreferences } from '../../core/preferencesStore'

type NotificationAction = {
  action: string
  title: string
  icon?: string
}

export type ReviewNotificationDecision =
  | {
      kind: 'show'
      title: string
      body: string
      url: string
      itemId?: string
      actions?: NotificationAction[]
    }
  | {
      kind: 'fallback'
      title: string
      body: string
      url: string
      actions?: NotificationAction[]
    }
  | {
      kind: 'skip'
      reason: string
    }

type DecisionContext = {
  triggerType: string
  now: number
}

const showActions = [
  { action: 'more_info', title: 'More Info' },
  { action: 'learn', title: 'Learn' },
]

const subjectToNotificationData = (subject?: Subject) => {
  if (!subject) return undefined

  const label = subject.characters || subject.slug
  const definition =
    subject.meanings.find(meaning => meaning.primary)?.meaning || subject.meanings?.[0]?.meaning

  if (!label || !definition || !subject.object) return undefined
  const type = subject.object

  return {
    subject,
    label,
    definition,
    type,
  }
}

const getDueReviewItem = (now: number, contentPreferences: ContentPreferenceState) => {
  const possibleItems = gameItemsToLearn({ now, ...contentPreferences, includeKana: undefined })

  const { subject, assignment } = _.sample(possibleItems) ?? {}

  const notificationData = subjectToNotificationData(subject)

  return {
    assignment,
    ...notificationData,
  }
}

export async function buildSubjectNotification({
  triggerType,
  now,
}: DecisionContext): Promise<ReviewNotificationDecision> {
  try {
    const notificationPreferences = await getLocalNotificationPreferences()

    if (!notificationPreferences?.schedule.enabled) {
      return { kind: 'skip', reason: 'notifications-disabled' }
    }

    if (triggerType !== 'review_due') {
      return { kind: 'skip', reason: 'unsupported-trigger' }
    }

    const contentPreferences = await getContentPreferences()

    await subjects.isReady()
    await assignments.isReady()

    const reviewItem = getDueReviewItem(now, contentPreferences)

    if (!reviewItem) {
      return { kind: 'skip', reason: 'no-review-due' }
    }

    if (!reviewItem.subject) {
      return { kind: 'skip', reason: 'no-local-data' }
    }

    return {
      kind: 'show',
      title: `Review ${reviewItem.label}`,
      body: `${reviewItem.subject.object}: ${reviewItem.definition}`,
      url: '/',
      itemId: String(reviewItem.subject.id),
      actions: showActions,
    }
  } catch (error) {
    console.warn('Could not build subject based notification', error)

    return {
      kind: 'fallback',
      title: 'Come back to review',
      body: 'Your Japanese practice is waiting.',
      url: '/',
      actions: [
        { action: 'open', title: 'Open app' },
        { action: 'disable_notifications', title: 'Turn off' },
      ],
    }
  }
}
