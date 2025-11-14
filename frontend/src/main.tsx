import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@mother/styles/theme.css'
import './styles/responsive.css'
import { logger } from './utils/logger'

const log = logger.scope('Main')

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        log.info('Service Worker registered', { scope: registration.scope })
      })
      .catch((error) => {
        log.error('Service Worker registration failed', { error })
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

