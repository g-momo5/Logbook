import { describe, expect, it, vi } from 'vitest'

import { createPinHash, generateUuid, verifyPinHash } from './crypto'

describe('crypto helpers', () => {
  it('creates and verifies a six-digit PIN', async () => {
    const hash = await createPinHash('123456')

    await expect(verifyPinHash('123456', hash)).resolves.toBe(true)
    await expect(verifyPinHash('654321', hash)).resolves.toBe(false)
  })

  it('rejects invalid pin formats', async () => {
    await expect(createPinHash('1234')).rejects.toThrow('6 cifre')
  })

  it('generates a UUID when randomUUID is unavailable', () => {
    const originalCrypto = globalThis.crypto

    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        for (let index = 0; index < target.length; index += 1) {
          target[index] = index
        }

        return target
      },
    })

    try {
      expect(generateUuid()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })
})
