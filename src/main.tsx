import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MantineProvider, createTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import App from './App'
import { UserProvider } from './contexts/UserContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { initLogService } from './services/logService'
import { registerSW } from 'virtual:pwa-register'
import { generateColors } from '@mantine/colors-generator'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

registerSW({ immediate: true })

import '@mantine/core/styles.css'
import './index.css'
import '@mantine/carousel/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/charts/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

initLogService()

dayjs.extend(customParseFormat)

const theme = createTheme({
  colors: {
    secondary: generateColors('#ff0000'),
    primary: generateColors('#b25f00'),
  },

  primaryColor: 'primary',
  fontFamily: 'Inter, sans-serif',
})

const root = ReactDOM.createRoot(rootElement)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <MantineProvider theme={theme}>
          <SettingsProvider>
            <ModalsProvider>
              <App />
            </ModalsProvider>
          </SettingsProvider>
        </MantineProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// Service Worker registration
if ('serviceWorker' in navigator) {
  // Check if browser supports Service Worker
  window.addEventListener('load', () => {
    // Execute after page is fully loaded
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
        // Registration successful
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError)
        // Registration failed
      })
  })
}
