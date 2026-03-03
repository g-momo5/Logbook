import { describe, expect, it } from 'vitest'

import { createPinHash, verifyPinHash } from './crypto'

describe('crypto helpers', () => {
  it('creates and verifies a six-digit PIN', async () => {
    const hash = await createPinHash('123456')

    await expect(verifyPinHash('123456', hash)).resolves.toBe(true)
    await expect(verifyPinHash('654321', hash)).resolves.toBe(false)
  })

  it('rejects invalid pin formats', async () => {
    await expect(createPinHash('1234')).rejects.toThrow('6 cifre')
  })
})
