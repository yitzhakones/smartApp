import { notFound } from 'next/navigation'
import type { DifficultyTier } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'
import {
  EmptyBankError,
  NoEnabledCategoriesError,
  getOrCreateTodaysGame,
} from '@/lib/daily/service'
import { StoryMode } from './story-mode'
import { PlacementQuiz } from './placement-quiz'

// The child app. Children have no auth session — the unguessable access_token in
// the URL (app.com/p/{access_token}) is their identity, resolved server-side via
// the service role. Node runtime + always dynamic (per-child, per-day data).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div
      dir="rtl"
      style={{
        background: '#0B0B0F',
        minHeight: '100vh',
        maxWidth: 420,
        margin: '0 auto',
      }}
      className="flex flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <p className="text-2xl font-black text-white">{title}</p>
      <p className="text-sm" style={{ color: '#B7BCC8' }}>
        {body}
      </p>
    </div>
  )
}

export default async function ChildPlayPage({
  params,
}: {
  params: { token: string }
}) {
  const db = createServiceClient()

  const { data: child, error: childQueryError } = await db
    .from('children')
    .select(
      'id, display_name, locale, enabled_categories, category_levels, shekel_per_star'
    )
    .eq('access_token', params.token)
    .maybeSingle()

  // TEMPORARY DIAGNOSTIC LOGGING — completely raw and unprocessed: both `data`
  // and `error` exactly as Supabase returned them, and the exact filter value
  // with visible quotes/length so whitespace or encoding issues are visible.
  // Logged before any `?? {}` fallback or other processing runs.
  console.log(
    `[child app] RAW QUERY filter=access_token="${params.token}" (len=${params.token.length}) data=${JSON.stringify(child)} error=${JSON.stringify(childQueryError)}`
  )

  if (!child) notFound()

  // Difficulty calibration runs once, at setup: if the child has enabled
  // categories but no category_levels yet, run the placement quiz first. It sets
  // category_levels, then the child lands in the daily game on reload.
  const levels = (child.category_levels ?? {}) as Record<string, DifficultyTier>
  const goesToPlacement = !!child.enabled_categories?.length && Object.keys(levels).length === 0
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the "בואו נתחיל" intermittent-
  // failure investigation is closed. This is a fresh createServiceClient() +
  // .select() on every request (force-dynamic, no fetch cache) — logs exactly
  // what this specific read saw, for correlation against the WRITE CONFIRMED
  // log in lib/placement/service.ts.
  console.log(
    `[child app] ROUTING READ child=${child.id} levels=${JSON.stringify(levels)} decision=${goesToPlacement ? 'placement' : 'game'} at=${new Date().toISOString()}`
  )
  if (goesToPlacement) {
    return (
      <PlacementQuiz accessToken={params.token} childName={child.display_name} />
    )
  }

  let game
  try {
    game = await getOrCreateTodaysGame(db, {
      id: child.id,
      locale: child.locale,
      enabled_categories: child.enabled_categories,
      category_levels: levels,
    })
  } catch (err) {
    // Surface the real cause in the server logs, and show the child a message
    // that matches what actually went wrong (not a catch-all).
    console.error('[child app] failed to build today’s game:', err)
    if (err instanceof EmptyBankError) {
      return (
        <Message
          title="אין עדיין שאלות"
          body="מאגר השאלות ריק — יש להריץ את סקריפט הזריעה (npm run seed:questions)."
        />
      )
    }
    if (err instanceof NoEnabledCategoriesError) {
      return (
        <Message
          title="עוד רגע מתחילים…"
          body="צריך לבחור קטגוריות עבור הילד/ה בהגדרות ההורה."
        />
      )
    }
    return (
      <Message
        title="משהו השתבש"
        body="לא הצלחנו לטעון את המשחק להיום. נסו שוב עוד רגע."
      />
    )
  }

  const { data: stats } = await db
    .from('child_stats')
    .select('total_stars, total_money_owed_nis, streak')
    .eq('child_id', child.id)
    .maybeSingle()

  const { data: msg } = await db
    .from('reward_ledger')
    .select('note')
    .eq('child_id', child.id)
    .eq('type', 'parent_reward')
    .not('note', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <StoryMode
      childName={child.display_name}
      accessToken={params.token}
      shekelPerStar={Number(child.shekel_per_star)}
      questions={game.questions}
      stats={{
        totalStars: stats?.total_stars ?? 0,
        totalMoney: Number(stats?.total_money_owed_nis ?? 0),
        streak: stats?.streak ?? 0,
      }}
      parentMessage={msg?.note ?? null}
    />
  )
}
