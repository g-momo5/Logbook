function isSixDigitPin(pin: string) {
  return /^\d{6}$/.test(pin)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
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
