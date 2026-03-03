import { createPinHash, verifyPinHash } from './crypto'
import { db, ensureBootstrapped } from './db'

export async function getLockRecord() {
  await ensureBootstrapped()
  return db.appLock.get('pin')
}

export async function setPin(newPin: string, currentPin?: string) {
  await ensureBootstrapped()

  const existing = await db.appLock.get('pin')

  if (existing) {
    const canUpdate = currentPin ? await verifyPinHash(currentPin, existing) : false

    if (!canUpdate) {
      throw new Error('PIN attuale non valido.')
    }
  }

  const { pinHash, pinSalt } = await createPinHash(newPin)

  await db.appLock.put({
    id: 'pin',
    pinHash,
    pinSalt,
    lastUnlockedAt: new Date().toISOString(),
  })
}

export async function unlockWithPin(pin: string) {
  await ensureBootstrapped()

  const record = await db.appLock.get('pin')

  if (!record) {
    return true
  }

  const isValid = await verifyPinHash(pin, record)

  if (isValid) {
    await db.appLock.put({
      ...record,
      lastUnlockedAt: new Date().toISOString(),
    })
  }

  return isValid
}
