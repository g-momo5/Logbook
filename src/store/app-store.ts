import { create } from 'zustand'

import { getLockRecord } from '../lib/lock'
import { getSessionEmail, getSupabaseSession } from '../lib/supabase'
import { getSyncDashboard } from '../lib/sync'

type RuntimeSyncState = 'idle' | 'syncing' | 'paused' | 'error'

interface AppState {
  isOnline: boolean
  pinConfigured: boolean
  isUnlocked: boolean
  syncState: RuntimeSyncState
  syncMessage: string
  pendingCount: number
  errorCount: number
  lastSyncAt: string | null
  sessionEmail: string | null
  setOnline: (isOnline: boolean) => void
  setUnlocked: (isUnlocked: boolean) => void
  setSyncState: (syncState: RuntimeSyncState, syncMessage: string) => void
  setSessionEmail: (sessionEmail: string | null) => void
  setSnapshot: (snapshot: {
    pinConfigured: boolean
    isUnlocked?: boolean
    pendingCount: number
    errorCount: number
    lastSyncAt: string | null
    sessionEmail: string | null
  }) => void
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  pinConfigured: false,
  isUnlocked: true,
  syncState: 'idle',
  syncMessage: 'Pronto',
  pendingCount: 0,
  errorCount: 0,
  lastSyncAt: null,
  sessionEmail: null,
  setOnline: (isOnline) => set({ isOnline }),
  setUnlocked: (isUnlocked) => set({ isUnlocked }),
  setSyncState: (syncState, syncMessage) => set({ syncState, syncMessage }),
  setSessionEmail: (sessionEmail) => set({ sessionEmail }),
  setSnapshot: (snapshot) =>
    set((state) => ({
      pinConfigured: snapshot.pinConfigured,
      isUnlocked:
        snapshot.pinConfigured && snapshot.isUnlocked === undefined
          ? state.isUnlocked
          : snapshot.isUnlocked ?? state.isUnlocked,
      pendingCount: snapshot.pendingCount,
      errorCount: snapshot.errorCount,
      lastSyncAt: snapshot.lastSyncAt,
      sessionEmail: snapshot.sessionEmail,
    })),
}))

export async function refreshAppSnapshot() {
  const [lockRecord, syncDashboard, session] = await Promise.all([
    getLockRecord(),
    getSyncDashboard(),
    getSupabaseSession(),
  ])

  useAppStore.getState().setSnapshot({
    pinConfigured: Boolean(lockRecord),
    isUnlocked: lockRecord ? useAppStore.getState().isUnlocked : true,
    pendingCount: syncDashboard.pendingCount,
    errorCount: syncDashboard.errorCount,
    lastSyncAt: syncDashboard.lastSyncAt,
    sessionEmail: getSessionEmail(session),
  })
}
