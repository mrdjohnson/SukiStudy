import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import App from './App'

import '@mantine/core/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element to mount to')
}

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, sans-serif',
})

const root = ReactDOM.createRoot(rootElement)
root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <App />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>,
)
