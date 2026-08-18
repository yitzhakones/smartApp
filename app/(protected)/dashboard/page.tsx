import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getChildTrend } from '@/lib/dashboard/trend-service'
import { getOrSeedPresets } from '@/lib/dashboard/presets-service'
import { getRecentActivity } from '@/lib/dashboard/activity-service'
import { getAllNotifications } from '@/lib/dashboard/notifications-service'
import { getParentAccount } from '@/lib/dashboard/account-service'
import { buildChildShareLink, getAppOrigin } from '@/lib/dashboard/share-link'
import { DashboardClient, type DashboardChild } from './dashboard-client'

export const metadata: Metadata = {
  title: 'לוח הורים — חידון יומי',
}

// Always render fresh: stats/balances change as children play and as the parent
// records withdrawals, so this page must never be statically cached.
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { newChild?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // The (protected) layout already redirects unauthenticated visitors before
  // this page ever renders — user is guaranteed here.
  const parentId = user!.id

  // RLS scopes this to the logged-in parent (children.parent_id = auth.uid()),
  // and the embedded child_stats read is allowed by the "reads own children
  // stats" policy — no explicit parent filter needed here. Includes every
  // field EditChildScreen edits, not just the summary-card fields.
  const { data: rows } = await supabase
    .from('children')
    .select(
      `id, display_name, gender, locale, enabled_categories,
       shekel_per_star, weekly_improvement_bonus, access_mode, access_pin, access_token,
       child_stats ( total_stars, total_money_owed_nis, streak )`
    )
    .order('created_at')

  // Parent-level data (shared across all children, or not child-scoped at
  // all), so each is fetched once rather than per child. The origin is the
  // same for every child's share link, so it's resolved once too.
  const [presets, notifications, account, origin] = await Promise.all([
    getOrSeedPresets(supabase, parentId),
    getAllNotifications(supabase),
    getParentAccount(supabase, parentId),
    getAppOrigin(),
  ])

  // The trend chart and activity feed each need a further per-child query; run
  // every child's fetches concurrently rather than serially.
  const children: DashboardChild[] = await Promise.all(
    (rows ?? []).map(async (c) => {
      // Supabase types a to-one embed as an array; normalize to the single row.
      const stats = Array.isArray(c.child_stats) ? c.child_stats[0] : c.child_stats
      const [trend, activity] = await Promise.all([
        getChildTrend(supabase, c.id, c.enabled_categories),
        getRecentActivity(supabase, c.id, c.locale),
      ])
      return {
        id: c.id,
        name: c.display_name,
        gender: c.gender,
        locale: c.locale,
        enabledCategories: c.enabled_categories,
        shekelPerStar: Number(c.shekel_per_star),
        weeklyImprovementBonus: Number(c.weekly_improvement_bonus),
        accessMode: c.access_mode,
        accessPin: c.access_pin,
        shareUrl: buildChildShareLink(origin, c.access_token),
        stars: stats?.total_stars ?? 0,
        money: Number(stats?.total_money_owed_nis ?? 0),
        streak: stats?.streak ?? 0,
        trend,
        activity,
      }
    })
  )

  return (
    <DashboardClient
      initialChildren={children}
      initialPresets={presets}
      initialNotifications={notifications}
      initialAccount={account}
      justCreatedChildId={searchParams.newChild ?? null}
    />
  )
}
