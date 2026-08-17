// =============================================================================
// lib/placement/service.ts — placement quiz orchestration (server-only).
//
// Ties the pure ladder/session engine to the question bank and the answer grader.
// Runs entirely under the SERVICE ROLE: children have no auth session, so the
// whole placement flow is server-mediated (see supabase/README.md security model).
//
// Lifecycle (transport layer owns the session value between requests):
//   startPlacement(childId)                → first PresentedQuestion
//   submitPlacementAnswer(session, answer) → next question, or completion
//   (on completion) finalizePlacement writes children.category_levels
//
// Grading is injected (PlacementGrader) — the Claude grader is a separate step,
// and the questions bank is seeded separately, so selectQuestion throws a clear
// error until content exists rather than guessing.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Category,
  DifficultyTier,
  Database,
  Locale,
} from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'
import type { GradableQuestion, PlacementGrader } from './grader'
import { placementCopy } from './messages'
import {
  applyAnswer,
  createSession,
  isComplete,
  nextStep,
  resolveLevels,
  withPending,
  type PlacementSession,
} from './session'

/** A question as shown to the child — never carries the answer key. */
export interface PresentedQuestion {
  id: string
  category: Category
  tier: DifficultyTier
  text: string
}

/** One step of the placement flow returned to the transport layer. */
export type PlacementStep =
  | {
      done: false
      session: PlacementSession
      question: PresentedQuestion
      /** Neutral between-question copy; null before the very first question. */
      message: string | null
    }
  | {
      done: true
      session: PlacementSession
      /** Neutral completion copy — never a score. */
      message: string
    }

export interface PlacementDeps {
  /** Defaults to a fresh service-role client. */
  db?: SupabaseClient<Database>
  grader: PlacementGrader
}

/** Thrown when placement is requested for a child that was already calibrated. */
export class PlacementAlreadyCompletedError extends Error {
  constructor(childId: string) {
    super(`Placement already completed for child ${childId}`)
    this.name = 'PlacementAlreadyCompletedError'
  }
}

/** Thrown when the question bank has no unused question for a category+tier. */
export class NoQuestionAvailableError extends Error {
  constructor(category: Category, tier: DifficultyTier) {
    super(`No unused ${tier} question available for category "${category}"`)
    this.name = 'NoQuestionAvailableError'
  }
}

function localeText(
  row: { text_he: string; text_en: string },
  locale: Locale
): string {
  return locale === 'he' ? row.text_he : row.text_en
}

function localeAnswerKey(
  row: { answer_key_he: string; answer_key_en: string },
  locale: Locale
): string {
  return locale === 'he' ? row.answer_key_he : row.answer_key_en
}

/**
 * Pick a random unused question of the given category+tier from the shared bank.
 * Placement volume is tiny (≤2 per category), so we fetch candidates and pick in
 * JS rather than reaching for a random-order RPC.
 */
async function selectQuestion(
  db: SupabaseClient<Database>,
  category: Category,
  tier: DifficultyTier,
  excludeIds: string[],
  locale: Locale
): Promise<PresentedQuestion> {
  const { data, error } = await db
    .from('questions')
    .select('id, category, difficulty_tier, text_he, text_en')
    .eq('category', category)
    .eq('difficulty_tier', tier)

  if (error) throw error

  const candidates = (data ?? []).filter((q) => !excludeIds.includes(q.id))
  if (candidates.length === 0) throw new NoQuestionAvailableError(category, tier)

  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    id: picked.id,
    category: picked.category,
    tier: picked.difficulty_tier,
    text: localeText(picked, locale),
  }
}

/** Re-fetch a question (with its answer key) for server-side grading. */
async function fetchForGrading(
  db: SupabaseClient<Database>,
  questionId: string,
  locale: Locale
): Promise<GradableQuestion> {
  const { data, error } = await db
    .from('questions')
    .select(
      'id, category, difficulty_tier, text_he, text_en, answer_key_he, answer_key_en'
    )
    .eq('id', questionId)
    .single()

  if (error) throw error

  return {
    id: data.id,
    category: data.category,
    difficulty_tier: data.difficulty_tier,
    text: localeText(data, locale),
    answerKey: localeAnswerKey(data, locale),
  }
}

/** Advance the session to its next pending question, or null if complete. */
async function toNextStep(
  db: SupabaseClient<Database>,
  session: PlacementSession
): Promise<PlacementStep> {
  const step = nextStep(session)

  if (!step) {
    // Every ladder is complete — persist the resolved levels and finish.
    await finalizePlacement(session, db)
    return {
      done: true,
      session: { ...session, pending: null },
      message: placementCopy(session.locale).completed,
    }
  }

  const question = await selectQuestion(
    db,
    step.category,
    step.tier,
    session.askedQuestionIds,
    session.locale
  )
  const next = withPending(session, {
    category: question.category,
    tier: question.tier,
    questionId: question.id,
  })
  // No between-question copy before the very first question.
  const isFirstQuestion = session.askedQuestionIds.length === 0
  return {
    done: false,
    session: next,
    question,
    message: isFirstQuestion ? null : placementCopy(session.locale).betweenQuestions,
  }
}

/**
 * Begin placement for a child. Loads locale + enabled categories, guards against
 * re-running on an already-calibrated child, and returns the first question.
 */
export async function startPlacement(
  childId: string,
  deps: Pick<PlacementDeps, 'db'> = {}
): Promise<PlacementStep> {
  const db = deps.db ?? createServiceClient()

  const { data: child, error } = await db
    .from('children')
    .select('id, locale, enabled_categories, category_levels')
    .eq('id', childId)
    .single()

  if (error) throw error

  // category_levels is the placement output; a non-empty map means it already ran.
  const existingLevels = (child.category_levels ?? {}) as Record<string, unknown>
  if (Object.keys(existingLevels).length > 0) {
    throw new PlacementAlreadyCompletedError(childId)
  }

  const session = createSession(
    child.id,
    child.locale,
    child.enabled_categories
  )
  return toNextStep(db, session)
}

/**
 * Grade the answer to the session's pending question, advance the ladder, and
 * return the next question (or completion). The verdict is never surfaced to the
 * child — it only drives the adaptive ladder.
 */
export async function submitPlacementAnswer(
  session: PlacementSession,
  answerText: string,
  deps: PlacementDeps
): Promise<PlacementStep> {
  const db = deps.db ?? createServiceClient()

  if (!session.pending) {
    throw new Error('submitPlacementAnswer: session has no pending question')
  }

  const question = await fetchForGrading(
    db,
    session.pending.questionId,
    session.locale
  )
  const { isCorrect } = await deps.grader.grade({
    question,
    answerText,
    locale: session.locale,
  })

  const advanced = applyAnswer(session, isCorrect)
  return toNextStep(db, advanced)
}

/**
 * Resolve the per-category starting tiers and write them to children.category_levels.
 * Called automatically when the last ladder completes; exported for explicit use
 * / testing. Levels are per-category and independent (never a single overall level).
 */
export async function finalizePlacement(
  session: PlacementSession,
  db: SupabaseClient<Database> = createServiceClient()
): Promise<Record<Category, DifficultyTier>> {
  if (!isComplete(session)) {
    throw new Error('finalizePlacement: not all category ladders are complete')
  }

  const levels = resolveLevels(session)
  const { error } = await db
    .from('children')
    .update({ category_levels: levels })
    .eq('id', session.childId)

  if (error) throw error
  // TEMPORARY DIAGNOSTIC LOGGING — remove once the "בואו נתחיל" intermittent-
  // failure investigation is closed. Marks the exact moment the write is
  // confirmed committed (the update() promise only resolves after Postgres
  // commits), for correlation against the routing-check read log in
  // app/p/[token]/page.tsx and the client-side tap log in placement-quiz.tsx.
  console.log(
    `[placement] WRITE CONFIRMED child=${session.childId} levels=${JSON.stringify(levels)} at=${new Date().toISOString()}`
  )
  return levels
}
