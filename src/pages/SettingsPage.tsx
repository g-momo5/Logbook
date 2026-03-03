import { useState } from 'react'
import type { FormEvent } from 'react'

import { exportEntries } from '../lib/export'
import { formatRelativeDate } from '../lib/format'
import { hasSupabaseConfig } from '../lib/env'
import { setPin } from '../lib/lock'
import { signInWithPassword, signOut, signUpWithPassword } from '../lib/supabase'
import { formatSyncSuccessMessage, syncPending } from '../lib/sync'
import { refreshAppSnapshot, useAppStore } from '../store/app-store'

function SettingsPage() {
  const sessionEmail = useAppStore((state) => state.sessionEmail)
  const pendingCount = useAppStore((state) => state.pendingCount)
  const errorCount = useAppStore((state) => state.errorCount)
  const lastSyncAt = useAppStore((state) => state.lastSyncAt)
  const pinConfigured = useAppStore((state) => state.pinConfigured)
  const setUnlocked = useAppStore((state) => state.setUnlocked)
  const setSyncState = useAppStore((state) => state.setSyncState)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinError, setPinError] = useState('')
  const [exportMessage, setExportMessage] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function runManualSync() {
    setSyncState('syncing', 'Sincronizzazione manuale...')
    const report = await syncPending()
    await refreshAppSnapshot()

    if (report.skipped) {
      if (report.reason === 'not-configured') {
        setSyncState('paused', 'Configura Supabase per attivare la sync.')
      } else if (report.reason === 'unauthenticated') {
        setSyncState('paused', 'Accedi a Supabase per sincronizzare.')
      } else {
        setSyncState('paused', 'Offline: la sync riprenderà quando torni online.')
      }

      return
    }

    if (report.errors.length > 0) {
      setSyncState('error', report.errors[0])
      return
    }

    setSyncState('idle', formatSyncSuccessMessage(report))
  }

  async function handleAuthSubmit(mode: 'sign-in' | 'sign-up') {
    setIsBusy(true)
    setAuthMessage('')

    try {
      if (mode === 'sign-in') {
        await signInWithPassword(email, password)
        setAuthMessage('Accesso completato.')
      } else {
        await signUpWithPassword(email, password)
        setAuthMessage('Account creato. Se richiesto, conferma l’email.')
      }

      await refreshAppSnapshot()
      await runManualSync()
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Operazione non riuscita.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSignOut() {
    setIsBusy(true)
    setAuthMessage('')

    try {
      await signOut()
      await refreshAppSnapshot()
      setAuthMessage('Sessione cloud disconnessa.')
      setSyncState('paused', 'Accedi a Supabase per sincronizzare.')
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Disconnessione non riuscita.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPinMessage('')
    setPinError('')

    if (newPin !== confirmPin) {
      setPinError('I due PIN non coincidono.')
      return
    }

    try {
      await setPin(newPin, pinConfigured ? currentPin : undefined)
      await refreshAppSnapshot()
      setUnlocked(true)
      setPinMessage(pinConfigured ? 'PIN aggiornato.' : 'PIN impostato.')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Impostazione PIN non riuscita.')
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      const result = await exportEntries(format)
      setExportMessage(`Creato ${result.filename} con ${result.count} record.`)
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export non riuscito.')
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Sincronizzazione</p>
        <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
          Stato del dispositivo
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">In coda</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{pendingCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Errori</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{errorCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ultimo sync</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{formatRelativeDate(lastSyncAt)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void runManualSync()
          }}
          className="mt-5 inline-flex rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white"
        >
          Sincronizza ora
        </button>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Cloud privato</p>
        <div className="mt-4 space-y-4">
          {!hasSupabaseConfig ? (
            <div className="rounded-3xl bg-amber-500/15 p-4 text-sm leading-6 text-amber-950">
              Inserisci `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel file `.env` per attivare
              il backend cloud. Finché mancano, l’app funziona in locale.
            </div>
          ) : (
            <>
              <div className="rounded-3xl bg-slate-900/5 p-4 text-sm leading-6 text-slate-700">
                {sessionEmail ? `Sessione attiva: ${sessionEmail}` : 'Nessuna sessione cloud attiva.'}
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleAuthSubmit('sign-in')
                  }}
                  className="inline-flex rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-50"
                  disabled={isBusy || !email || !password}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleAuthSubmit('sign-up')
                  }}
                  className="inline-flex rounded-3xl bg-slate-900/5 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 disabled:opacity-50"
                  disabled={isBusy || !email || !password}
                >
                  Crea account
                </button>
                {sessionEmail ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSignOut()
                    }}
                    className="inline-flex rounded-3xl bg-rose-700 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-50"
                    disabled={isBusy}
                  >
                    Esci
                  </button>
                ) : null}
              </div>
            </>
          )}

          {authMessage ? <p className="text-sm font-medium text-slate-700">{authMessage}</p> : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Blocco locale</p>
        <form className="mt-4 space-y-4" onSubmit={handlePinSubmit}>
          {pinConfigured ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                PIN attuale
              </span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nuovo PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Conferma PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            />
          </label>

          {pinError ? <p className="text-sm font-medium text-rose-700">{pinError}</p> : null}
          {pinMessage ? <p className="text-sm font-medium text-slate-700">{pinMessage}</p> : null}

          <button
            type="submit"
            className="inline-flex rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white"
          >
            {pinConfigured ? 'Aggiorna PIN' : 'Imposta PIN'}
          </button>
        </form>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Export</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void handleExport('csv')
            }}
            className="inline-flex rounded-3xl bg-slate-900/5 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700"
          >
            Esporta CSV
          </button>
          <button
            type="button"
            onClick={() => {
              void handleExport('json')
            }}
            className="inline-flex rounded-3xl bg-slate-900/5 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-700"
          >
            Esporta JSON
          </button>
        </div>
        {exportMessage ? <p className="mt-4 text-sm font-medium text-slate-700">{exportMessage}</p> : null}
      </section>
    </div>
  )
}

export default SettingsPage
