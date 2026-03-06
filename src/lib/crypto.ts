function isSixDigitPin(pin: string) {
  return /^\d{6}$/.test(pin)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = bytesToHex(bytes)

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

export function generateUuid() {
  const webCrypto = globalThis.crypto

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    return bytesToUuid(bytes)
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

async function hashValue(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(new Uint8Array(buffer))
}

export async function createPinHash(pin: string) {
  if (!isSixDigitPin(pin)) {
    throw new Error('Il PIN deve avere 6 cifre.')
  }

  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
  const pinHash = await hashValue(`${salt}:${pin}`)

  return {
    pinHash,
    pinSalt: salt,
  }
}

export async function verifyPinHash(
  pin: string,
  options: { pinHash: string; pinSalt: string },
) {
  if (!isSixDigitPin(pin)) {
    return false
  }

  const computedHash = await hashValue(`${options.pinSalt}:${pin}`)
  return computedHash === options.pinHash
}
