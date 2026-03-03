import Dexie, { type Table } from 'dexie'

import type { AppLockRecord, MetaRecord, ProcedureEntry, SyncJob } from '../types'

class LogbookDatabase extends Dexie {
  entries!: Table<ProcedureEntry, string>
  syncQueue!: Table<SyncJob, string>
  appLock!: Table<AppLockRecord, 'pin'>
  meta!: Table<MetaRecord, string>

  constructor() {
    super('sala-logbook-interventional-v2')

    this.version(1).stores({
      entries: 'id, procedureKind, procedureDate, updatedAt, deletedAt, syncStatus',
      syncQueue: 'id, entryId, operation, createdAt',
      appLock: 'id',
      meta: 'key',
    })
  }
}

export const db = new LogbookDatabase()

let bootstrapPromise: Promise<void> | null = null

export function ensureBootstrapped() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    if (!(await db.meta.get('lastSyncAt'))) {
      await db.meta.put({ key: 'lastSyncAt', value: '' })
    }

    if (!(await db.meta.get('lastExportAt'))) {
      await db.meta.put({ key: 'lastExportAt', value: '' })
    }
  })()

  return bootstrapPromise
}
