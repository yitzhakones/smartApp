import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AlreadyGradedError, gradeSubmission } from '@/lib/grading/service'

// Grading calls Claude and writes rewards — always server-side (protects the API
// key, prevents tampering). Node runtime (the Anthropic SDK is not edge-safe).
export const runtime = 'nodejs'

interface GradeRequestBody {
  accessToken?: string
  submissionId?: string
  answerText?: string
}

export async function POST(request: NextRequest) {
  let body: GradeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { accessToken, submissionId, answerText } = body
  if (!accessToken || !submissionId || typeof answerText !== 'string') {
    return NextResponse.json(
      { error: 'accessToken, submissionId and answerText are required' },
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

  const { data: submission } = await db
    .from('submissions')
    .select('id, child_id, status, ai_feedback_text')
    .eq('id', submissionId)
    .maybeSingle()
  if (!submission || submission.child_id !== child.id) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  try {
    const result = await gradeSubmission({ submissionId, answerText, db })
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
