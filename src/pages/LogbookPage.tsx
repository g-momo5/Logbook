import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getAccessSiteLabel, getOperatorRoleLabel, getProcedureLabel } from '../lib/clinical'
import { formatProcedureDate } from '../lib/format'
import { listProcedureEntries } from '../lib/logbook'
import type { ProcedureEntry, SupportedProcedureKind } from '../types'

function LogbookPage() {
  const [entries, setEntries] = useState<ProcedureEntry[]>([])
  const [search, setSearch] = useState('')
  const [selectedKind, setSelectedKind] = useState<SupportedProcedureKind | ''>('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [onlyPending, setOnlyPending] = useState(false)

  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isActive = true

    void (async () => {
      const items = await listProcedureEntries()

      if (isActive) {
        setEntries(items)
      }
    })()

    return () => {
      isActive = false
    }
  }, [])

  const procedureKinds = Array.from(new Set(entries.map((entry) => entry.procedureKind))).sort((left, right) =>
    getProcedureLabel(left).localeCompare(getProcedureLabel(right), 'it-IT'),
  )

  const operatorRoles = Array.from(new Set(entries.map((entry) => entry.operatorRole))).sort((left, right) =>
    getOperatorRoleLabel(left).localeCompare(getOperatorRoleLabel(right), 'it-IT'),
  )

  const normalizedSearch = deferredSearch.trim().toLowerCase()

  const filteredEntries = entries.filter((entry) => {
    const accessLabel = getAccessSiteLabel(entry.details.accessSite)
    const searchable = [entry.procedureLabel, entry.cardSummary, entry.notes, accessLabel ?? '']
      .join(' ')
      .toLowerCase()

    if (normalizedSearch && !searchable.includes(normalizedSearch)) {
      return false
    }

    if (selectedKind && entry.procedureKind !== selectedKind) {
      return false
    }

    if (selectedRole && entry.operatorRole !== selectedRole) {
      return false
    }

    if (onlyPending && entry.syncStatus === 'synced') {
      return false
    }

    return true
  })

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Ricerca</p>
            <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
              Logbook interventistico
            </h2>
          </div>
          <Link
            to="/new"
            className="inline-flex rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white"
          >
            Nuova
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Cerca
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value
                startTransition(() => setSearch(nextValue))
              }}
              placeholder="Procedura, ruolo, accesso o note"
              className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Tipo procedura
            </span>
            <select
              value={selectedKind}
              onChange={(event) => setSelectedKind(event.target.value as SupportedProcedureKind | '')}
              className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            >
              <option value="">Tutte</option>
              {procedureKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {getProcedureLabel(kind)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Ruolo
            </span>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="w-full rounded-3xl border border-slate-900/5 bg-white px-4 py-4 text-base text-slate-950 outline-none"
            >
              <option value="">Tutti</option>
              {operatorRoles.map((role) => (
                <option key={role} value={role}>
                  {getOperatorRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-3xl bg-slate-900/5 px-4 py-4 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(event) => setOnlyPending(event.target.checked)}
            className="size-4 rounded border-slate-400 text-teal-800"
          />
          Mostra solo record non sincronizzati
        </label>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {filteredEntries.length} record
          </p>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/5 p-4 text-sm leading-6 text-slate-600">
            Nessun record trovato con i filtri attuali.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const accessLabel = getAccessSiteLabel(entry.details.accessSite)

              return (
                <Link
                  key={entry.id}
                  to={`/logbook/${entry.id}`}
                  className="block rounded-[28px] border border-slate-900/5 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{entry.procedureLabel}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{entry.cardSummary}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatProcedureDate(entry.procedureDate)}</p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        entry.syncStatus === 'synced'
                          ? 'bg-teal-700/10 text-teal-900'
                          : entry.syncStatus === 'error'
                            ? 'bg-rose-500/10 text-rose-700'
                            : 'bg-amber-500/15 text-amber-900'
                      }`}
                    >
                      {entry.syncStatus}
                    </div>
                  </div>

                  {accessLabel ? (
                    <div className="mt-3 text-sm font-medium text-teal-900">{accessLabel}</div>
                  ) : null}

                  {entry.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{entry.notes}</p> : null}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default LogbookPage
