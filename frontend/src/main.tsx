import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@mother/styles/theme.css'
import './styles/responsive.css'
// Initialize loglevel first
import log from 'loglevel'

// Determine initial log level from environment or localStorage
const STORAGE_KEY = 'memoriae_log_level'

const determineLogLevel = (): number => {
  // Check environment variable first
  const envLevel = import.meta.env.VITE_LOG_LEVEL
  if (envLevel) {
    const levelMap: Record<string, number> = {
      'TRACE': log.levels.TRACE,
      'DEBUG': log.levels.DEBUG,
      'INFO': log.levels.INFO,
      'WARN': log.levels.WARN,
      'ERROR': log.levels.ERROR,
      'SILENT': log.levels.SILENT,
    }
    const mappedLevel = levelMap[envLevel.toUpperCase()]
    if (mappedLevel !== undefined) {
      return mappedLevel
    }
  }

  // Check localStorage
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const levelMap: Record<string, number> = {
        'TRACE': log.levels.TRACE,
        'DEBUG': log.levels.DEBUG,
        'INFO': log.levels.INFO,
        'WARN': log.levels.WARN,
        'ERROR': log.levels.ERROR,
        'SILENT': log.levels.SILENT,
      }
      const mappedLevel = levelMap[stored.toUpperCase()]
      if (mappedLevel !== undefined) {
        return mappedLevel
      }
    }
  }

  // Default: DEBUG in dev, INFO in production
  return import.meta.env.DEV ? log.levels.DEBUG : log.levels.INFO
}

// Initialize loglevel with the determined level
const initialLevel = determineLogLevel()
log.setLevel(initialLevel as log.LogLevelDesc)

// Support localStorage persistence (loglevel's built-in feature)
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored) {
    const levelMap: Record<string, number> = {
      'TRACE': log.levels.TRACE,
      'DEBUG': log.levels.DEBUG,
      'INFO': log.levels.INFO,
      'WARN': log.levels.WARN,
      'ERROR': log.levels.ERROR,
      'SILENT': log.levels.SILENT,
    }
    const mappedLevel = levelMap[stored.toUpperCase()]
    if (mappedLevel !== undefined) {
      log.setLevel(mappedLevel as log.LogLevelDesc, true) // true = persist
    }
  }
}

const logMain = log.getLogger('Main')

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logMain.info('Service Worker registered', { scope: registration.scope })
      })
      .catch((error) => {
        logMain.error('Service Worker registration failed', { error })
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

