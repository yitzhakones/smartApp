import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Fresh child_stats for the child app's status dashboard. The dashboard is a
// client-side screen switch (no navigation), so it fetches this each time it's
// opened to reflect stars/money/streak earned since page load. Token-scoped,
// service-role, never cached.
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: { accessToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.accessToken) {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data: child } = await db
    .from('children')
    .select('id')
    .eq('access_token', body.accessToken)
    .maybeSingle()
  if (!child) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
  }

  const { data: stats } = await db
    .from('child_stats')
    .select('total_stars, total_money_owed_nis, streak')
    .eq('child_id', child.id)
    .maybeSingle()

  return NextResponse.json(
    {
      totalStars: stats?.total_stars ?? 0,
      totalMoney: Number(stats?.total_money_owed_nis ?? 0),
      streak: stats?.streak ?? 0,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
