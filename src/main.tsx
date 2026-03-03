import { StrictMode } from 'react'
import * as Sentry from '@sentry/react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { appEnv } from './lib/env'
import './index.css'
import App from './App.tsx'

if (appEnv.sentryDsn) {
  Sentry.init({
    dsn: appEnv.sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
