import { z } from 'zod'

import { buildCardSummary, getEntryAccessSite, getProcedureLabel } from './clinical'
import { db, ensureBootstrapped } from './db'
import type {
  ProcedureEntry,
  ProcedureEntryDraft,
  ProcedureEntryRemotePayload,
  SyncJob,
  SyncOperation,
  SupportedProcedureKind,
} from '../types'

const operatorRoleValues = ['first_operator', 'second_operator'] as const
const accessSiteValues = ['radiale_destro', 'radiale_sinistro', 'femorale'] as const
const cannulationValues = [
  'coronaria_sinistra',
  'coronaria_destra',
  'mammaria_interna_sinistra',
  'mammaria_interna_destra',
  'free_graft_venoso',
] as const
const angioplastyTechniqueValues = [
  'pallone_semicompliante_nc',
  'cutting_balloon',
  'scoring_balloon',
] as const
const treatmentValues = ['des', 'bms', 'dcb'] as const
const imagingValues = ['ivus', 'oct'] as const
const plaqueDebulkingValues = ['rotablator', 'shockwave', 'laser'] as const
const hemostasisValues = ['perclose_prostyle', 'angio_seal', 'vascade', 'manta'] as const
const pciVesselValues = ['tc', 'iva', 'cx', 'cdx', 'd1', 'd2', 'mo1', 'mo2', 'ramo_intermedio'] as const
const vesselSegmentValues = ['prossimale', 'medio', 'distale'] as const

const procedureDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.')
const operatorRoleSchema = z.enum(operatorRoleValues)
const accessSiteSchema = z.enum(accessSiteValues)
const cannulationSchema = z.enum(cannulationValues)
const angioplastyTechniqueSchema = z.enum(angioplastyTechniqueValues)
const treatmentSchema = z.enum(treatmentValues)
const imagingSchema = z.enum(imagingValues)
const plaqueDebulkingSchema = z.enum(plaqueDebulkingValues)
const hemostasisSchema = z.enum(hemostasisValues)
const pciVesselSchema = z.enum(pciVesselValues)
const vesselSegmentSchema = z.enum(vesselSegmentValues)

function uniqueArray<T>(values: T[]) {
  return new Set(values).size === values.length
}

function getUniquePairKey(entry: { vessel: string; segment: string }) {
  return `${entry.vessel}:${entry.segment}`
}

const uniqueCannulationsSchema = z
  .array(cannulationSchema)
  .refine((values) => uniqueArray(values), 'Incannulazioni duplicate.')

const uniqueTechniqueSchema = z
  .array(angioplastyTechniqueSchema)
  .refine((values) => uniqueArray(values), 'Tecniche duplicate.')

const uniqueTreatmentSchema = z
  .array(treatmentSchema)
  .refine((values) => uniqueArray(values), 'Trattamenti duplicati.')

const uniqueImagingSchema = z.array(imagingSchema).refine((values) => uniqueArray(values), 'Imaging duplicato.')

const uniqueDebulkingSchema = z
  .array(plaqueDebulkingSchema)
  .refine((values) => uniqueArray(values), 'Debulking duplicato.')

const treatedSegmentSchema = z.object({
  vessel: pciVesselSchema,
  segment: vesselSegmentSchema,
})

const treatedSegmentsSchema = z
  .array(treatedSegmentSchema)
  .refine(
    (values) => uniqueArray(values.map((value) => getUniquePairKey(value))),
    'La stessa coppia vaso/tratto non può essere salvata due volte.',
  )

const commonDraftShape = {
  id: z.string().uuid().optional(),
  procedureDate: procedureDateSchema,
  operatorRole: operatorRoleSchema,
  notes: z.string().trim().max(1_200).optional().default(''),
}

const coronarografiaDraftSchema = z.object({
  ...commonDraftShape,
  procedureKind: z.literal('coronarografia'),
  details: z.object({
    accessSite: accessSiteSchema.nullable(),
    hemostasis: hemostasisSchema.nullable(),
    cannulations: uniqueCannulationsSchema,
  }).superRefine((value, ctx) => {
    if (value.accessSite !== 'femorale' && value.hemostasis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hemostasis'],
        message: 'L’emostasi è disponibile solo con accesso femorale.',
      })
    }
  }),
})

const coronarografiaAngioplasticaDraftSchema = z.object({
  ...commonDraftShape,
  procedureKind: z.literal('coronarografia_angioplastica'),
  details: z.object({
    accessSite: accessSiteSchema.nullable(),
    hemostasis: hemostasisSchema.nullable(),
    cannulations: uniqueCannulationsSchema,
    angioplastyTechniques: uniqueTechniqueSchema,
    treatments: uniqueTreatmentSchema,
    imaging: uniqueImagingSchema,
    plaqueDebulking: uniqueDebulkingSchema,
    treatedSegments: treatedSegmentsSchema,
  }).superRefine((value, ctx) => {
    if (value.accessSite !== 'femorale' && value.hemostasis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hemostasis'],
        message: 'L’emostasi è disponibile solo con accesso femorale.',
      })
    }
  }),
})

const entryDraftSchema = z.discriminatedUnion('procedureKind', [
  coronarografiaDraftSchema,
  coronarografiaAngioplasticaDraftSchema,
])

export function toRemotePayload(entry: ProcedureEntry): ProcedureEntryRemotePayload {
  if (entry.procedureKind === 'coronarografia') {
    return {
      id: entry.id,
      user_id: entry.userId,
      procedure_kind: 'coronarografia',
      procedure_label: entry.procedureLabel,
      procedure_date: entry.procedureDate,
      operator_role: entry.operatorRole,
      card_summary: entry.cardSummary,
      access_site: getEntryAccessSite(entry),
      details: entry.details,
      notes: entry.notes,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      deleted_at: entry.deletedAt,
    }
  }

  return {
    id: entry.id,
    user_id: entry.userId,
    procedure_kind: 'coronarografia_angioplastica',
    procedure_label: entry.procedureLabel,
    procedure_date: entry.procedureDate,
    operator_role: entry.operatorRole,
    card_summary: entry.cardSummary,
    access_site: getEntryAccessSite(entry),
    details: entry.details,
    notes: entry.notes,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    deleted_at: entry.deletedAt,
  }
}

export function getSyncOperationForEntry(entry: ProcedureEntry): SyncOperation {
  return entry.deletedAt ? 'delete' : 'upsert'
}

export function buildSyncJobForEntry(
  entry: ProcedureEntry,
  operation = getSyncOperationForEntry(entry),
  options?: Partial<Pick<SyncJob, 'createdAt' | 'updatedAt' | 'attempts' | 'lastError'>>,
): SyncJob {
  const now = options?.updatedAt ?? new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    entryId: entry.id,
    operation,
    payload: toRemotePayload(entry),
    createdAt: options?.createdAt ?? now,
    updatedAt: now,
    attempts: options?.attempts ?? 0,
    lastError: options?.lastError ?? null,
  }
}

export async function replaceSyncJob(
  entry: ProcedureEntry,
  operation = getSyncOperationForEntry(entry),
  options?: Partial<Pick<SyncJob, 'createdAt' | 'updatedAt' | 'attempts' | 'lastError'>>,
) {
  const previousJobs = await db.syncQueue.where('entryId').equals(entry.id).toArray()

  if (previousJobs.length > 0) {
    await db.syncQueue.bulkDelete(previousJobs.map((job) => job.id))
  }

  const job = buildSyncJobForEntry(entry, operation, options)

  await db.syncQueue.put(job)
  return job
}

function sortEntries(left: ProcedureEntry, right: ProcedureEntry) {
  const dateCompare = right.procedureDate.localeCompare(left.procedureDate)

  if (dateCompare !== 0) {
    return dateCompare
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

export function getCreateRouteForProcedure(kind: SupportedProcedureKind) {
  if (kind === 'coronarografia') {
    return '/new/coronarografia'
  }

  return '/new/coronarografia-angioplastica'
}

export async function listProcedureEntries() {
  await ensureBootstrapped()

  return (await db.entries.toArray())
    .filter((entry) => !entry.deletedAt)
    .sort(sortEntries)
}

export async function getRecentEntries(limit = 4) {
  const entries = await listProcedureEntries()
  return entries.slice(0, limit)
}

export async function getProcedureEntry(entryId: string) {
  await ensureBootstrapped()
  const entry = await db.entries.get(entryId)
  return entry && !entry.deletedAt ? entry : null
}

export async function saveEntry(input: ProcedureEntryDraft) {
  await ensureBootstrapped()

  const parsedInput = entryDraftSchema.parse(input)
  const existingEntry = parsedInput.id ? await db.entries.get(parsedInput.id) : undefined
  const now = new Date().toISOString()

  const baseEntry = {
    id: existingEntry?.id ?? crypto.randomUUID(),
    userId: existingEntry?.userId ?? null,
    procedureLabel: getProcedureLabel(parsedInput.procedureKind),
    procedureDate: parsedInput.procedureDate,
    operatorRole: parsedInput.operatorRole,
    notes: parsedInput.notes ?? '',
    cardSummary: buildCardSummary(parsedInput.operatorRole),
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending' as const,
    syncError: null,
  }

  const nextEntry: ProcedureEntry =
    parsedInput.procedureKind === 'coronarografia'
      ? {
          ...baseEntry,
          procedureKind: 'coronarografia',
          details: {
            kind: 'coronarografia',
            accessSite: parsedInput.details.accessSite,
            hemostasis:
              parsedInput.details.accessSite === 'femorale' ? parsedInput.details.hemostasis : null,
            cannulations: parsedInput.details.cannulations,
          },
        }
      : {
          ...baseEntry,
          procedureKind: 'coronarografia_angioplastica',
          details: {
            kind: 'coronarografia_angioplastica',
            accessSite: parsedInput.details.accessSite,
            hemostasis:
              parsedInput.details.accessSite === 'femorale' ? parsedInput.details.hemostasis : null,
            cannulations: parsedInput.details.cannulations,
            angioplastyTechniques: parsedInput.details.angioplastyTechniques,
            treatments: parsedInput.details.treatments,
            imaging: parsedInput.details.imaging,
            plaqueDebulking: parsedInput.details.plaqueDebulking,
            treatedSegments: parsedInput.details.treatedSegments,
          },
        }

  await db.transaction('rw', db.entries, db.syncQueue, async () => {
    await db.entries.put(nextEntry)
    await replaceSyncJob(nextEntry, 'upsert')
  })

  return nextEntry
}

export async function deleteEntry(entryId: string) {
  await ensureBootstrapped()

  const currentEntry = await db.entries.get(entryId)

  if (!currentEntry || currentEntry.deletedAt) {
    return false
  }

  const deletedEntry: ProcedureEntry = {
    ...currentEntry,
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
    syncStatus: 'pending',
    syncError: null,
  }

  await db.transaction('rw', db.entries, db.syncQueue, async () => {
    await db.entries.put(deletedEntry)
    await replaceSyncJob(deletedEntry, 'delete')
  })

  return true
}
