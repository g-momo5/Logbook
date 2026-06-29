import { describe, expect, it } from 'vitest'

import { getStatsFromEntries } from './stats'
import type { ProcedureEntry } from '../types'

const baseEntries: ProcedureEntry[] = [
  {
    id: '7b579c72-9d70-4382-a663-4c13a5f31c11',
    userId: null,
    procedureKind: 'coronarografia',
    procedureLabel: 'Coronarografia',
    procedureDate: '2026-03-03',
    operatorRole: 'first_operator',
    notes: '',
    cardSummary: 'Primo operatore',
    details: {
      kind: 'coronarografia',
      accessSite: 'radiale_destro',
      hemostasis: null,
      cannulations: ['coronaria_sinistra', 'ventricolografia'],
      functionalTests: ['ffr'],
    },
    createdAt: '2026-03-03T10:00:00.000Z',
    updatedAt: '2026-03-03T10:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
    syncError: null,
  },
  {
    id: '17bfe2df-9f89-4b7f-a5ef-f8fe1970ed54',
    userId: null,
    procedureKind: 'coronarografia_angioplastica',
    procedureLabel: 'Coronarografia + Angioplastica',
    procedureDate: '2026-03-03',
    operatorRole: 'second_operator',
    notes: '',
    cardSummary: 'Secondo operatore',
    details: {
      kind: 'coronarografia_angioplastica',
      accessSite: 'femorale',
      hemostasis: 'tr_band',
      cannulations: ['coronaria_destra', 'ventricolografia'],
      functionalTests: ['ffr', 'imr'],
      angioplastyTechniques: ['cutting_balloon', 'scoring_balloon'],
      treatments: ['des'],
      imaging: ['ivus'],
      plaqueDebulking: ['shockwave'],
      treatedSegments: [
        { vessel: 'iva', segment: 'prossimale' },
        { vessel: 'iva', segment: 'medio' },
      ],
    },
    createdAt: '2026-03-03T11:00:00.000Z',
    updatedAt: '2026-03-03T11:00:00.000Z',
    deletedAt: null,
    syncStatus: 'pending',
    syncError: null,
  },
  {
    id: '2d8fa4a5-a8be-4f94-a871-63a6c0d45b85',
    userId: null,
    procedureKind: 'cateterismo_destro',
    procedureLabel: 'Cateterismo Destro',
    procedureDate: '2026-03-03',
    operatorRole: 'first_operator',
    notes: '',
    cardSummary: 'Primo operatore',
    details: {
      kind: 'cateterismo_destro',
      accessSite: 'vena_giugulare_interna',
    },
    createdAt: '2026-03-03T12:00:00.000Z',
    updatedAt: '2026-03-03T12:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
    syncError: null,
  },
]

describe('stats helpers', () => {
  it('aggregates clinical metrics', () => {
    const stats = getStatsFromEntries(baseEntries, { range: 'all' })

    expect(stats.totalEntries).toBe(3)
    expect(stats.pendingSync).toBe(1)
    expect(stats.byType).toEqual([
      { label: 'Cateterismo Destro', count: 1 },
      { label: 'Coronarografia', count: 1 },
      { label: 'Coronarografia + Angioplastica', count: 1 },
    ])
    expect(stats.byTypeAndRole).toEqual([
      { label: 'Cateterismo Destro · Primo operatore', count: 1 },
      { label: 'Coronarografia · Primo operatore', count: 1 },
      { label: 'Coronarografia + Angioplastica · Secondo operatore', count: 1 },
    ])
    expect(stats.byAccessSite).toEqual([
      { label: 'Femorale', count: 1 },
      { label: 'Radiale destro', count: 1 },
      { label: 'Vena giugulare interna', count: 1 },
    ])
    expect(stats.byCannulation).toEqual([
      { label: 'Ventricolografia', count: 2 },
      { label: 'Coronaria destra', count: 1 },
      { label: 'Coronaria sinistra', count: 1 },
    ])
    expect(stats.byFunctionalTest).toEqual([
      { label: 'FFR', count: 2 },
      { label: 'IMR', count: 1 },
    ])
    expect(stats.byHemostasis).toEqual([{ label: 'TR Band', count: 1 }])
    expect(stats.byAngioplastyTechnique).toEqual([
      { label: 'Cutting balloon', count: 1 },
      { label: 'Scoring balloon', count: 1 },
    ])
    expect(stats.byTreatment).toEqual([{ label: 'DES', count: 1 }])
    expect(stats.byImaging).toEqual([{ label: 'IVUS', count: 1 }])
    expect(stats.byDebulking).toEqual([{ label: 'ShockWave', count: 1 }])
    expect(stats.byTreatedSegment).toEqual([
      { label: 'IVA · Medio', count: 1 },
      { label: 'IVA · Prossimale', count: 1 },
    ])
    expect(stats.byTreatedVessel).toEqual([{ label: 'IVA', count: 2 }])
  })
})
