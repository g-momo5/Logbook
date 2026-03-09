import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import InstallHintCard from '../components/InstallHintCard'
import { getAccessSiteLabel } from '../lib/clinical'
import { formatProcedureDate } from '../lib/format'
import { getRecentEntries } from '../lib/logbook'
import { getStats, getTopLabel } from '../lib/stats'
import type { ProcedureEntry, StatsResult } from '../types'
import { useAppStore } from '../store/app-store'

const emptyStats: StatsResult = {
  totalEntries: 0,
  pendingSync: 0,
  byType: [],
  byTypeAndRole: [],
  byAccessSite: [],
  byCannulation: [],
  byFunctionalTest: [],
  byHemostasis: [],
  byAngioplastyTechnique: [],
  byTreatment: [],
  byImaging: [],
  byDebulking: [],
  byTreatedVessel: [],
  byTreatedSegment: [],
}

function HomePage() {
  const [overviewStats, setOverviewStats] = useState<StatsResult>(emptyStats)
  const [recentEntries, setRecentEntries] = useState<ProcedureEntry[]>([])
  const sessionEmail = useAppStore((state) => state.sessionEmail)
  const pinConfigured = useAppStore((state) => state.pinConfigured)

  useEffect(() => {
    let isActive = true

    void (async () => {
      const [stats, recent] = await Promise.all([getStats({ range: 'all' }), getRecentEntries(3)])

      if (!isActive) {
        return
      }

      setOverviewStats(stats)
      setRecentEntries(recent)
    })()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-white/60 bg-[radial-gradient(circle_at_top_right,_rgba(21,127,115,0.2),_transparent_45%),linear-gradient(135deg,#f8f4ec_0%,#efe4d2_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Panoramica</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Procedure totali
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{overviewStats.totalEntries}</p>
          </div>
          <div className="rounded-3xl bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Top procedura
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{getTopLabel(overviewStats.byType)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/new"
            className="inline-flex items-center rounded-3xl bg-teal-800 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-teal-900/20"
          >
            Nuova procedura
          </Link>
          <Link
            to="/stats"
            className="inline-flex items-center rounded-3xl bg-white/80 px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-800 ring-1 ring-slate-900/5"
          >
            Apri statistiche
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ultime procedure</p>
          <Link to="/logbook" className="text-sm font-semibold text-teal-800">
            Vedi tutto
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/5 p-4 text-sm leading-6 text-slate-600">
            Nessuna procedura ancora registrata. Inizia da “Nuova procedura”.
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => {
              const accessLabel = getAccessSiteLabel(entry.details.accessSite)

              return (
                <div key={entry.id} className="rounded-3xl border border-slate-900/5 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{entry.procedureLabel}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{entry.cardSummary}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatProcedureDate(entry.procedureDate)}</p>
                    </div>
                    {accessLabel ? (
                      <div className="rounded-full bg-teal-700/10 px-3 py-1 text-xs font-semibold text-teal-900">
                        {accessLabel}
                      </div>
                    ) : null}
                  </div>
                  {entry.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{entry.notes}</p> : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Accesso</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {sessionEmail ? `Cloud collegato come ${sessionEmail}.` : 'Cloud non collegato: la sync resta in pausa.'}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 px-4 py-3 text-sm font-medium text-slate-700">
            {pinConfigured ? 'PIN locale attivo' : 'PIN locale da impostare'}
          </div>
        </div>
      </section>

      <InstallHintCard />
    </div>
  )
}

export default HomePage
