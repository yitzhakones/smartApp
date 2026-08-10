// =============================================================================
// lib/placement/grader.ts — grading contract for the placement quiz.
//
// Placement re-uses the platform's server-side grading semantics (accept
// reasonably-phrased equivalent answers against the answer_key, not brittle
// exact-string matching), but it only needs the boolean verdict — placement
// never shows feedback text to the child. The real Claude grader built in the
// grading step can implement this interface directly (it returns a superset:
// { is_correct, feedback_message }).
//
// Injecting the grader keeps the placement service testable with a stub and
// decoupled from the (separately-built) Claude integration.
// =============================================================================

import type { Category, DifficultyTier, Locale } from '@/types/database'

export interface GradableQuestion {
  id: string
  category: Category
  difficulty_tier: DifficultyTier
  /** Question prompt in the child's locale. */
  text: string
  /** Ground-truth answer key in the child's locale. */
  answerKey: string
}

export interface PlacementGrader {
  /**
   * Return whether the answer is correct. Placement discards any feedback text;
   * only the verdict feeds the adaptive ladder.
   */
  grade(input: {
    question: GradableQuestion
    answerText: string
    locale: Locale
  }): Promise<{ isCorrect: boolean }>
}
