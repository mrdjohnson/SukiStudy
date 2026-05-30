import { Collection } from '@signaldb/core'

export interface LogEntry {
  id: string
  timestamp?: string // deprecated
  level: LogLevel
  message: string
  time: number
}

export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug'

const MAX_LOGS = 1500 // Limit logs to prevent memory issues

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

export function initLogService(logsDb: Collection<LogEntry>) {
  const addLogEntry = (level: LogLevel, ...args: any[]) => {
    const message = formatMessage(...args)

    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: Date.now(),
      level,
      message,
    }

    // Insert the new log
    logsDb.insert(newLog)
  }

  const logService = {
    log: (...args: any[]) => addLogEntry('log', ...args),
    error: (...args: any[]) => addLogEntry('error', ...args),
    warn: (...args: any[]) => addLogEntry('warn', ...args),
    info: (...args: any[]) => addLogEntry('info', ...args),
    debug: (...args: any[]) => addLogEntry('debug', ...args),
  }

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

  logsDb.isReady().then(() => {
    logsDb.removeMany({ time: undefined })
    // Check if we need to clean up old logs
    const [log] = logsDb.find({}, { skip: MAX_LOGS - 1, sort: { time: 1 }, limit: 1 }).fetch()

    if (log) {
      console.log('reducing logs')

      logsDb.removeMany({ time: { $lte: log.time } })
    }
  })
}
