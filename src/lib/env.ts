export const appEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN?.trim() ?? '',
}

export const hasSupabaseConfig = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey)
