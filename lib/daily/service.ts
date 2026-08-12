// =============================================================================
// lib/daily/service.ts — build/fetch a child's daily game (server-only).
//
// Per platform-data-model-and-rules.md → "Daily question flow": exactly 5
// questions per child per day, auto-picked deterministically (seed =
// hash(child_id + date)) from the child's enabled_categories, at the difficulty
// tier that category_levels dictates. Plus a 6th "bonus" question (the locked
// story-mode mockup unlocks it after the first 5 are answered).
//
// daily_sets stores the 5 regular question ids (schema enforces exactly 5); the
// bonus is persisted as a 6th submission whose question_id is not in that array,
// so it survives reloads. All six submissions are created up front (status
// 'unanswered') so grading and progress restore have rows to work with.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Category,
  Database,
  DifficultyTier,
  Locale,
  SubmissionStatus,
} from '@/types/database'

const DEFAULT_TIER: DifficultyTier = 'medium'

export interface ChildForDaily {
  id: string
  locale: Locale
  enabled_categories: Category[]
  category_levels: Record<string, DifficultyTier>
}

export interface GameQuestion {
  submissionId: string
  category: Category
  /** Question prompt in the child's locale. */
  text: string
  status: SubmissionStatus
  isBonus: boolean
}

export interface TodaysGame {
  date: string
  /** 5 regular questions (in daily-set order) followed by the bonus question. */
  questions: GameQuestion[]
}

// --- deterministic RNG (xmur3 seed → mulberry32) -----------------------------
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type BankRow = {
  id: string
  category: Category
  difficulty_tier: DifficultyTier
  text_he: string
  text_en: string
}

/** Deterministically pick 5 regular question ids + 1 bonus id from the bank. */
function pickDailySet(
  bank: BankRow[],
  enabled: Category[],
  levels: Record<string, DifficultyTier>,
  seedStr: string
): { five: string[]; bonus: string } {
  const rng = mulberry32(xmur3(seedStr)())
  const used = new Set<string>()
  const avail = (pred: (q: BankRow) => boolean) =>
    bank.filter((q) => !used.has(q.id) && pred(q))
  const pick = (arr: BankRow[]) =>
    arr.length ? arr[Math.floor(rng() * arr.length)] : null

  const pickForCategory = (cat: Category, tier: DifficultyTier) =>
    pick(avail((q) => q.category === cat && q.difficulty_tier === tier)) ??
    pick(avail((q) => q.category === cat))

  const five: string[] = []
  for (let i = 0; i < 5; i++) {
    const cat = enabled[i % enabled.length]
    const tier = levels[cat] ?? DEFAULT_TIER
    let q = pickForCategory(cat, tier)
    if (!q) for (const c of enabled) if ((q = pickForCategory(c, DEFAULT_TIER))) break
    if (!q) q = pick(avail(() => true))
    if (!q) throw new Error('Not enough questions in the bank to build a daily set')
    used.add(q.id)
    five.push(q.id)
  }

  // Bonus: prefer a hard question from an enabled category.
  let bonus: BankRow | null = null
  for (const c of enabled) if ((bonus = pickForCategory(c, 'hard'))) break
  if (!bonus) bonus = pick(avail(() => true))
  if (!bonus) throw new Error('No question available for the bonus slot')

  return { five, bonus: bonus.id }
}

/** YYYY-MM-DD "today" in the given IANA timezone (default Israel). */
export function todayISO(tz = 'Asia/Jerusalem'): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Get today's game for a child, creating the daily set + submissions on first
 * visit. Idempotent per (child, date).
 */
export async function getOrCreateTodaysGame(
  db: SupabaseClient<Database>,
  child: ChildForDaily
): Promise<TodaysGame> {
  if (!child.enabled_categories || child.enabled_categories.length === 0) {
    throw new Error('Child has no enabled categories — cannot build a daily set')
  }
  const date = todayISO()

  // Existing set?
  const { data: existing } = await db
    .from('daily_sets')
    .select('id, question_ids')
    .eq('child_id', child.id)
    .eq('date', date)
    .maybeSingle()

  let dailySetId: string
  let fiveIds: string[]
  let bonusId: string

  if (existing) {
    dailySetId = existing.id
    fiveIds = existing.question_ids
    bonusId = await ensureBonus(db, dailySetId, child, fiveIds, date)
  } else {
    const { data: bank, error: bankErr } = await db
      .from('questions')
      .select('id, category, difficulty_tier, text_he, text_en')
    if (bankErr) throw bankErr

    const picked = pickDailySet(
      (bank ?? []) as BankRow[],
      child.enabled_categories,
      child.category_levels ?? {},
      `${child.id}|${date}`
    )
    fiveIds = picked.five
    bonusId = picked.bonus

    const { data: inserted, error: insErr } = await db
      .from('daily_sets')
      .insert({ child_id: child.id, date, question_ids: fiveIds })
      .select('id')
      .single()

    if (insErr) {
      // Lost a create race — another request made it first. Re-read.
      const { data: raced } = await db
        .from('daily_sets')
        .select('id, question_ids')
        .eq('child_id', child.id)
        .eq('date', date)
        .single()
      dailySetId = raced!.id
      fiveIds = raced!.question_ids
      bonusId = await ensureBonus(db, dailySetId, child, fiveIds, date)
    } else {
      dailySetId = inserted.id
      await db.from('submissions').insert(
        [...fiveIds, bonusId].map((qid) => ({
          daily_set_id: dailySetId,
          question_id: qid,
          child_id: child.id,
          status: 'unanswered' as const,
        }))
      )
    }
  }

  return buildGame(db, child, dailySetId, fiveIds, bonusId)
}

/** Find (or create) the bonus submission for an existing daily set. */
async function ensureBonus(
  db: SupabaseClient<Database>,
  dailySetId: string,
  child: ChildForDaily,
  fiveIds: string[],
  date: string
): Promise<string> {
  const { data: subs } = await db
    .from('submissions')
    .select('question_id')
    .eq('daily_set_id', dailySetId)
  const found = (subs ?? []).find((s) => !fiveIds.includes(s.question_id))
  if (found) return found.question_id

  // Older set with no bonus row — pick and insert one now.
  const { data: bank } = await db
    .from('questions')
    .select('id, category, difficulty_tier, text_he, text_en')
  const { bonus } = pickDailySet(
    (bank ?? []) as BankRow[],
    child.enabled_categories,
    child.category_levels ?? {},
    `${child.id}|${date}|bonus`
  )
  await db.from('submissions').insert({
    daily_set_id: dailySetId,
    question_id: bonus,
    child_id: child.id,
    status: 'unanswered',
  })
  return bonus
}

async function buildGame(
  db: SupabaseClient<Database>,
  child: ChildForDaily,
  dailySetId: string,
  fiveIds: string[],
  bonusId: string
): Promise<TodaysGame> {
  const { data: subs, error: subsErr } = await db
    .from('submissions')
    .select('id, question_id, status')
    .eq('daily_set_id', dailySetId)
  if (subsErr) throw subsErr

  const allIds = [...fiveIds, bonusId]
  const { data: qs, error: qErr } = await db
    .from('questions')
    .select('id, category, text_he, text_en')
    .in('id', allIds)
  if (qErr) throw qErr

  const qById = new Map(qs?.map((q) => [q.id, q]))
  const subByQid = new Map(subs?.map((s) => [s.question_id, s]))

  const toGameQuestion = (qid: string, isBonus: boolean): GameQuestion => {
    const q = qById.get(qid)!
    const sub = subByQid.get(qid)!
    return {
      submissionId: sub.id,
      category: q.category,
      text: child.locale === 'he' ? q.text_he : q.text_en,
      status: sub.status,
      isBonus,
    }
  }

  return {
    date: todayISO(),
    questions: [
      ...fiveIds.map((qid) => toGameQuestion(qid, false)),
      toGameQuestion(bonusId, true),
    ],
  }
}
