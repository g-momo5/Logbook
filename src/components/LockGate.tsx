import { useState } from 'react'
import type { FormEvent } from 'react'

import { unlockWithPin } from '../lib/lock'
import { useAppStore } from '../store/app-store'

function LockGate() {
  const pinConfigured = useAppStore((state) => state.pinConfigured)
  const isUnlocked = useAppStore((state) => state.isUnlocked)
  const setUnlocked = useAppStore((state) => state.setUnlocked)

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  if (!pinConfigured || isUnlocked) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsChecking(true)
    setError('')

    const canUnlock = await unlockWithPin(pin)

    if (!canUnlock) {
      setError('PIN non valido.')
      setPin('')
      setIsChecking(false)
      return
    }

    setUnlocked(true)
    setPin('')
    setIsChecking(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[32px] border border-white/40 bg-[#f7f2e8] p-6 shadow-2xl shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">
          App bloccata
        </p>
        <h2 className="mt-3 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
          Sblocca il logbook
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Il PIN locale protegge i dati sul telefono. Il login cloud resta separato.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              PIN a 6 cifre
            </span>
            <input
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              type="password"
              autoFocus
              className="w-full rounded-3xl border border-white bg-white px-4 py-4 text-center text-2xl tracking-[0.4em] text-slate-950 shadow-inner outline-none ring-0"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>

          {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-3xl bg-teal-800 px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-teal-900/20 disabled:opacity-50"
            disabled={pin.length !== 6 || isChecking}
          >
            {isChecking ? 'Verifica...' : 'Sblocca'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockGate
