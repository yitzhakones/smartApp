// =============================================================================
// scripts/reset-child.mjs — DEV-ONLY per-child test reset.
//
//   npm run test:reset -- <access_token> --force [--placement]
//
// Given a child's access_token, this:
//   • deletes TODAY's daily_set for that child (submissions cascade with it), so
//     a fresh set regenerates on the next visit,
//   • clears that child's reward_ledger and notifications,
//   • resets child_stats to zero (deletes the rollup row).
//   • with --placement: also clears category_levels, so the next visit re-runs
//     the placement quiz before the daily game.
//
// SAFETY — this is destructive, so it refuses to run unless ALL hold:
//   1. --force is passed explicitly.
//   2. NODE_ENV is not 'production'.
//   3. ALLOW_TEST_RESET is truthy in the environment (set only in local
//      .env.local — production deploys never set it, so this can't hit prod).
//   4. The target Supabase URL does not equal PRODUCTION_SUPABASE_URL (if that
//      env var is configured as an extra guard).
//
// Run via the env-file loader so the guards + credentials are present:
//   node --env-file=.env.local scripts/reset-child.mjs <token> --force
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const force = args.includes('--force')
const token = args.find((a) => !a.startsWith('--'))
const alsoPlacement = args.includes('--placement')

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// --- safety guards --------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  die('refusing to run with NODE_ENV=production.')
}
if (!process.env.ALLOW_TEST_RESET) {
  die(
    'ALLOW_TEST_RESET is not set. This dev-only reset refuses to run without it.\n' +
      '  Add ALLOW_TEST_RESET=1 to your local .env.local (never to a production env).'
  )
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  die('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.')
}
if (
  process.env.PRODUCTION_SUPABASE_URL &&
  process.env.PRODUCTION_SUPABASE_URL === url
) {
  die('target URL matches PRODUCTION_SUPABASE_URL — refusing.')
}
if (!token) {
  die('usage: npm run test:reset -- <access_token> --force')
}
if (!force) {
  die('this is destructive — pass --force to confirm.\n  npm run test:reset -- <access_token> --force')
}

// --- run ------------------------------------------------------------------
const db = createClient(url, serviceKey, { auth: { persistSession: false } })
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

const { data: child, error: childErr } = await db
  .from('children')
  .select('id, display_name')
  .eq('access_token', token)
  .maybeSingle()
if (childErr) die(childErr.message)
if (!child) die(`no child found for access_token "${token}".`)

console.log(`Resetting "${child.display_name}" (${child.id}) for ${today} …`)

// Today's daily_set — submissions cascade on delete (FK ON DELETE CASCADE).
const { data: sets, error: dsErr } = await db
  .from('daily_sets')
  .delete()
  .eq('child_id', child.id)
  .eq('date', today)
  .select('id')
if (dsErr) die(dsErr.message)

const { data: ledger, error: lErr } = await db
  .from('reward_ledger')
  .delete()
  .eq('child_id', child.id)
  .select('id')
if (lErr) die(lErr.message)

const { data: notifs } = await db
  .from('notifications')
  .delete()
  .eq('child_id', child.id)
  .select('id')

const { error: csErr } = await db.from('child_stats').delete().eq('child_id', child.id)
if (csErr) die(csErr.message)

// Optional: also clear calibration so the next visit re-runs the placement quiz.
if (alsoPlacement) {
  const { error: clErr } = await db
    .from('children')
    .update({ category_levels: {} })
    .eq('id', child.id)
  if (clErr) die(clErr.message)
}

console.log(
  `✓ deleted ${sets?.length ?? 0} daily_set(s) (+ their submissions), ` +
    `${ledger?.length ?? 0} ledger row(s), ${notifs?.length ?? 0} notification(s); ` +
    `child_stats reset to zero` +
    (alsoPlacement ? '; category_levels cleared (placement will re-run).' : '.')
)
console.log(
  alsoPlacement
    ? 'Next visit will re-run the placement quiz, then a fresh daily set.'
    : 'Next visit will regenerate a fresh daily set.'
)
process.exit(0)
