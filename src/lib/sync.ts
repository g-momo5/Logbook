import { isSupportedProcedureKind } from './clinical'
import { db, ensureBootstrapped } from './db'
import { hasSupabaseConfig } from './env'
import { getSyncOperationForEntry, replaceSyncJob } from './logbook'
import { getSupabaseClient, getSupabaseSession } from './supabase'
import type {
  CoronarografiaAngioplasticaDetails,
  CoronarografiaDetails,
  ProcedureEntry,
  ProcedureEntryRemotePayload,
  ProcedureEntryRemoteRow,
  SyncBlockReason,
  SyncDashboard,
  SyncJob,
  SyncReport,
} from '../types'

const REMOTE_PAGE_SIZE = 500
const REMOTE_ENTRY_COLUMNS = [
  'id',
  'user_id',
  'procedure_kind',
  'procedure_label',
  'procedure_date',
  'operator_role',
  'card_summary',
  'access_site',
  'details',
  'notes',
  'created_at',
  'updated_at',
  'deleted_at',
].join(', ')

let syncInFlight: Promise<SyncReport> | null = null

function getSyncErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message
  }

  return 'Errore di sincronizzazione'
}

function getOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

function compareIsoTimestamps(left: string, right: string) {
  const leftMs = Date.parse(left)
  const rightMs = Date.parse(right)

  if (Number.isNaN(leftMs) || Number.isNaN(rightMs)) {
    return left.localeCompare(right)
  }

  if (leftMs !== rightMs) {
    return leftMs - rightMs
  }

  return 0
}

function getComparableEntry(entry: ProcedureEntry) {
  const { syncStatus, syncError, ...persistedEntry } = entry
  void syncStatus
  void syncError
  return persistedEntry
}

function areEntriesEquivalent(left: ProcedureEntry, right: ProcedureEntry) {
  return JSON.stringify(getComparableEntry(left)) === JSON.stringify(getComparableEntry(right))
}

function asObject(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>
  }

  return {}
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function normalizePendingEntry(entry: ProcedureEntry): ProcedureEntry {
  if (entry.syncStatus === 'pending' && !entry.syncError) {
    return entry
  }

  return {
    ...entry,
    syncStatus: 'pending',
    syncError: null,
  }
}

async function getSyncBlockReason(): Promise<SyncBlockReason | null> {
  if (!getOnlineStatus()) {
    return 'offline'
  }

  if (!hasSupabaseConfig) {
    return 'not-configured'
  }

  const session = await getSupabaseSession()

  if (!session) {
    return 'unauthenticated'
  }

  return null
}

async function clearJobsForEntry(entryId: string) {
  const jobs = await db.syncQueue.where('entryId').equals(entryId).toArray()

  if (jobs.length > 0) {
    await db.syncQueue.bulkDelete(jobs.map((job) => job.id))
  }
}

async function ensureSyncJob(entry: ProcedureEntry) {
  const expectedOperation = getSyncOperationForEntry(entry)
  const existingJob = await db.syncQueue.where('entryId').equals(entry.id).first()

  if (
    existingJob &&
    existingJob.operation === expectedOperation &&
    existingJob.payload.updated_at === entry.updatedAt &&
    existingJob.payload.deleted_at === entry.deletedAt
  ) {
    return existingJob
  }

  return replaceSyncJob(entry, expectedOperation)
}

async function markEntryAsError(entryId: string, message: string, job: SyncJob) {
  const currentEntry = await db.entries.get(entryId)

  if (currentEntry) {
    await db.entries.put({
      ...currentEntry,
      syncStatus: 'error',
      syncError: message,
    })
  }

  await db.syncQueue.put({
    ...job,
    attempts: job.attempts + 1,
    updatedAt: new Date().toISOString(),
    lastError: message,
  })
}

async function markEntryAsSynced(entry: ProcedureEntry | undefined, jobId: string, userId: string) {
  if (entry) {
    await db.entries.put({
      ...entry,
      userId,
      syncStatus: 'synced',
      syncError: null,
    })
  }

  await db.syncQueue.delete(jobId)
}

async function pushPayload(payload: ProcedureEntryRemotePayload, userId: string) {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error('Supabase non configurato.')
  }

  const result = await client
    .from('procedure_entries')
    .upsert(
      {
        ...payload,
        user_id: userId,
      },
      { onConflict: 'id' },
    )

  if (result.error) {
    throw result.error
  }
}

async function pushPendingJobs(userId: string) {
  const jobs = await db.syncQueue.orderBy('createdAt').toArray()
  const errors: string[] = []
  let uploaded = 0

  for (const job of jobs) {
    try {
      await pushPayload(job.payload, userId)

      const currentEntry = await db.entries.get(job.entryId)

      await db.transaction('rw', db.entries, db.syncQueue, async () => {
        await markEntryAsSynced(currentEntry, job.id, userId)
      })

      uploaded += 1
    } catch (error) {
      const message = getSyncErrorMessage(error)
      errors.push(message)

      await db.transaction('rw', db.entries, db.syncQueue, async () => {
        await markEntryAsError(job.entryId, message, job)
      })
    }
  }

  return {
    uploaded,
    errors,
  }
}

async function fetchRemoteEntriesPage(userId: string, from: number, to: number) {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error('Supabase non configurato.')
  }

  const result = await client
    .from('procedure_entries')
    .select(REMOTE_ENTRY_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)

  if (result.error) {
    throw result.error
  }

  const rawRows = (result.data ?? []) as unknown as Array<
    ProcedureEntryRemoteRow | { procedure_kind?: string }
  >

  return {
    rawCount: rawRows.length,
    rows: rawRows.filter(
      (row): row is ProcedureEntryRemoteRow =>
        typeof row === 'object' &&
        row !== null &&
        'procedure_kind' in row &&
        typeof row.procedure_kind === 'string' &&
        isSupportedProcedureKind(row.procedure_kind),
    ),
  }
}

async function fetchRemoteEntries(userId: string) {
  const rows: ProcedureEntryRemoteRow[] = []
  let offset = 0

  while (true) {
    const page = await fetchRemoteEntriesPage(userId, offset, offset + REMOTE_PAGE_SIZE - 1)
    rows.push(...page.rows)

    if (page.rawCount < REMOTE_PAGE_SIZE) {
      break
    }

    offset += REMOTE_PAGE_SIZE
  }

  return rows
}

function toLocalEntry(row: ProcedureEntryRemoteRow): ProcedureEntry {
  const rawDetails = asObject(row.details)
  const accessSite = ((typeof rawDetails.accessSite === 'string'
    ? rawDetails.accessSite
    : row.access_site) ?? null) as CoronarografiaDetails['accessSite']
  const hemostasis = (
    typeof rawDetails.hemostasis === 'string' ? rawDetails.hemostasis : null
  ) as CoronarografiaDetails['hemostasis']

  if (row.procedure_kind === 'coronarografia') {
    return {
      id: row.id,
      userId: row.user_id,
      procedureKind: 'coronarografia',
      procedureLabel: row.procedure_label,
      procedureDate: row.procedure_date,
      operatorRole: row.operator_role,
      notes: row.notes,
      cardSummary: row.card_summary,
      details: {
        kind: 'coronarografia',
        accessSite,
        hemostasis,
        cannulations: asStringArray(rawDetails.cannulations) as CoronarografiaDetails['cannulations'],
        functionalTests: asStringArray(
          rawDetails.functionalTests,
        ) as CoronarografiaDetails['functionalTests'],
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      syncStatus: 'synced',
      syncError: null,
    }
  }

  const treatedSegments = Array.isArray(rawDetails.treatedSegments)
    ? rawDetails.treatedSegments.flatMap((value) => {
        const item = asObject(value)

        if (typeof item.vessel !== 'string' || typeof item.segment !== 'string') {
          return []
        }

        return [
          {
            vessel: item.vessel,
            segment: item.segment,
          },
        ]
      })
    : []

  return {
    id: row.id,
    userId: row.user_id,
    procedureKind: 'coronarografia_angioplastica',
    procedureLabel: row.procedure_label,
    procedureDate: row.procedure_date,
    operatorRole: row.operator_role,
    notes: row.notes,
    cardSummary: row.card_summary,
      details: {
        kind: 'coronarografia_angioplastica',
        accessSite,
        hemostasis,
        cannulations: asStringArray(rawDetails.cannulations) as CoronarografiaAngioplasticaDetails['cannulations'],
        functionalTests: asStringArray(
          rawDetails.functionalTests,
        ) as CoronarografiaAngioplasticaDetails['functionalTests'],
        angioplastyTechniques: asStringArray(
          rawDetails.angioplastyTechniques,
        ) as CoronarografiaAngioplasticaDetails['angioplastyTechniques'],
        treatments: asStringArray(rawDetails.treatments) as CoronarografiaAngioplasticaDetails['treatments'],
        imaging: asStringArray(rawDetails.imaging) as CoronarografiaAngioplasticaDetails['imaging'],
        plaqueDebulking: asStringArray(
          rawDetails.plaqueDebulking,
        ) as CoronarografiaAngioplasticaDetails['plaqueDebulking'],
        treatedSegments: treatedSegments as CoronarografiaAngioplasticaDetails['treatedSegments'],
      },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: 'synced',
    syncError: null,
  }
}

async function upsertLocalFromRemote(remoteRow: ProcedureEntryRemoteRow) {
  return db.transaction('rw', db.entries, db.syncQueue, async () => {
    const remoteEntry = toLocalEntry(remoteRow)
    const localEntry = await db.entries.get(remoteEntry.id)

    if (!localEntry) {
      await db.entries.put(remoteEntry)

      return {
        merged: 1,
        keptLocal: 0,
      }
    }

    const timestampComparison = compareIsoTimestamps(localEntry.updatedAt, remoteEntry.updatedAt)
    const localIsNewer = timestampComparison > 0

    if (localEntry.syncStatus === 'pending') {
      if (localIsNewer) {
        const nextLocalEntry = normalizePendingEntry(localEntry)

        if (nextLocalEntry !== localEntry) {
          await db.entries.put(nextLocalEntry)
        }

        await ensureSyncJob(nextLocalEntry)

        return {
          merged: 0,
          keptLocal: 1,
        }
      }

      await clearJobsForEntry(localEntry.id)
      await db.entries.put(remoteEntry)

      return {
        merged: 1,
        keptLocal: 0,
      }
    }

    if (localEntry.syncStatus === 'error') {
      if (localIsNewer) {
        const nextLocalEntry = normalizePendingEntry(localEntry)

        await db.entries.put(nextLocalEntry)
        await ensureSyncJob(nextLocalEntry)

        return {
          merged: 0,
          keptLocal: 1,
        }
      }

      await clearJobsForEntry(localEntry.id)
      await db.entries.put(remoteEntry)

      return {
        merged: 1,
        keptLocal: 0,
      }
    }

    if (localIsNewer) {
      const nextLocalEntry = normalizePendingEntry(localEntry)

      await db.entries.put(nextLocalEntry)
      await ensureSyncJob(nextLocalEntry)

      return {
        merged: 0,
        keptLocal: 1,
      }
    }

    if (!areEntriesEquivalent(localEntry, remoteEntry)) {
      await clearJobsForEntry(localEntry.id)
      await db.entries.put(remoteEntry)

      return {
        merged: 1,
        keptLocal: 0,
      }
    }

    await clearJobsForEntry(localEntry.id)

    return {
      merged: 0,
      keptLocal: 0,
    }
  })
}

async function mergeRemoteEntries(remoteEntries: ProcedureEntryRemoteRow[]) {
  let merged = 0
  let keptLocal = 0

  for (const remoteEntry of remoteEntries) {
    const result = await upsertLocalFromRemote(remoteEntry)
    merged += result.merged
    keptLocal += result.keptLocal
  }

  return {
    merged,
    keptLocal,
  }
}

async function runSyncPending(): Promise<SyncReport> {
  await ensureBootstrapped()

  const reason = await getSyncBlockReason()

  if (reason) {
    return {
      uploaded: 0,
      downloaded: 0,
      merged: 0,
      keptLocal: 0,
      processed: 0,
      skipped: true,
      errors: [],
      reason,
    }
  }

  const session = await getSupabaseSession()

  if (!session) {
    return {
      uploaded: 0,
      downloaded: 0,
      merged: 0,
      keptLocal: 0,
      processed: 0,
      skipped: true,
      errors: [],
      reason: 'unauthenticated',
    }
  }

  const pushResult = await pushPendingJobs(session.user.id)
  let downloaded = 0
  let merged = 0
  let keptLocal = 0
  let lastSyncedAt: string | undefined

  try {
    const remoteEntries = await fetchRemoteEntries(session.user.id)
    const mergeResult = await mergeRemoteEntries(remoteEntries)

    downloaded = remoteEntries.length
    merged = mergeResult.merged
    keptLocal = mergeResult.keptLocal
    lastSyncedAt = new Date().toISOString()

    await db.meta.put({
      key: 'lastSyncAt',
      value: lastSyncedAt,
    })
  } catch (error) {
    pushResult.errors.push(getSyncErrorMessage(error))
  }

  return {
    uploaded: pushResult.uploaded,
    downloaded,
    merged,
    keptLocal,
    processed: pushResult.uploaded,
    skipped: false,
    errors: pushResult.errors,
    lastSyncedAt,
  }
}

export function formatSyncSuccessMessage(report: SyncReport) {
  if (report.skipped) {
    return 'Sincronizzazione non eseguita.'
  }

  if (report.uploaded === 0 && report.merged === 0) {
    return 'Cloud aggiornato: nessun cambiamento.'
  }

  const parts: string[] = []

  if (report.uploaded > 0) {
    parts.push(`caricati ${report.uploaded}`)
  }

  if (report.downloaded > 0) {
    parts.push(`scaricati ${report.downloaded}`)
  }

  if (report.merged > 0) {
    parts.push(`aggiornati ${report.merged} in locale`)
  }

  if (report.keptLocal > 0) {
    parts.push(`mantenuti ${report.keptLocal} locali`)
  }

  if (parts.length === 0) {
    return 'Cloud aggiornato: nessun cambiamento.'
  }

  const [firstPart, ...remainingParts] = parts
  const message = `${firstPart.charAt(0).toUpperCase()}${firstPart.slice(1)}`

  if (remainingParts.length === 0) {
    return `${message}.`
  }

  return `${message}, ${remainingParts.join(', ')}.`
}

export async function getSyncDashboard(): Promise<SyncDashboard> {
  await ensureBootstrapped()

  const [pendingCount, lastSyncRecord, errorEntries] = await Promise.all([
    db.syncQueue.count(),
    db.meta.get('lastSyncAt'),
    db.entries.filter((entry) => entry.syncStatus === 'error').count(),
  ])

  return {
    pendingCount,
    errorCount: errorEntries,
    lastSyncAt: lastSyncRecord?.value || null,
  }
}

export async function syncPending(): Promise<SyncReport> {
  if (syncInFlight) {
    return syncInFlight
  }

  syncInFlight = runSyncPending().finally(() => {
    syncInFlight = null
  })

  return syncInFlight
}
