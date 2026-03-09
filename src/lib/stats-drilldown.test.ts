import { describe, expect, it } from 'vitest'

import { doesEntryMatchStatsDrilldown, doesEntryMatchStatsMetric, parseStatsDrilldown } from './stats-drilldown'
import type { ProcedureEntry, StatsDrilldown, StatsMetric } from '../types'

function toDateValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateValue(date)
}

const coronarografiaEntry: ProcedureEntry = {
  id: '7b579c72-9d70-4382-a663-4c13a5f31c11',
  userId: null,
  procedureKind: 'coronarografia',
  procedureLabel: 'Coronarografia',
  procedureDate: daysAgo(0),
  operatorRole: 'first_operator',
  notes: '',
  cardSummary: 'Primo operatore',
  details: {
    kind: 'coronarografia',
    accessSite: 'radiale_destro',
    hemostasis: null,
    cannulations: ['coronaria_sinistra'],
    functionalTests: ['qfr'],
  },
  createdAt: '2026-03-03T10:00:00.000Z',
  updatedAt: '2026-03-03T10:00:00.000Z',
  deletedAt: null,
  syncStatus: 'synced',
  syncError: null,
}

const angioplasticaEntry: ProcedureEntry = {
  id: '17bfe2df-9f89-4b7f-a5ef-f8fe1970ed54',
  userId: null,
  procedureKind: 'coronarografia_angioplastica',
  procedureLabel: 'Coronarografia + Angioplastica',
  procedureDate: daysAgo(0),
  operatorRole: 'second_operator',
  notes: '',
  cardSummary: 'Secondo operatore',
  details: {
    kind: 'coronarografia_angioplastica',
    accessSite: 'femorale',
    hemostasis: 'tr_band',
    cannulations: ['coronaria_destra'],
    functionalTests: ['ifr'],
    angioplastyTechniques: ['cutting_balloon'],
    treatments: ['des'],
    imaging: ['ivus'],
    plaqueDebulking: ['shockwave'],
    treatedSegments: [{ vessel: 'iva', segment: 'medio' }],
  },
  createdAt: '2026-03-03T11:00:00.000Z',
  updatedAt: '2026-03-03T11:00:00.000Z',
  deletedAt: null,
  syncStatus: 'pending',
  syncError: null,
}

describe('stats drill-down helpers', () => {
  it('parses only valid drill-down query params', () => {
    const validParams = new URLSearchParams({
      statsMetric: 'byType',
      statsLabel: 'Coronarografia',
      statsRange: 'week',
    })

    expect(parseStatsDrilldown(validParams)).toEqual({
      metric: 'byType',
      label: 'Coronarografia',
      range: 'week',
    })

    expect(
      parseStatsDrilldown(
        new URLSearchParams({
          statsMetric: 'byType',
          statsLabel: 'Coronarografia',
          statsRange: 'year',
        }),
      ),
    ).toBeNull()

    expect(
      parseStatsDrilldown(
        new URLSearchParams({
          statsMetric: 'unknown',
          statsLabel: 'Coronarografia',
          statsRange: 'week',
        }),
      ),
    ).toBeNull()

    expect(
      parseStatsDrilldown(
        new URLSearchParams({
          statsMetric: 'byType',
          statsLabel: '',
          statsRange: 'week',
        }),
      ),
    ).toBeNull()
  })

  it('matches the correct entries for all supported stats metrics', () => {
    const cases: Array<{
      metric: StatsMetric
      label: string
      expectedMatch: ProcedureEntry
      expectedNoMatch: ProcedureEntry
    }> = [
      {
        metric: 'byType',
        label: 'Coronarografia',
        expectedMatch: coronarografiaEntry,
        expectedNoMatch: angioplasticaEntry,
      },
      {
        metric: 'byTypeAndRole',
        label: 'Coronarografia + Angioplastica · Secondo operatore',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byAccessSite',
        label: 'Femorale',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byCannulation',
        label: 'Coronaria sinistra',
        expectedMatch: coronarografiaEntry,
        expectedNoMatch: angioplasticaEntry,
      },
      {
        metric: 'byFunctionalTest',
        label: 'iFR',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byHemostasis',
        label: 'TR Band',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byAngioplastyTechnique',
        label: 'Cutting balloon',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byTreatment',
        label: 'DES',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byImaging',
        label: 'IVUS',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byDebulking',
        label: 'ShockWave',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byTreatedVessel',
        label: 'IVA',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
      {
        metric: 'byTreatedSegment',
        label: 'IVA · Medio',
        expectedMatch: angioplasticaEntry,
        expectedNoMatch: coronarografiaEntry,
      },
    ]

    for (const testCase of cases) {
      expect(doesEntryMatchStatsMetric(testCase.expectedMatch, testCase.metric, testCase.label)).toBe(true)
      expect(doesEntryMatchStatsMetric(testCase.expectedNoMatch, testCase.metric, testCase.label)).toBe(false)
    }
  })

  it('applies date range filtering consistently with stats page', () => {
    const oldEntry: ProcedureEntry = {
      ...coronarografiaEntry,
      id: '123f2f46-c8b9-4eb6-b19e-07fdfec58fd9',
      procedureDate: daysAgo(40),
    }

    const dayDrilldown: StatsDrilldown = {
      metric: 'byType',
      label: 'Coronarografia',
      range: 'day',
    }

    const allDrilldown: StatsDrilldown = {
      ...dayDrilldown,
      range: 'all',
    }

    expect(doesEntryMatchStatsDrilldown(coronarografiaEntry, dayDrilldown)).toBe(true)
    expect(doesEntryMatchStatsDrilldown(oldEntry, dayDrilldown)).toBe(false)
    expect(doesEntryMatchStatsDrilldown(oldEntry, allDrilldown)).toBe(true)
  })
})
