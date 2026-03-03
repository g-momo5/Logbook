import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

import { appEnv, hasSupabaseConfig } from './env'

let supabaseClient: SupabaseClient | null = null

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
