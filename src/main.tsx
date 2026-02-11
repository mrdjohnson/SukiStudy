import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MantineProvider, createTheme } from '@mantine/core'
import { generateColors } from '@mantine/colors-generator'

import AppRouter from './AppRouter'

import '@mantine/core/styles.css'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

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
      <MantineProvider theme={theme} defaultColorScheme="light">
        <AppRouter />
      </MantineProvider>
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
