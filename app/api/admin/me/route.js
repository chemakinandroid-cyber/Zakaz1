export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'
import { createClient } from '@supabase/supabase-js'

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return Response.json({ branch_id: null, debug: 'no_token' })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return Response.json({ branch_id: null, debug: 'no_env' })
    }

    // Проверяем пользователя по токену
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return Response.json({ branch_id: null, debug: 'invalid_token', error: userError?.message })
    }

    // Читаем привязку через service role
    const supabase = getServerSupabase()
    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      return Response.json({ branch_id: null, debug: 'db_error', error: adminError.message })
    }

    // Нет записи → мастер (null), есть запись → конкретная точка
    return Response.json({
      branch_id: adminRow?.branch_id ?? null,
      is_master: !adminRow,
      user_email: user.email,
    })
  } catch (e) {
    return Response.json({ branch_id: null, debug: 'exception', error: e.message })
  }
}
