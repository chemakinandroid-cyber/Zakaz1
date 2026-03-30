import { getServerSupabase } from '@/lib/serverSupabase'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/me — возвращает branch_id для текущего пользователя
export async function GET(req) {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return Response.json({ branch_id: null })

    // Проверяем пользователя через anon client с его токеном
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error } = await userClient.auth.getUser()
    if (error || !user) return Response.json({ branch_id: null })

    // Читаем привязку через service role (обходит RLS)
    const supabase = getServerSupabase()
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Если записи нет — мастер (branch_id: null)
    // Если есть — возвращаем branch_id
    return Response.json({ branch_id: adminRow?.branch_id ?? null, is_master: !adminRow })
  } catch (e) {
    return Response.json({ branch_id: null, error: e.message })
  }
}
