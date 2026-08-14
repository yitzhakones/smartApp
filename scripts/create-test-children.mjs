// =============================================================================
// scripts/create-test-children.mjs — DEV-ONLY: seed a few varied test children.
//
//   node --env-file=.env.local scripts/create-test-children.mjs
//
// Inserts a small set of children (varied display_name / gender / locale /
// access_mode / enabled_categories / category_levels) under the first parent,
// and prints their play URLs. Re-runnable: skips any name that already exists.
//
// Same dev guard as the reset script (ALLOW_TEST_RESET, not production) — test
// fixtures should never be created against a real database.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

function die(m) {
  console.error(`✗ ${m}`)
  process.exit(1)
}
if (process.env.NODE_ENV === 'production') die('refusing to run with NODE_ENV=production.')
if (!process.env.ALLOW_TEST_RESET) die('ALLOW_TEST_RESET not set — add it to .env.local (dev only).')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) die('missing Supabase env vars.')

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: parent } = await db.from('parents').select('id').order('created_at').limit(1).single()
if (!parent) die('no parent row exists — sign up a parent first.')

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000'

// Deliberately varied: access modes, locales, category mixes, and levels.
const CHILDREN = [
  {
    display_name: 'דניאל',
    gender: 'male',
    locale: 'he',
    access_mode: 'no_code',
    access_pin: null,
    enabled_categories: ['math', 'science'],
    category_levels: { math: 'hard', science: 'medium' },
  },
  {
    display_name: 'מאיה',
    gender: 'female',
    locale: 'he',
    access_mode: 'pin',
    access_pin: '1234',
    enabled_categories: ['israeli_history', 'general_knowledge', 'science'],
    category_levels: { israeli_history: 'easy', general_knowledge: 'medium', science: 'hard' },
  },
  {
    display_name: 'איתי',
    gender: 'male',
    locale: 'en',
    access_mode: 'no_code',
    access_pin: null,
    enabled_categories: ['math', 'science', 'israeli_history', 'general_knowledge'],
    category_levels: { math: 'medium', science: 'easy', israeli_history: 'hard', general_knowledge: 'medium' },
  },
  {
    // No category_levels → first visit runs the placement quiz to calibrate them.
    display_name: 'רותם',
    gender: 'female',
    locale: 'he',
    access_mode: 'no_code',
    access_pin: null,
    enabled_categories: ['math', 'science', 'israeli_history'],
    category_levels: {},
  },
]

console.log('base URL:', BASE, '\n')
for (const c of CHILDREN) {
  const { data: existing } = await db
    .from('children')
    .select('access_token')
    .eq('parent_id', parent.id)
    .eq('display_name', c.display_name)
    .maybeSingle()

  let token
  if (existing) {
    token = existing.access_token
    console.log(`= ${c.display_name} already exists (${c.access_mode})`)
  } else {
    const { data, error } = await db
      .from('children')
      .insert({ parent_id: parent.id, shekel_per_star: 1, ...c })
      .select('access_token')
      .single()
    if (error) die(`insert "${c.display_name}" failed: ${error.message}`)
    token = data.access_token
    console.log(`+ created ${c.display_name} (${c.access_mode}${c.access_pin ? `, pin ${c.access_pin}` : ''})`)
  }
  console.log(`  categories: ${c.enabled_categories.join(', ')}`)
  console.log(`  ${BASE}/p/${token}\n`)
}
process.exit(0)
