import { getServerSupabase } from '@/lib/serverSupabase'
import { ACTIVE_STATUSES } from '@/lib/constants'

// GET: list orders for a branch
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const branch_id = searchParams.get('branch_id')
  const mode = searchParams.get('mode') || 'active' // active | archive

  try {
    const supabase = getServerSupabase()

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (branch_id) query = query.eq('branch_id', branch_id)

    if (mode === 'active') {
      query = query.in('status', ACTIVE_STATUSES)
    } else {
      query = query.not('status', 'in', `(${ACTIVE_STATUSES.join(',')})`)
    }

    if (mode === 'archive') query = query.limit(100)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ orders: data || [] })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// PATCH: update order status
export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id, status } = body

    const allowed = ['new', 'confirmed', 'preparing', 'ready', 'completed', 'expired']
    if (!id) return Response.json({ error: 'id обязателен' }, { status: 400 })
    if (!allowed.includes(status)) return Response.json({ error: 'Недопустимый статус' }, { status: 400 })

    const supabase = getServerSupabase()
    const patch = { status }
    if (status === 'confirmed') patch.is_confirmed = true

    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ order: data })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
