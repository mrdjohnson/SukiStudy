import { logs, LogEntry } from './db'

export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug'

const MAX_LOGS = 3000 // Limit logs to prevent memory issues

const formatMessage = (...args: any[]): string => {
  return args
    .map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    })
    .join(' ')
}

const addLogEntry = (level: LogLevel, ...args: any[]) => {
  const message = formatMessage(...args)

  const newLog: LogEntry = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  // Insert the new log
  logs.updateOne({ id: newLog.id }, { $set: newLog }, { upsert: true })
}

export const logService = {
  log: (...args: any[]) => addLogEntry('log', ...args),
  error: (...args: any[]) => addLogEntry('error', ...args),
  warn: (...args: any[]) => addLogEntry('warn', ...args),
  info: (...args: any[]) => addLogEntry('info', ...args),
  debug: (...args: any[]) => addLogEntry('debug', ...args),
  clear: () => {
    logs.removeMany({})
  },
}

export function initLogService() {
  // Intercept console methods to log to database
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  const originalInfo = console.info
  const originalDebug = console.debug

  console.log = (...args: any[]) => {
    originalLog(...args)
    logService.log(...args)
  }

  console.error = (...args: any[]) => {
    originalError(...args)
    logService.error(...args)
  }

  console.warn = (...args: any[]) => {
    originalWarn(...args)
    logService.warn(...args)
  }

  console.info = (...args: any[]) => {
    originalInfo(...args)
    logService.info(...args)
  }

  console.debug = (...args: any[]) => {
    originalDebug(...args)
    logService.debug(...args)
  }

  // Check if we need to clean up old logs
  const allLogs = logs.find({}, { sort: { timestamp: -1 } }).fetch()
  if (allLogs.length > MAX_LOGS) {
    // Delete the oldest logs
    const logsToDelete = allLogs.slice(MAX_LOGS)
    logs.batch(() => {
      logsToDelete.forEach(log => {
        logs.removeOne({ id: log.id })
      })
    })
  }
}
