import {
  getAccessSiteLabel,
  getAngioplastyTechniqueLabel,
  getCannulationLabel,
  getHemostasisLabel,
  getImagingLabel,
  getOperatorRoleLabel,
  getPciVesselLabel,
  getPlaqueDebulkingLabel,
  getProcedureLabel,
  getTreatmentLabel,
  getVesselSegmentLabel,
} from './clinical'
import { isEntryInRange } from './stats'
import type { ProcedureEntry, StatsDrilldown, StatsMetric, StatsRange } from '../types'

export const statsMetrics: StatsMetric[] = [
  'byType',
  'byTypeAndRole',
  'byAccessSite',
  'byCannulation',
  'byHemostasis',
  'byAngioplastyTechnique',
  'byTreatment',
  'byImaging',
  'byDebulking',
  'byTreatedVessel',
  'byTreatedSegment',
]

const statsMetricSet = new Set<StatsMetric>(statsMetrics)
const statsRangeSet = new Set<StatsRange>(['day', 'week', 'month', 'all'])

const statsMetricLabels: Record<StatsMetric, string> = {
  byType: 'Per tipo procedura',
  byTypeAndRole: 'Per procedura + ruolo',
  byAccessSite: 'Per accesso',
  byCannulation: 'Per incannulazione',
  byHemostasis: 'Per emostasi',
  byAngioplastyTechnique: 'Tecniche angioplastica',
  byTreatment: 'Trattamenti',
  byImaging: 'Imaging',
  byDebulking: 'Debulking',
  byTreatedVessel: 'Vasi trattati',
  byTreatedSegment: 'Per vaso + tratto',
}

const statsRangeLabels: Record<StatsRange, string> = {
  day: 'Oggi',
  week: 'Settimana',
  month: 'Mese',
  all: 'Tutto',
}

function isStatsMetric(value: string): value is StatsMetric {
  return statsMetricSet.has(value as StatsMetric)
}

function isStatsRange(value: string): value is StatsRange {
  return statsRangeSet.has(value as StatsRange)
}

export function parseStatsDrilldown(searchParams: URLSearchParams): StatsDrilldown | null {
  const metric = searchParams.get('statsMetric')
  const label = searchParams.get('statsLabel')?.trim() ?? ''
  const range = searchParams.get('statsRange')

  if (!metric || !label || !range) {
    return null
  }

  if (!isStatsMetric(metric) || !isStatsRange(range)) {
    return null
  }

  return {
    metric,
    label,
    range,
  }
}

export function buildStatsDrilldownSearchParams(drilldown: StatsDrilldown) {
  const params = new URLSearchParams()
  params.set('statsMetric', drilldown.metric)
  params.set('statsLabel', drilldown.label)
  params.set('statsRange', drilldown.range)
  return params.toString()
}

export function getStatsMetricLabel(metric: StatsMetric) {
  return statsMetricLabels[metric]
}

export function getStatsRangeLabel(range: StatsRange) {
  return statsRangeLabels[range]
}

export function doesEntryMatchStatsMetric(entry: ProcedureEntry, metric: StatsMetric, label: string) {
  if (metric === 'byType') {
    return getProcedureLabel(entry.procedureKind) === label
  }

  if (metric === 'byTypeAndRole') {
    return `${getProcedureLabel(entry.procedureKind)} · ${getOperatorRoleLabel(entry.operatorRole)}` === label
  }

  if (metric === 'byAccessSite') {
    return getAccessSiteLabel(entry.details.accessSite) === label
  }

  if (metric === 'byCannulation') {
    return entry.details.cannulations.some((item) => getCannulationLabel(item) === label)
  }

  if (metric === 'byHemostasis') {
    return getHemostasisLabel(entry.details.hemostasis) === label
  }

  if (metric === 'byAngioplastyTechnique') {
    return (
      entry.procedureKind === 'coronarografia_angioplastica' &&
      entry.details.angioplastyTechniques.some((item) => getAngioplastyTechniqueLabel(item) === label)
    )
  }

  if (metric === 'byTreatment') {
    return (
      entry.procedureKind === 'coronarografia_angioplastica' &&
      entry.details.treatments.some((item) => getTreatmentLabel(item) === label)
    )
  }

  if (metric === 'byImaging') {
    return (
      entry.procedureKind === 'coronarografia_angioplastica' &&
      entry.details.imaging.some((item) => getImagingLabel(item) === label)
    )
  }

  if (metric === 'byDebulking') {
    return (
      entry.procedureKind === 'coronarografia_angioplastica' &&
      entry.details.plaqueDebulking.some((item) => getPlaqueDebulkingLabel(item) === label)
    )
  }

  if (metric === 'byTreatedVessel') {
    return (
      entry.procedureKind === 'coronarografia_angioplastica' &&
      entry.details.treatedSegments.some((item) => getPciVesselLabel(item.vessel) === label)
    )
  }

  return (
    entry.procedureKind === 'coronarografia_angioplastica' &&
    entry.details.treatedSegments.some(
      (item) => `${getPciVesselLabel(item.vessel)} · ${getVesselSegmentLabel(item.segment)}` === label,
    )
  )
}

export function doesEntryMatchStatsDrilldown(entry: ProcedureEntry, drilldown: StatsDrilldown) {
  return (
    isEntryInRange(entry, { range: drilldown.range }) &&
    doesEntryMatchStatsMetric(entry, drilldown.metric, drilldown.label)
  )
}
