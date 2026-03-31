export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

// POST — добавить в стоп
// DELETE — убрать из стопа
export async function POST(req) {
  try {
    const { branch_id, menu_item_id } = await req.json()
    if (!branch_id || !menu_item_id) return Response.json({ error: 'Нет данных' }, { status: 400 })

    const supabase = getServerSupabase()
    const { error } = await supabase
      .from('stop_list')
      .upsert({ branch_id, menu_item_id, is_stopped: true }, { onConflict: 'branch_id,menu_item_id' })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { branch_id, menu_item_id } = await req.json()
    if (!branch_id || !menu_item_id) return Response.json({ error: 'Нет данных' }, { status: 400 })

    const supabase = getServerSupabase()
    const { error } = await supabase
      .from('stop_list')
      .delete()
      .eq('branch_id', branch_id)
      .eq('menu_item_id', menu_item_id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
