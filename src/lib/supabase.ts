import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

import { appEnv, hasSupabaseConfig } from './env'
import { db, ensureBootstrapped } from './db'

let supabaseClient: SupabaseClient | null = null
const AUTH_STORAGE_KEY = 'logbook-supabase-auth'
const AUTH_META_KEY_PREFIX = 'supabase-auth:'

function getAuthMetaKey(key: string) {
  return `${AUTH_META_KEY_PREFIX}${key}`
}

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const supabaseAuthStorage = {
  async getItem(key: string) {
    try {
      await ensureBootstrapped()
      const record = await db.meta.get(getAuthMetaKey(key))

      if (record) {
        return record.value
      }
    } catch {
      // Fall through to localStorage lookup.
    }

    return getLocalStorage()?.getItem(getAuthMetaKey(key)) ?? null
  },
  async setItem(key: string, value: string) {
    try {
      await ensureBootstrapped()
      await db.meta.put({
        key: getAuthMetaKey(key),
        value,
      })
    } catch {
      // Best effort: still mirror to localStorage below.
    }

    getLocalStorage()?.setItem(getAuthMetaKey(key), value)
  },
  async removeItem(key: string) {
    try {
      await ensureBootstrapped()
      await db.meta.delete(getAuthMetaKey(key))
    } catch {
      // Keep removing the localStorage mirror below.
    }

    getLocalStorage()?.removeItem(getAuthMetaKey(key))
  },
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
        storage: supabaseAuthStorage,
      },
    })
  }

  return supabaseClient
}

export async function getSupabaseSession() {
  const client = getSupabaseClient()

  if (!client) {
    return null
  }

  const { data } = await client.auth.getSession()
  return data.session
}

export async function getSupabaseUserId() {
  const session = await getSupabaseSession()
  return session?.user.id ?? null
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error('Supabase non configurato.')
  }

  const result = await client.auth.signInWithPassword({ email, password })

  if (result.error) {
    throw result.error
  }

  return result.data.session
}

export async function signUpWithPassword(email: string, password: string) {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error('Supabase non configurato.')
  }

  const result = await client.auth.signUp({ email, password })

  if (result.error) {
    throw result.error
  }

  return result.data.session
}

export async function signOut() {
  const client = getSupabaseClient()

  if (!client) {
    return
  }

  const result = await client.auth.signOut()

  if (result.error) {
    throw result.error
  }
}

export function getSessionEmail(session: Session | null) {
  return session?.user.email ?? null
}
