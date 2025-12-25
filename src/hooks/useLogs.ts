import { logs } from '../services/db'
import useReactivity from './useReactivity'

export const useLogs = () => {
  const logsItems = useReactivity(() => logs.find({}, { sort: { timestamp: -1 } }).fetch())

  return {
    logs: logsItems,
    clearLogs: () => {
      logs.removeMany({})
    },
  }
}
