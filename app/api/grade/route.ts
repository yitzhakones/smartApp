import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  AlreadyGradedError,
  gradeMultipleChoiceSubmission,
  gradeSubmission,
} from '@/lib/grading/service'

// Grading calls Claude and writes rewards — always server-side (protects the API
// key, prevents tampering). Node runtime (the Anthropic SDK is not edge-safe).
export const runtime = 'nodejs'

interface GradeRequestBody {
  accessToken?: string
  submissionId?: string
  answerText?: string
  // Multiple-choice pivot (migration 013) — the child's chosen option (0-2).
  selectedIndex?: number
}

export async function POST(request: NextRequest) {
  let body: GradeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { accessToken, submissionId, answerText, selectedIndex } = body
  const hasAnswerText = typeof answerText === 'string'
  const hasSelectedIndex = typeof selectedIndex === 'number'
  if (!accessToken || !submissionId || (!hasAnswerText && !hasSelectedIndex)) {
    return NextResponse.json(
      {
        error:
          'accessToken and submissionId are required, plus either answerText or selectedIndex',
      },
      { status: 400 }
    )
  }

  const db = createServiceClient()

  // Children have no auth session — the unguessable access_token IS their
  // identity. Resolve it to a child, then confirm the submission belongs to that
  // child, so one child can never grade another's submission.
  const { data: child } = await db
    .from('children')
    .select('id')
    .eq('access_token', accessToken)
    .maybeSingle()
  if (!child) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
  }

  // Server decides which grading path a submission takes from the question's
  // own correct_index — never trusts which field the client happened to send,
  // so a mismatched/forged payload can't force the wrong grader to run.
  //
  // Latency fix: this query used to fetch only `correct_index` (just enough
  // for the dispatch decision), and gradeMultipleChoiceSubmission then
  // re-fetched the submission from scratch with the full field set it
  // actually needs — a second, wholly redundant round-trip on a path that's
  // supposed to feel instant (no Claude call at all). This query now fetches
  // the MC superset up front; the MC branch below passes it straight through
  // instead of re-querying. (Left the legacy/Claude branch's own internal
  // fetch alone — an extra ~100ms round trip is noise next to Claude's own
  // 1-2s, not worth touching a stable path for this.)
  const { data: submission } = await db
    .from('submissions')
    .select(
      `id, child_id, status, ai_feedback_text, question_id, submitted_at,
       daily_sets!inner ( date, question_ids ),
       questions!inner ( option1_he, option2_he, option3_he, option1_en, option2_en, option3_en, correct_index ),
       children!inner ( locale, shekel_per_star )`
    )
    .eq('id', submissionId)
    .maybeSingle()
  if (!submission || submission.child_id !== child.id) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }
  // Supabase types embedded to-one relations as arrays; normalize once here
  // so both this dispatch check and the MC grader (which now takes this
  // already-normalized shape instead of re-fetching) share the same values.
  const question = Array.isArray(submission.questions) ? submission.questions[0] : submission.questions
  const dailySet = Array.isArray(submission.daily_sets) ? submission.daily_sets[0] : submission.daily_sets
  const childRow = Array.isArray(submission.children) ? submission.children[0] : submission.children
  const isMultipleChoice = question.correct_index !== null

  if (isMultipleChoice && !hasSelectedIndex) {
    return NextResponse.json(
      { error: 'This question is multiple-choice — selectedIndex is required' },
      { status: 400 }
    )
  }
  if (!isMultipleChoice && !hasAnswerText) {
    return NextResponse.json(
      { error: 'This question is free-text — answerText is required' },
      { status: 400 }
    )
  }

  try {
    const result = isMultipleChoice
      ? await gradeMultipleChoiceSubmission({
          submission: {
            id: submission.id,
            status: submission.status,
            child_id: submission.child_id,
            question_id: submission.question_id,
            submitted_at: submission.submitted_at,
            dailySet,
            question,
            child: childRow,
          },
          selectedIndex: selectedIndex as number,
          db,
        })
      : await gradeSubmission({ submissionId, answerText: answerText as string, db })
    return NextResponse.json(result)
  } catch (err) {
    // Locked — return the existing verdict instead of erroring (one attempt/day).
    if (err instanceof AlreadyGradedError) {
      return NextResponse.json(
        {
          status: err.status,
          isCorrect: err.status === 'correct',
          feedbackMessage: submission.ai_feedback_text ?? '',
          correctAnswer: '',
          awardedNis: 0,
          milestoneReached: false,
          alreadyGraded: true,
        },
        { status: 200 }
      )
    }
    console.error('Grading failed', err)
    return NextResponse.json({ error: 'Grading failed' }, { status: 500 })
  }
}
