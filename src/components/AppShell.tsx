import { Outlet } from 'react-router-dom'

import BottomNav from './BottomNav'
import LockGate from './LockGate'
import StatusPill from './StatusPill'
import { formatRelativeDate } from '../lib/format'
import { useAppStore } from '../store/app-store'

function AppShell() {
  const isOnline = useAppStore((state) => state.isOnline)
  const syncState = useAppStore((state) => state.syncState)
  const syncMessage = useAppStore((state) => state.syncMessage)
  const pendingCount = useAppStore((state) => state.pendingCount)
  const lastSyncAt = useAppStore((state) => state.lastSyncAt)

  const syncTone =
    syncState === 'error' ? 'red' : syncState === 'paused' ? 'amber' : syncState === 'syncing' ? 'teal' : 'slate'

  return (
    <div className="relative min-h-screen pb-32">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-24 pt-5 sm:px-6">
        <header className="rounded-[32px] border border-white/50 bg-white/70 p-5 shadow-[0_24px_80px_rgba(11,93,86,0.1)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">
                Sala Logbook
              </p>
              <h1 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
                Registro procedure offline-first
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={isOnline ? 'teal' : 'amber'}>
                {isOnline ? 'Online' : 'Offline'}
              </StatusPill>
              <StatusPill tone={syncTone}>{pendingCount > 0 ? `${pendingCount} in coda` : 'Coda vuota'}</StatusPill>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>{syncMessage}</p>
            <p>Ultimo sync: {formatRelativeDate(lastSyncAt)}</p>
          </div>
        </header>

        <main className="mt-5 flex-1">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <LockGate />
    </div>
  )
}

export default AppShell
