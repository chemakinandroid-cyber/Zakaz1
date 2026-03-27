import { createClient } from '@supabase/supabase-js'

export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Предпочитаем service role (обходит RLS), fallback на anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase не настроен: добавь переменные окружения на Vercel')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
