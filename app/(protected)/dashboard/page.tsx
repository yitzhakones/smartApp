import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'
import { getChildTrend } from '@/lib/dashboard/trend-service'
import { DashboardClient, type DashboardChild } from './dashboard-client'

export const metadata: Metadata = {
  title: 'לוח הורים — חידון יומי',
}

// Always render fresh: stats/balances change as children play and as the parent
// records withdrawals, so this page must never be statically cached.
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // RLS scopes this to the logged-in parent (children.parent_id = auth.uid()),
  // and the embedded child_stats read is allowed by the "reads own children
  // stats" policy — no explicit parent filter needed here.
  const { data: rows } = await supabase
    .from('children')
    .select(
      'id, display_name, gender, locale, enabled_categories, child_stats ( total_stars, total_money_owed_nis, streak )'
    )
    .order('created_at')

  // The trend chart needs a second, per-child query (correct submissions); run
  // all children's fetches concurrently rather than serially.
  const children: DashboardChild[] = await Promise.all(
    (rows ?? []).map(async (c) => {
      // Supabase types a to-one embed as an array; normalize to the single row.
      const stats = Array.isArray(c.child_stats) ? c.child_stats[0] : c.child_stats
      const trend = await getChildTrend(supabase, c.id, c.enabled_categories)
      return {
        id: c.id,
        name: c.display_name,
        gender: c.gender,
        locale: c.locale,
        stars: stats?.total_stars ?? 0,
        money: Number(stats?.total_money_owed_nis ?? 0),
        streak: stats?.streak ?? 0,
        trend,
      }
    })
  )

  return (
    <>
      <DashboardClient initialChildren={children} />
      {/* Temporary sign-out affordance: it will move under the settings gear once
          the settings screens (separate task) are built. */}
      <form action={signOutAction} className="mx-auto max-w-[440px] px-4 pb-8">
        <button type="submit" className="text-xs font-bold opacity-50 underline">
          התנתקות
        </button>
      </form>
    </>
  )
}
