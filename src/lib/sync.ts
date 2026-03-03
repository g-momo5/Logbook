import { db, ensureBootstrapped } from './db'
import { hasSupabaseConfig } from './env'
import { getSupabaseClient, getSupabaseSession } from './supabase'
import type {
  ProcedureEntry,
  ProcedureEntryRemotePayload,
  SyncBlockReason,
  SyncDashboard,
  SyncJob,
  SyncReport,
} from '../types'

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

async function markEntryAsSynced(entry: ProcedureEntry | undefined, jobId: string, at: string) {
  if (entry) {
    await db.entries.put({
      ...entry,
      syncStatus: 'synced',
      syncError: null,
    })
  }

  await db.syncQueue.delete(jobId)
  await db.meta.put({ key: 'lastSyncAt', value: at })
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
  await ensureBootstrapped()

  const reason = await getSyncBlockReason()

  if (reason) {
    return {
      processed: 0,
      skipped: true,
      errors: [],
      reason,
    }
  }

  const session = await getSupabaseSession()

  if (!session) {
    return {
      processed: 0,
      skipped: true,
      errors: [],
      reason: 'unauthenticated',
    }
  }

  const jobs = await db.syncQueue.orderBy('createdAt').toArray()
  const errors: string[] = []
  let processed = 0
  let lastSyncedAt = ''

  for (const job of jobs) {
    try {
      await pushPayload(job.payload, session.user.id)

      const currentEntry = await db.entries.get(job.entryId)
      lastSyncedAt = new Date().toISOString()

      await db.transaction('rw', db.entries, db.syncQueue, db.meta, async () => {
        await markEntryAsSynced(currentEntry, job.id, lastSyncedAt)
      })

      processed += 1
    } catch (error) {
      const message = getSyncErrorMessage(error)
      errors.push(message)
      await markEntryAsError(job.entryId, message, job)
    }
  }

  return {
    processed,
    skipped: false,
    errors,
    lastSyncedAt: lastSyncedAt || undefined,
  }
}
