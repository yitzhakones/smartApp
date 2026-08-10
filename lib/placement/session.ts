// =============================================================================
// lib/placement/session.ts — placement session state (pure, serialisable).
//
// A placement session walks a child through every enabled category's 2-question
// ladder, in a fixed order, without repeating a question. The session value here
// carries NO answer keys and NO scores — only which questions were asked and the
// correctness sequence per category — so it is safe to serialise into a signed
// cookie / short-lived store between HTTP requests. There is deliberately no
// placement table in the schema (placement is ephemeral diagnostic plumbing), so
// the transport layer owns persistence of this value; the service in ./service.ts
// drives it.
// =============================================================================

import type { Category, DifficultyTier, Locale } from '@/types/database'
import { isLadderComplete, nextTier, resolveLevel } from './ladder'

/** A question currently presented to the child, awaiting an answer. */
export interface PendingQuestion {
  category: Category
  tier: DifficultyTier
  questionId: string
}

export interface PlacementSession {
  childId: string
  locale: Locale
  /** Enabled categories, in the fixed order the ladder walks them. */
  categories: Category[]
  /** Every question id already shown, so we never repeat one within a session. */
  askedQuestionIds: string[]
  /** category -> correctness of graded answers, in order. */
  progress: Record<string, boolean[]>
  /** The outstanding question, or null before the first / after the last. */
  pending: PendingQuestion | null
}

/** Create a fresh session for a child with the given enabled categories. */
export function createSession(
  childId: string,
  locale: Locale,
  categories: Category[]
): PlacementSession {
  if (categories.length === 0) {
    throw new Error('Cannot start placement: child has no enabled categories')
  }
  const progress: Record<string, boolean[]> = {}
  for (const category of categories) progress[category] = []

  return {
    childId,
    locale,
    categories: [...categories],
    askedQuestionIds: [],
    progress,
    pending: null,
  }
}

/**
 * The next category (in walk order) whose ladder still needs a question, along
 * with the tier to ask — or null when every category's ladder is complete.
 */
export function nextStep(
  session: PlacementSession
): { category: Category; tier: DifficultyTier } | null {
  for (const category of session.categories) {
    const answers = session.progress[category] ?? []
    if (!isLadderComplete(answers)) {
      const tier = nextTier(answers)
      if (tier) return { category, tier }
    }
  }
  return null
}

/** Record that the currently-pending question was answered correctly / not. */
export function applyAnswer(
  session: PlacementSession,
  wasCorrect: boolean
): PlacementSession {
  if (!session.pending) {
    throw new Error('applyAnswer called with no pending question')
  }
  const { category } = session.pending
  const answers = session.progress[category] ?? []

  return {
    ...session,
    progress: { ...session.progress, [category]: [...answers, wasCorrect] },
    pending: null,
  }
}

/** Attach a freshly-selected question as the pending one. */
export function withPending(
  session: PlacementSession,
  pending: PendingQuestion
): PlacementSession {
  return {
    ...session,
    pending,
    askedQuestionIds: [...session.askedQuestionIds, pending.questionId],
  }
}

/** Are all categories' ladders complete? */
export function isComplete(session: PlacementSession): boolean {
  return session.categories.every((category) =>
    isLadderComplete(session.progress[category] ?? [])
  )
}

/**
 * Resolve the final per-category starting tiers — the `category_levels` map
 * written to the children row. Throws if any ladder is unfinished.
 */
export function resolveLevels(
  session: PlacementSession
): Record<Category, DifficultyTier> {
  const levels = {} as Record<Category, DifficultyTier>
  for (const category of session.categories) {
    levels[category] = resolveLevel(session.progress[category] ?? [])
  }
  return levels
}
