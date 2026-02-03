import moment from 'moment'

export const formatTime = (startMs: number, endMs: number) => {
  return formatDuration((endMs - startMs) / 1000)
}

export const formatDuration = (miliseconds: number) => {
  const duration = moment.duration(miliseconds)

  const timeTakenHours = duration.hours()
  const timeTakenMinutes = duration.minutes()
  const timeTakenSeconds = duration.seconds()

  let timeTaken

  if (timeTakenHours > 0) {
    timeTaken = `${timeTakenHours}:${String(timeTakenMinutes).padStart(2, '0')}:${String(timeTakenSeconds).padStart(2, '0')}`
  } else if (timeTakenMinutes > 0) {
    timeTaken = `${timeTakenMinutes}:${String(timeTakenSeconds).padStart(2, '0')}`
  } else {
    timeTaken = `${timeTakenSeconds}s`
  }

  return timeTaken
}
