import { lazy, Suspense, useEffect, useEffectEvent } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import { formatSyncSuccessMessage, syncPending } from './lib/sync'
import { refreshAppSnapshot, useAppStore } from './store/app-store'

const EntryEditorPage = lazy(() => import('./pages/EntryEditorPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const LogbookPage = lazy(() => import('./pages/LogbookPage'))
const ProcedurePickerPage = lazy(() => import('./pages/ProcedurePickerPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

function PageLoading() {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/80 p-5 text-sm font-medium text-slate-600 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
      Caricamento schermata...
    </div>
  )
}

function App() {
  const setOnline = useAppStore((state) => state.setOnline)
  const setSyncState = useAppStore((state) => state.setSyncState)

  const runForegroundSync = useEffectEvent(async (source: string) => {
    setSyncState('syncing', `Sincronizzazione ${source.toLowerCase()}...`)

    const report = await syncPending()
    await refreshAppSnapshot()

    if (report.skipped) {
      if (report.reason === 'offline') {
        setSyncState('paused', 'Offline: le modifiche restano sul telefono.')
      } else if (report.reason === 'not-configured') {
        setSyncState('paused', 'Configura Supabase per attivare la sync cloud.')
      } else {
        setSyncState('paused', 'Accedi a Supabase per sincronizzare.')
      }

      return
    }

    if (report.errors.length > 0) {
      setSyncState('error', report.errors[0])
      return
    }

    setSyncState('idle', formatSyncSuccessMessage(report))
  })

  useEffect(() => {
    void (async () => {
      await refreshAppSnapshot()
      await runForegroundSync('avvio')
    })()

    const handleOnline = () => {
      setOnline(true)
      void runForegroundSync('ripresa rete')
    }

    const handleOffline = () => {
      setOnline(false)
      setSyncState('paused', 'Offline: operazioni salvate in locale.')
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshAppSnapshot()

        if (navigator.onLine) {
          void runForegroundSync('riapertura')
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [setOnline, setSyncState])

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="mx-auto max-w-3xl px-4 pt-5 sm:px-6"><PageLoading /></div>}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<ProcedurePickerPage />} />
            <Route
              path="/new/coronarografia"
              element={<EntryEditorPage mode="create" procedureKind="coronarografia" />}
            />
            <Route
              path="/new/coronarografia-angioplastica"
              element={
                <EntryEditorPage mode="create" procedureKind="coronarografia_angioplastica" />
              }
            />
            <Route path="/logbook" element={<LogbookPage />} />
            <Route path="/logbook/:entryId" element={<EntryEditorPage mode="edit" />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
