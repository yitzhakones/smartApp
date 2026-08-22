// =============================================================================
// lib/grading/service.ts — grade a submission and apply its consequences.
//
// Runs server-side under the service role. Implements the "Grading" business
// rules from platform-data-model-and-rules.md:
//   • status: unanswered → grading → correct | incorrect (locked; no retry)
//   • on correct: insert a `star` reward_ledger row (amount = shekel_per_star),
//     roll up child_stats (stars, money owed, streak), and on every 10th star
//     flag reward_milestone_pending + create an in-app star_milestone notification
//   • on incorrect: no star, no money — just the locked submission + feedback
//
// child_stats is a rollup updated incrementally per grading event (not recomputed
// from scratch), exactly as the doc specifies. The star ledger row, the rollup
// update, and the milestone notification are applied atomically by the
// grade_and_reward Postgres RPC (migration 003), so a partial write can never
// corrupt money owed.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Locale, SubmissionStatus } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'
import { gradeAnswer, type GradeResult } from './claude'

// A correct bonus answer pays 3× shekel_per_star (docs → Grading).
const BONUS_MULTIPLIER = 3

export interface GradeSubmissionResult {
  status: Extract<SubmissionStatus, 'correct' | 'incorrect'>
  isCorrect: boolean
  feedbackMessage: string
  /** The answer key in the child's locale — shown on the result screen. */
  correctAnswer: string
  /** Money awarded for this answer (0 if incorrect; 3× on a correct bonus). */
  awardedNis: number
  /** True when this correct answer crossed a 10-star milestone. */
  milestoneReached: boolean
}

/** Thrown when the submission was already graded (locked — one attempt per day). */
export class AlreadyGradedError extends Error {
  constructor(
    public readonly status: SubmissionStatus,
    submissionId: string
  ) {
    super(`Submission ${submissionId} is already graded (${status})`)
    this.name = 'AlreadyGradedError'
  }
}

/** Already-fetched, already-normalized submission data an MC grade needs —
 *  the caller (app/api/grade/route.ts) fetches this once, as part of the same
 *  query it uses for the MC-vs-legacy dispatch decision, instead of this
 *  function re-fetching it from scratch (see the latency-fix comment at that
 *  call site). */
export interface MCSubmissionBundle {
  id: string
  status: SubmissionStatus
  child_id: string
  question_id: string
  submitted_at: string | null
  dailySet: { date: string; question_ids: string[] }
  question: {
    option1_he: string | null
    option2_he: string | null
    option3_he: string | null
    option1_en: string | null
    option2_en: string | null
    option3_en: string | null
    correct_index: number | null
  }
  child: { locale: Locale; shekel_per_star: number }
}

/**
 * Multiple-choice pivot (migration 013) — grade a submission whose question has
 * fixed options, fully deterministic: compare the child's chosen index to the
 * question's correct_index server-side. NO Claude call — the whole point of
 * this path is that MC questions never touch the AI grader, unlike gradeSubmission
 * above (which stays exactly as-is for any remaining free-text question).
 *
 * Latency: this used to (1) re-fetch the submission from scratch — redundant,
 * the caller already fetched everything needed to dispatch here — then (2)
 * write answer_text+status='grading', THEN (3) call apply_grading_result as a
 * separate awaited step. (2) and (3) were sequential only because both used
 * to touch `status` (a real write-order dependency); now (2) leaves `status`
 * alone entirely — apply_grading_result already accepts a submission that's
 * still 'unanswered' (see migration 006), so there was never an actual need
 * for an intermediate 'grading' state on a path with no waiting to reflect —
 * so (2) and (3) now run concurrently via Promise.all, safe because they
 * write disjoint columns (no lost-update risk). Net: 3 sequential DB round
 * trips (fetch, write, RPC) down to 1 (write ‖ RPC), on top of whatever the
 * caller's own now-single dispatch fetch cost.
 */
export async function gradeMultipleChoiceSubmission(input: {
  submission: MCSubmissionBundle
  selectedIndex: number
  db?: SupabaseClient<Database>
}): Promise<GradeSubmissionResult> {
  const db = input.db ?? createServiceClient()
  const { submission, selectedIndex } = input

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 2) {
    throw new Error(`selectedIndex must be 0, 1, or 2 — got ${selectedIndex}`)
  }

  // Locked once graded — one attempt per question per day, no retry.
  if (submission.status === 'correct' || submission.status === 'incorrect') {
    throw new AlreadyGradedError(submission.status, submission.id)
  }

  const { question, child, dailySet } = submission

  if (question.correct_index === null) {
    // Defensive: this endpoint was called for a legacy free-text question.
    throw new Error(`Question ${submission.question_id} has no correct_index — not multiple-choice`)
  }

  const locale = child.locale
  const options =
    locale === 'he'
      ? [question.option1_he!, question.option2_he!, question.option3_he!]
      : [question.option1_en!, question.option2_en!, question.option3_en!]
  const selectedText = options[selectedIndex]
  const correctText = options[question.correct_index]

  const isBonus = !dailySet.question_ids.includes(submission.question_id)
  const awardNis = Number(child.shekel_per_star) * (isBonus ? BONUS_MULTIPLIER : 1)

  const status: 'correct' | 'incorrect' =
    selectedIndex === question.correct_index ? 'correct' : 'incorrect'

  // Store the chosen option's own text as answer_text — same column, same
  // read-only-review UI as the free-text path (ReadOnlyResult's "התשובה שלך").
  // Deliberately does NOT touch `status` (see the latency comment above) —
  // apply_grading_result below transitions it straight from 'unanswered'.
  const [, { data: milestone, error: rpcErr }] = await Promise.all([
    db
      .from('submissions')
      .update({
        answer_text: selectedText,
        submitted_at: submission.submitted_at ?? new Date().toISOString(),
      })
      .eq('id', submission.id),
    // No AI feedback for a deterministic MC grade — the immediate
    // correct/incorrect + reward is the whole signal; there's no ambiguous
    // answer to explain.
    db.rpc('apply_grading_result', {
      p_submission_id: submission.id,
      p_child_id: submission.child_id,
      p_status: status,
      p_feedback: '',
      p_amount_nis: awardNis,
      p_play_date: dailySet.date,
      p_graded_by: 'mc_deterministic',
    }),
  ])
  if (rpcErr) throw rpcErr
  const milestoneReached = status === 'correct' ? (milestone ?? false) : false

  return {
    status,
    isCorrect: status === 'correct',
    feedbackMessage: '',
    correctAnswer: correctText,
    awardedNis: status === 'correct' ? awardNis : 0,
    milestoneReached,
  }
}

export async function gradeSubmission(input: {
  submissionId: string
  answerText: string
  db?: SupabaseClient<Database>
}): Promise<GradeSubmissionResult> {
  const db = input.db ?? createServiceClient()
  const { submissionId, answerText } = input

  // 1. Load the submission and its question + child + owning daily set.
  const { data: submission, error: subErr } = await db
    .from('submissions')
    .select(
      `id, status, child_id, question_id, submitted_at,
       daily_sets!inner ( date, question_ids ),
       questions!inner ( text_he, text_en, answer_key_he, answer_key_en, category, difficulty_tier ),
       children!inner ( locale, shekel_per_star )`
    )
    .eq('id', submissionId)
    .single()

  if (subErr) throw subErr

  // 2. Locked once graded — one attempt per question per day, no retry.
  if (submission.status === 'correct' || submission.status === 'incorrect') {
    throw new AlreadyGradedError(submission.status, submissionId)
  }

  // Supabase types embedded to-one relations as arrays; normalize.
  const question = Array.isArray(submission.questions)
    ? submission.questions[0]
    : submission.questions
  const child = Array.isArray(submission.children)
    ? submission.children[0]
    : submission.children
  const dailySet = Array.isArray(submission.daily_sets)
    ? submission.daily_sets[0]
    : submission.daily_sets

  // Defensive: this path is legacy-free-text-only (the multiple-choice pivot,
  // migration 013, dispatches by correct_index in /api/grade before ever
  // reaching here) — difficulty_tier/answer_key_* are nullable at the DB level
  // now (NOT NULL only for a legacy row, per questions_legacy_complete_check),
  // so a genuinely multiple-choice question landing here would mean the
  // dispatch logic was bypassed. Fail loudly rather than call Claude with a
  // missing answer key.
  if (question.difficulty_tier === null || question.answer_key_he === null || question.answer_key_en === null) {
    throw new Error(
      `Question ${submission.question_id} is missing free-text fields (difficulty_tier/answer_key) — likely a multiple-choice question routed to the wrong grader`
    )
  }

  const locale = child.locale
  const answerKey = locale === 'he' ? question.answer_key_he : question.answer_key_en
  const questionText = locale === 'he' ? question.text_he : question.text_en

  // The bonus question is the one not among the daily set's 5 regular ids; it
  // pays 3× shekel_per_star (docs → Grading). Everything else pays 1×.
  const isBonus = !dailySet.question_ids.includes(submission.question_id)
  const awardNis = Number(child.shekel_per_star) * (isBonus ? BONUS_MULTIPLIER : 1)

  // 3. Record the answer and move to `grading`.
  await db
    .from('submissions')
    .update({
      answer_text: answerText,
      submitted_at: submission.submitted_at ?? new Date().toISOString(),
      status: 'grading',
    })
    .eq('id', submissionId)

  // 4. Grade with Claude.
  const graded: GradeResult = await gradeAnswer({
    question: {
      id: submission.question_id,
      category: question.category,
      difficulty_tier: question.difficulty_tier,
      text: questionText,
      answerKey,
    },
    answerText,
    locale,
  })

  const status: 'correct' | 'incorrect' = graded.isCorrect
    ? 'correct'
    : 'incorrect'

  // 5. Persist the verdict AND apply the reward in one atomic, idempotent
  // transaction (migration 006 apply_grading_result): it marks the submission,
  // writes the feedback, and — on correct — inserts the star ledger row, rolls up
  // child_stats, and creates any milestone notification. Folding these together
  // means a reward failure can never leave a locked-correct submission with no
  // money (the failure class that caused the earlier bug).
  const { data: milestone, error: rpcErr } = await db.rpc(
    'apply_grading_result',
    {
      p_submission_id: submissionId,
      p_child_id: submission.child_id,
      p_status: status,
      p_feedback: graded.feedbackMessage,
      p_amount_nis: awardNis,
      p_play_date: dailySet.date,
    }
  )
  if (rpcErr) throw rpcErr
  const milestoneReached = graded.isCorrect ? (milestone ?? false) : false

  return {
    status,
    isCorrect: graded.isCorrect,
    feedbackMessage: graded.feedbackMessage,
    correctAnswer: answerKey,
    awardedNis: graded.isCorrect ? awardNis : 0,
    milestoneReached,
  }
}
