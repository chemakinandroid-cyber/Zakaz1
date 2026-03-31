export const dynamic = 'force-dynamic'

import { getServerSupabase } from '@/lib/serverSupabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const order_id = searchParams.get('order_id')
    if (!order_id) return Response.json({ wait_minutes: null })

    const supabase = getServerSupabase()
    const { data: order } = await supabase
      .from('orders')
      .select('branch_id, status, created_at')
      .eq('id', order_id)
      .maybeSingle()

    if (!order || ['completed','cancelled','expired','ready'].includes(order.status)) {
      return Response.json({ wait_minutes: null })
    }

    const { count: ahead } = await supabase
      .from('orders')
      .select('id', { count:'exact', head:true })
      .eq('branch_id', order.branch_id)
      .in('status', ['new','confirmed','preparing'])
      .neq('id', order_id)
      .lt('created_at', order.created_at)

    const elapsedMin = Math.floor((Date.now() - new Date(order.created_at)) / 60000)
    const baseTime = 7
    const queueTime = Math.max(0, ahead || 0) * 6
    const remaining = Math.max(1, baseTime + queueTime - elapsedMin)

    return Response.json({ wait_minutes: remaining })
  } catch (e) {
    return Response.json({ wait_minutes: null })
  }
}
