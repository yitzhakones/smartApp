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
import type { Database, SubmissionStatus } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'
import { gradeAnswer, type GradeResult } from './claude'

export interface GradeSubmissionResult {
  status: Extract<SubmissionStatus, 'correct' | 'incorrect'>
  isCorrect: boolean
  feedbackMessage: string
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
       daily_sets!inner ( date ),
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

  const locale = child.locale
  const answerKey = locale === 'he' ? question.answer_key_he : question.answer_key_en
  const questionText = locale === 'he' ? question.text_he : question.text_en

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

  // 5. Persist the verdict (locks the submission).
  await db
    .from('submissions')
    .update({
      status,
      graded_at: new Date().toISOString(),
      graded_by: 'claude_api',
      ai_feedback_text: graded.feedbackMessage,
    })
    .eq('id', submissionId)

  let milestoneReached = false
  if (graded.isCorrect) {
    // Star ledger row + child_stats rollup + milestone notification, all in one
    // atomic transaction (see migration 003 grade_and_reward) so a partial write
    // can never corrupt money owed.
    const { data: milestone, error: rewardErr } = await db.rpc(
      'grade_and_reward',
      {
        p_child_id: submission.child_id,
        p_shekel_per_star: child.shekel_per_star,
        p_play_date: dailySet.date,
      }
    )
    if (rewardErr) throw rewardErr
    milestoneReached = milestone ?? false
  }

  return {
    status,
    isCorrect: graded.isCorrect,
    feedbackMessage: graded.feedbackMessage,
    milestoneReached,
  }
}
