import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { buildStatsDrilldownSearchParams } from '../lib/stats-drilldown'
import { getStats, getTopLabel } from '../lib/stats'
import type { StatsDatum, StatsMetric, StatsRange, StatsResult } from '../types'

const emptyStats: StatsResult = {
  totalEntries: 0,
  pendingSync: 0,
  byType: [],
  byTypeAndRole: [],
  byAccessSite: [],
  byCannulation: [],
  byHemostasis: [],
  byAngioplastyTechnique: [],
  byTreatment: [],
  byImaging: [],
  byDebulking: [],
  byTreatedVessel: [],
  byTreatedSegment: [],
}

const rangeOptions: Array<{ value: StatsRange; label: string }> = [
  { value: 'day', label: 'Oggi' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'all', label: 'Tutto' },
]

function StatList({
  title,
  metric,
  range,
  items,
}: {
  title: string
  metric: StatsMetric
  range: StatsRange
  items: StatsDatum[]
}) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl bg-slate-900/5 p-4 text-sm text-slate-600">Nessun dato.</div>
        ) : (
          items.map((item) => (
            <Link
              key={item.label}
              to={`/logbook?${buildStatsDrilldownSearchParams({
                metric,
                label: item.label,
                range,
              })}`}
              className="block rounded-3xl bg-slate-900/5 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5"
            >
              <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                <span>{item.label}</span>
                <span>{item.count}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}

function StatsPage() {
  const [range, setRange] = useState<StatsRange>('all')
  const [stats, setStats] = useState<StatsResult>(emptyStats)

  useEffect(() => {
    let isActive = true

    void (async () => {
      const nextStats = await getStats({ range })

      if (isActive) {
        setStats(nextStats)
      }
    })()

    return () => {
      isActive = false
    }
  }, [range])

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_20px_60px_rgba(11,93,86,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-800">Statistiche</p>
            <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype',serif] text-3xl text-slate-950">
              Volume clinico
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-3xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] ${
                  range === option.value
                    ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/20'
                    : 'bg-slate-900/5 text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Procedure</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{stats.totalEntries}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">In coda</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{stats.pendingSync}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top procedura</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{getTopLabel(stats.byType)}</p>
          </div>
          <div className="rounded-3xl bg-slate-900/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top accesso</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{getTopLabel(stats.byAccessSite)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <StatList title="Per tipo procedura" metric="byType" range={range} items={stats.byType} />
        <StatList
          title="Per procedura + ruolo"
          metric="byTypeAndRole"
          range={range}
          items={stats.byTypeAndRole}
        />
        <StatList title="Per accesso" metric="byAccessSite" range={range} items={stats.byAccessSite} />
        <StatList
          title="Per incannulazione"
          metric="byCannulation"
          range={range}
          items={stats.byCannulation}
        />
        <StatList title="Per emostasi" metric="byHemostasis" range={range} items={stats.byHemostasis} />
        <StatList
          title="Tecniche angioplastica"
          metric="byAngioplastyTechnique"
          range={range}
          items={stats.byAngioplastyTechnique}
        />
        <StatList title="Trattamenti" metric="byTreatment" range={range} items={stats.byTreatment} />
        <StatList title="Imaging" metric="byImaging" range={range} items={stats.byImaging} />
        <StatList title="Debulking" metric="byDebulking" range={range} items={stats.byDebulking} />
        <StatList
          title="Vasi trattati"
          metric="byTreatedVessel"
          range={range}
          items={stats.byTreatedVessel}
        />
        <StatList
          title="Per vaso + tratto"
          metric="byTreatedSegment"
          range={range}
          items={stats.byTreatedSegment}
        />
      </div>
    </div>
  )
}

export default StatsPage
