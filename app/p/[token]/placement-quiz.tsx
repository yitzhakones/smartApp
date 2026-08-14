'use client'

// Placement quiz — runs once at child setup to calibrate category_levels via the
// adaptive 2-question ladder (lib/placement). Per the doc this is DELIBERATELY
// neutral: no confetti, no color flash, no correct/incorrect indicator, and no
// score or number ever shown. Just calm questions, a "תודה! הבאה" beat between
// them, and "מעולה, מתחילים!" at the end. All grading happens server-side via
// /api/placement; this screen never learns whether an answer was right.

import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import type { PlacementSession } from '@/lib/placement/session'

const BASE = '#0B0B0F'
const ACCENT = '#C6FF3D'
const RUBIK = 'var(--font-rubik), system-ui'
const ASSISTANT = 'var(--font-assistant), system-ui'
const BG = 'radial-gradient(circle at 30% 10%, #241A4E 0%, #0B0B0F 60%)'

interface PresentedQuestion {
  id: string
  category: string
  text: string
}

type Phase = 'loading' | 'question' | 'submitting' | 'transition' | 'done' | 'error'

export function PlacementQuiz({
  accessToken,
  childName,
}: {
  accessToken: string
  childName: string
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [session, setSession] = useState<PlacementSession | null>(null)
  const [question, setQuestion] = useState<PresentedQuestion | null>(null)
  const [answer, setAnswer] = useState('')
  const [transitionMsg, setTransitionMsg] = useState('')
  const [doneMsg, setDoneMsg] = useState('מעולה, מתחילים!')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/placement', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'start', accessToken }),
        })
        const step = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(step?.error ?? 'start failed')
        if (step.alreadyDone) {
          window.location.reload() // levels already set → go to the game
          return
        }
        if (step.done) {
          setDoneMsg(step.message ?? 'מעולה, מתחילים!')
          setPhase('done')
          return
        }
        setSession(step.session)
        setQuestion(step.question)
        setPhase('question')
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [accessToken])

  async function submit() {
    if (!answer.trim() || !session) return
    setPhase('submitting')
    try {
      const res = await fetch('/api/placement', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'answer', accessToken, session, answerText: answer }),
      })
      const step = await res.json()
      if (!res.ok) throw new Error(step?.error ?? 'answer failed')

      setSession(step.session)
      setAnswer('')

      if (step.done) {
        setDoneMsg(step.message ?? 'מעולה, מתחילים!')
        setPhase('done')
        return
      }

      // Neutral beat between questions ("תודה! הבאה"), then the next question.
      setTransitionMsg(step.message ?? 'תודה! הבאה')
      setPhase('transition')
      timer.current = setTimeout(() => {
        setQuestion(step.question)
        setPhase('question')
      }, 850)
    } catch {
      setPhase('error')
    }
  }

  const wrap = 'flex flex-col items-center justify-center gap-5 px-8'
  const shell = {
    background: BG,
    minHeight: '100vh',
    maxWidth: 420,
    margin: '0 auto',
    fontFamily: RUBIK,
  } as const

  if (phase === 'loading') {
    return (
      <div dir="rtl" style={shell} className={wrap}>
        <Dots />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div dir="rtl" style={shell} className={wrap}>
        <p style={{ color: 'white', fontFamily: RUBIK }} className="text-xl font-black text-center">
          משהו השתבש
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-full font-black text-base"
          style={{ background: ACCENT, color: BASE }}
        >
          לנסות שוב
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div dir="rtl" style={shell} className={wrap}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${ACCENT}, #7CFF7A)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={32} color={BASE} />
        </div>
        <p style={{ color: 'white', fontFamily: RUBIK }} className="text-3xl font-black text-center">
          {doneMsg}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-10 py-4 rounded-full font-black text-lg"
          style={{ background: ACCENT, color: BASE }}
        >
          בואו נתחיל
        </button>
      </div>
    )
  }

  if (phase === 'transition') {
    return (
      <div dir="rtl" style={shell} className={wrap}>
        <p style={{ color: 'white', fontFamily: RUBIK }} className="text-3xl font-black text-center">
          {transitionMsg}
        </p>
      </div>
    )
  }

  // phase === 'question' | 'submitting'
  return (
    <div
      dir="rtl"
      style={{ ...shell, position: 'relative', overflow: 'hidden' }}
      className="flex flex-col"
    >
      <div className="px-6 pt-8 text-center">
        <p style={{ color: '#8A8F9E', fontFamily: ASSISTANT }} className="text-sm font-bold">
          היי {childName} — כמה שאלות קצרות להיכרות
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <p
          style={{ color: 'white', fontFamily: RUBIK }}
          className="text-4xl font-black leading-snug mb-8 text-center"
        >
          {question?.text ?? ''}
        </p>

        {phase === 'submitting' ? (
          <Dots />
        ) : (
          <div
            className="p-4 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 30,
            }}
          >
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              placeholder="כתבי כאן..."
              className="flex-1 bg-transparent outline-none text-white px-2 text-xl font-bold"
              style={{ fontFamily: ASSISTANT }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
            <button
              onClick={submit}
              disabled={!answer.trim()}
              className="rounded-full p-4 disabled:opacity-30"
              style={{ background: ACCENT }}
            >
              <Send size={22} color={BASE} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Dots() {
  return (
    <div className="flex justify-center">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-bounce"
            style={{
              animationDelay: `${i * 0.15}s`,
              width: 14,
              height: 14,
              borderRadius: 99,
              background: ACCENT,
            }}
          />
        ))}
      </div>
    </div>
  )
}
