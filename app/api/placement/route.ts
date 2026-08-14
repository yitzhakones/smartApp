import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { claudePlacementGrader } from '@/lib/grading/claude'
import {
  PlacementAlreadyCompletedError,
  startPlacement,
  submitPlacementAnswer,
} from '@/lib/placement/service'
import type { PlacementSession } from '@/lib/placement/session'

// Placement quiz orchestration. Server-side (service role + Claude), token-scoped.
// The client holds the opaque PlacementSession between steps and posts it back;
// the session carries no answer keys (those are re-fetched here at grade time),
// so it's safe to round-trip. Node runtime (Anthropic SDK).
export const runtime = 'nodejs'

interface Body {
  action?: 'start' | 'answer'
  accessToken?: string
  session?: PlacementSession
  answerText?: string
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, accessToken, session, answerText } = body
  if (!accessToken || (action !== 'start' && action !== 'answer')) {
    return NextResponse.json(
      { error: 'accessToken and a valid action are required' },
      { status: 400 }
    )
  }

  const db = createServiceClient()
  const { data: child } = await db
    .from('children')
    .select('id')
    .eq('access_token', accessToken)
    .maybeSingle()
  if (!child) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
  }

  try {
    if (action === 'start') {
      const step = await startPlacement(child.id, { db })
      return NextResponse.json(step)
    }

    // action === 'answer'
    if (!session || typeof answerText !== 'string') {
      return NextResponse.json(
        { error: 'session and answerText are required' },
        { status: 400 }
      )
    }
    // The session must belong to this child — never grade across children.
    if (session.childId !== child.id) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }
    const step = await submitPlacementAnswer(session, answerText, {
      db,
      grader: claudePlacementGrader,
    })
    return NextResponse.json(step)
  } catch (err) {
    if (err instanceof PlacementAlreadyCompletedError) {
      // Levels already set — nothing to place; the client should go to the game.
      return NextResponse.json({ alreadyDone: true })
    }
    console.error('[placement] failed:', err)
    return NextResponse.json({ error: 'Placement failed' }, { status: 500 })
  }
}
