// =============================================================================
// lib/placement/ladder.ts — the adaptive placement ladder (pure, no I/O).
//
// Implements the "Placement quiz" rule from platform-data-model-and-rules.md
// (Difficulty calibration section), run ONCE per enabled category at child setup:
//
//   Q1 = medium tier
//     correct   → Q2 = hard   (correct again → start `hard`;  wrong → start `medium`)
//     incorrect → Q2 = easy   (correct       → start `easy`;  wrong → start lowest tier)
//
// With only three tiers, the "wrong again on easy" case has nowhere lower to go,
// so it also resolves to `easy` (the lowest/most basic tier). Every category runs
// its own independent ladder — a child can land `hard` in math and `easy` in
// history at the same time; there is never a single overall level.
//
// These functions are intentionally pure so the calibration logic is trivially
// unit-testable and identical whether driven from a route, a test, or a script.
// =============================================================================

import type { DifficultyTier } from '@/types/database'

/** Exactly two questions per category (Q1 then Q2). */
export const LADDER_LENGTH = 2

/**
 * Tier of the NEXT question to present, given the correctness of the answers
 * already graded for this category (in order). Returns `null` once the ladder
 * is complete (2 answers recorded).
 */
export function nextTier(answers: readonly boolean[]): DifficultyTier | null {
  switch (answers.length) {
    case 0:
      return 'medium' // Q1 always starts at medium
    case 1:
      return answers[0] ? 'hard' : 'easy' // Q2 branches on the Q1 result
    default:
      return null // ladder complete
  }
}

/** Has this category's 2-question ladder been fully answered? */
export function isLadderComplete(answers: readonly boolean[]): boolean {
  return answers.length >= LADDER_LENGTH
}

/**
 * Resolve the child's starting `difficulty_tier` for a category from its two
 * ladder answers. Requires exactly the two answers (throws otherwise — a guard
 * against resolving a half-finished ladder).
 */
export function resolveLevel(answers: readonly boolean[]): DifficultyTier {
  if (answers.length !== LADDER_LENGTH) {
    throw new Error(
      `resolveLevel expects ${LADDER_LENGTH} answers, got ${answers.length}`
    )
  }

  const [q1, q2] = answers

  if (q1) {
    // Q1 correct → climbed to a hard Q2.
    return q2 ? 'hard' : 'medium'
  }
  // Q1 incorrect → dropped to an easy Q2. Both outcomes bottom out at easy
  // (there is no tier below easy to fall to).
  return 'easy'
}
