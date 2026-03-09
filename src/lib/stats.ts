import {
  getAccessSiteLabel,
  getAngioplastyTechniqueLabel,
  getCannulationLabel,
  getFunctionalTestLabel,
  getHemostasisLabel,
  getImagingLabel,
  getOperatorRoleLabel,
  getPciVesselLabel,
  getPlaqueDebulkingLabel,
  getProcedureLabel,
  getTreatmentLabel,
  getVesselSegmentLabel,
} from './clinical'
import { db, ensureBootstrapped } from './db'
import { todayDateValue } from './format'
import type { ProcedureEntry, StatsDatum, StatsQuery, StatsResult } from '../types'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date) {
  const safeDate = startOfDay(date)
  const distanceFromMonday = (safeDate.getDay() + 6) % 7
  safeDate.setDate(safeDate.getDate() - distanceFromMonday)
  return safeDate
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toDateValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function resolveRangeBounds(query: StatsQuery) {
  const now = new Date()

  let from = ''
  let to = ''

  if (query.range === 'day') {
    from = todayDateValue()
  } else if (query.range === 'week') {
    from = toDateValue(startOfWeek(now))
  } else if (query.range === 'month') {
    from = toDateValue(startOfMonth(now))
  }

  if (query.from) {
    from = query.from
  }

  if (query.to) {
    to = query.to
  }

  return { from, to }
}

export function isEntryInRange(entry: ProcedureEntry, query: StatsQuery) {
  const { from, to } = resolveRangeBounds(query)

  if (from && entry.procedureDate < from) {
    return false
  }

  if (to && entry.procedureDate > to) {
    return false
  }

  return true
}

function sortStats(items: StatsDatum[]) {
  return items.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }

    return left.label.localeCompare(right.label, 'it-IT')
  })
}

function mapCountByLabel(items: string[]) {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }

  return sortStats(Array.from(counts.entries()).map(([label, count]) => ({ label, count })))
}

export function getStatsFromEntries(entries: ProcedureEntry[], query: StatsQuery): StatsResult {
  const activeEntries = entries
    .filter((entry) => !entry.deletedAt)
    .filter((entry) => isEntryInRange(entry, query))

  const byType = mapCountByLabel(activeEntries.map((entry) => getProcedureLabel(entry.procedureKind)))
  const byTypeAndRole = mapCountByLabel(
    activeEntries.map(
      (entry) => `${getProcedureLabel(entry.procedureKind)} · ${getOperatorRoleLabel(entry.operatorRole)}`,
    ),
  )
  const byAccessSite = mapCountByLabel(
    activeEntries
      .map((entry) => getAccessSiteLabel(entry.details.accessSite))
      .filter((value): value is string => Boolean(value)),
  )
  const byCannulation = mapCountByLabel(
    activeEntries.flatMap((entry) => entry.details.cannulations.map((item) => getCannulationLabel(item))),
  )
  const byFunctionalTest = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      (entry.details.functionalTests ?? []).map((item) => getFunctionalTestLabel(item)),
    ),
  )
  const byHemostasis = mapCountByLabel(
    activeEntries
      .map((entry) => getHemostasisLabel(entry.details.hemostasis))
      .filter((value): value is string => Boolean(value)),
  )
  const byAngioplastyTechnique = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.angioplastyTechniques.map((item) => getAngioplastyTechniqueLabel(item))
        : [],
    ),
  )
  const byTreatment = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.treatments.map((item) => getTreatmentLabel(item))
        : [],
    ),
  )
  const byImaging = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.imaging.map((item) => getImagingLabel(item))
        : [],
    ),
  )
  const byDebulking = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.plaqueDebulking.map((item) => getPlaqueDebulkingLabel(item))
        : [],
    ),
  )
  const byTreatedVessel = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.treatedSegments.map((item) => getPciVesselLabel(item.vessel))
        : [],
    ),
  )
  const byTreatedSegment = mapCountByLabel(
    activeEntries.flatMap((entry) =>
      entry.procedureKind === 'coronarografia_angioplastica'
        ? entry.details.treatedSegments.map(
            (item) => `${getPciVesselLabel(item.vessel)} · ${getVesselSegmentLabel(item.segment)}`,
          )
        : [],
    ),
  )

  return {
    totalEntries: activeEntries.length,
    pendingSync: activeEntries.filter((entry) => entry.syncStatus !== 'synced').length,
    byType,
    byTypeAndRole,
    byAccessSite,
    byCannulation,
    byFunctionalTest,
    byHemostasis,
    byAngioplastyTechnique,
    byTreatment,
    byImaging,
    byDebulking,
    byTreatedVessel,
    byTreatedSegment,
  }
}

export function getTopLabel(items: StatsDatum[]) {
  return items[0]?.label ?? 'Nessuno'
}

export async function getStats(query: StatsQuery) {
  await ensureBootstrapped()
  const entries = await db.entries.toArray()
  return getStatsFromEntries(entries, query)
}
