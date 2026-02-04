import moment, { type Moment } from 'moment'

export const formatTime = (startMs: number, endMs: number) => {
  return formatDuration((endMs - startMs) / 1000)
}

const padZero = (num: number) => String(num).padStart(2, '0')

export const formatDuration = (miliseconds: number) => {
  const duration = moment.duration(miliseconds)

  const timeTakenHours = duration.hours()
  const timeTakenMinutes = duration.minutes()
  const timeTakenSeconds = duration.seconds()

  let timeTaken = `${padZero(timeTakenMinutes)}:${padZero(timeTakenSeconds)}`

  if (timeTakenHours > 0) {
    timeTaken = `${timeTakenHours}:${timeTaken}`
  }

  return timeTaken
}

export const formatTimeRange = (start: Moment, granularity: 'month' | 'week' | 'day') => {
  const current = start.clone().startOf(granularity)

  let displayDate

  if (granularity === 'month') {
    displayDate = current.format('MMM YYYY')
  } else if (granularity === 'week') {
    const startOfWeek = current.clone().startOf('week')
    const endOfWeek = current.clone().endOf('week')

    if (startOfWeek.month() === endOfWeek.month()) {
      displayDate = `${startOfWeek.format('MMM D')} - ${endOfWeek.format('D')}`
    } else {
      displayDate = `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}`
    }
  } else {
    displayDate = current.format('ddd')
  }

  return displayDate
}
