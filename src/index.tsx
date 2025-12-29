import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import App from './App'
import { UserProvider } from './contexts/UserContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { initLogService } from './services/logService'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

import '@mantine/core/styles.css'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

initLogService()

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, sans-serif',
})

const root = ReactDOM.createRoot(rootElement)
root.render(
  <React.StrictMode>
    <UserProvider>
      <MantineProvider theme={theme}>
        <SettingsProvider>
          <ModalsProvider>
            <App />
          </ModalsProvider>
        </SettingsProvider>
      </MantineProvider>
    </UserProvider>
  </React.StrictMode>,
)
