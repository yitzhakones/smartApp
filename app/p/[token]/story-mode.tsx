'use client'

// Child story-mode screens. Layout, colors, animations, and copy are the locked
// design from story-mode-mockup.jsx — do not redesign. Wired to real data:
//   • questions come from today's daily_set (props), not a hardcoded array
//   • submit() calls the real /api/grade endpoint (no Math.random)
//   • earnedToday / dashboard stats reflect real child_stats + shekel_per_star
// Skip / navigation / bonus-unlock logic is preserved verbatim from the mockup.

import { useState } from 'react'
import {
  Check,
  X,
  Send,
  Zap,
  BarChart3,
  Flame,
  ChevronRight,
  ArrowLeftCircle,
} from 'lucide-react'
import type { Category, SubmissionStatus } from '@/types/database'

const ACCENT = '#C6FF3D' // ליים חשמלי - נכון
const ACCENT2 = '#FF3DBB' // פוקסיה - בונוס
const AMBER = '#FFB63D' // ענבר - לא נכון
const BASE = '#0B0B0F'

// Keyed by the real question categories (+ bonus). israeli_history keeps the
// mockup's "history" styling; general_knowledge is the one category the locked
// mockup didn't cover, styled here in the same visual language.
const CATEGORY_BG: Record<string, string> = {
  math: 'radial-gradient(circle at 20% 15%, #6C4CFF 0%, #2A1E6E 35%, #0B0B0F 75%)',
  science:
    'radial-gradient(circle at 75% 20%, #00E0C6 0%, #0E4F4A 35%, #0B0B0F 75%)',
  israeli_history:
    'radial-gradient(circle at 25% 80%, #FF3DA1 0%, #5E1A3D 35%, #0B0B0F 75%)',
  general_knowledge:
    'radial-gradient(circle at 70% 75%, #FF8A3D 0%, #6E3A1A 35%, #0B0B0F 75%)',
  bonus: 'conic-gradient(from 90deg at 50% 50%, #FFB63D, #241A00, #FF3DBB, #0B0B0F)',
}
const CATEGORY_LABEL: Record<string, string> = {
  math: 'מתמטיקה',
  science: 'מדעים',
  israeli_history: 'היסטוריה של ישראל',
  general_knowledge: 'ידע כללי',
  bonus: 'שאלת בונוס',
}
const CATEGORY_ACCENT: Record<string, string> = {
  math: '#B7A6FF',
  science: '#3DFFD6',
  israeli_history: '#FF9DCB',
  general_knowledge: '#FFC48A',
  bonus: AMBER,
}

const CONFETTI_COLORS = [ACCENT, ACCENT2, AMBER, '#3DFFD6', '#B7A6FF', '#ffffff']
const CONFETTI = Array.from({ length: 16 }).map((_, i) => ({
  left: (i * 6.3) % 100,
  delay: (i % 6) * 0.08,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 8 + (i % 4) * 4,
  rotate: i * 37,
}))

function Blob({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(55px)',
        opacity: 0.55,
        ...style,
      }}
    />
  )
}

const KEYFRAMES = `
  @keyframes popIn { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(340px) rotate(400deg); opacity: 0; } }
  @keyframes flash { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
  @keyframes pulseRing { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); } 50% { box-shadow: 0 0 0 4px rgba(255,255,255,0); } }
`
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;900&family=Assistant:wght@400;700&display=swap');`

export interface GameQuestion {
  submissionId: string
  category: Category
  text: string
  status: SubmissionStatus
  isBonus: boolean
}

type UIStatus = 'locked' | 'open' | 'skipped' | 'correct' | 'incorrect'

export interface StoryModeProps {
  childName: string
  accessToken: string
  shekelPerStar: number
  questions: GameQuestion[] // 5 regular + 1 bonus
  stats: { totalStars: number; totalMoney: number; streak: number }
  parentMessage: string | null
}

function displayKey(q: GameQuestion): string {
  return q.isBonus ? 'bonus' : q.category
}

export function StoryMode({
  childName,
  accessToken,
  shekelPerStar,
  questions,
  stats,
  parentMessage,
}: StoryModeProps) {
  const [screen, setScreen] = useState<'intro' | 'game' | 'dashboard'>('intro')

  // Restore per-question status from real submissions; the bonus (index 5) stays
  // locked until the first five are actually resolved.
  const [statuses, setStatuses] = useState<UIStatus[]>(() =>
    questions.map((q, i) => {
      if (q.status === 'correct') return 'correct'
      if (q.status === 'incorrect') return 'incorrect'
      if (i === 5) {
        const first5Resolved = questions
          .slice(0, 5)
          .every((x) => x.status === 'correct' || x.status === 'incorrect')
        return first5Resolved ? 'open' : 'locked'
      }
      return 'open'
    })
  )
  const [queue, setQueue] = useState<number[]>(() => {
    const initial: number[] = []
    for (let i = 0; i < 5; i++) {
      const q = questions[i]
      if (q.status !== 'correct' && q.status !== 'incorrect') initial.push(i)
    }
    const bonus = questions[5]
    const first5Resolved = questions
      .slice(0, 5)
      .every((x) => x.status === 'correct' || x.status === 'incorrect')
    if (
      first5Resolved &&
      bonus &&
      bonus.status !== 'correct' &&
      bonus.status !== 'incorrect'
    )
      initial.push(5)
    return initial
  })
  const [phase, setPhase] = useState<'question' | 'grading' | 'result'>(
    'question'
  )
  const [answer, setAnswer] = useState('')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [resultAnswer, setResultAnswer] = useState('')
  const [resultFeedback, setResultFeedback] = useState('')
  const [resultAward, setResultAward] = useState(0)
  const [earnedToday, setEarnedToday] = useState(() =>
    questions.reduce(
      (sum, q) =>
        q.status === 'correct'
          ? sum + shekelPerStar * (q.isBonus ? 3 : 1)
          : sum,
      0
    )
  )
  const [pulseEarned, setPulseEarned] = useState(false)

  const current = queue[0]
  const q = current !== undefined ? questions[current] : null
  const isBonus = !!q?.isBonus
  const bg = q ? CATEGORY_BG[displayKey(q)] : CATEGORY_BG.math
  const accent = q ? CATEGORY_ACCENT[displayKey(q)] : ACCENT

  function resolveCurrent(newStatus: UIStatus) {
    setStatuses((prev) => {
      const next = [...prev]
      next[current] = newStatus
      // אם כל ה-5 הרגילות נענו בפועל (נכון/לא נכון) - פותחים בונוס
      const first5Resolved = next
        .slice(0, 5)
        .every((s) => s === 'correct' || s === 'incorrect')
      if (first5Resolved && next[5] === 'locked') next[5] = 'open'
      return next
    })
    setQueue((prev) => {
      const rest = prev.filter((i) => i !== current)
      const first5Resolved = statuses
        .slice(0, 5)
        .every((s, i) =>
          i === current ? true : s === 'correct' || s === 'incorrect'
        )
      if (first5Resolved && statuses[5] === 'locked' && current < 5)
        return [...rest, 5]
      return rest
    })
  }

  async function submit() {
    if (!answer.trim() || !q) return
    const submissionId = q.submissionId
    setPhase('grading')
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken, submissionId, answerText: answer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'grade failed')

      const correct = !!data.isCorrect
      const award = Number(data.awardedNis ?? 0)
      setLastCorrect(correct)
      setResultAnswer(data.correctAnswer ?? '')
      setResultFeedback(data.feedbackMessage ?? '')
      setResultAward(award)
      setPhase('result')
      resolveCurrent(correct ? 'correct' : 'incorrect')
      if (correct) {
        setEarnedToday((v) => v + award)
        setPulseEarned(true)
        setTimeout(() => setPulseEarned(false), 600)
      }
    } catch (err) {
      console.error('Grading request failed', err)
      setPhase('question') // let the child try again
    }
  }

  function skip() {
    setStatuses((prev) => {
      const next = [...prev]
      if (next[current] === 'open') next[current] = 'skipped'
      return next
    })
    setQueue((prev) => {
      const [, ...rest] = prev
      return [...rest, current]
    })
    setAnswer('')
  }

  function jumpTo(i: number) {
    if (statuses[i] !== 'open' && statuses[i] !== 'skipped') return
    setQueue((prev) => [i, ...prev.filter((x) => x !== i)])
    setAnswer('')
    setPhase('question')
  }

  function advanceAfterResult() {
    if (phase !== 'result') return
    setAnswer('')
    setPhase('question')
    setLastCorrect(null)
  }

  function handleScreenTap() {
    if (phase !== 'result') return
    advanceAfterResult()
  }

  const allDone = queue.length === 0

  // ---------- מסך בית (כניסה לאפליקציה) ----------
  if (screen === 'intro') {
    const remaining = statuses.filter((s) => s === 'open').length
    return (
      <div
        dir="rtl"
        style={{
          background: BASE,
          minHeight: '100vh',
          maxWidth: 420,
          margin: '0 auto',
          fontFamily: "'Rubik', system-ui",
        }}
        className="flex flex-col items-center justify-center gap-5 px-8"
      >
        <style>{`${FONTS}${KEYFRAMES}`}</style>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={34} color={BASE} fill={BASE} />
        </div>
        <p
          style={{ color: 'white', fontFamily: 'Rubik' }}
          className="text-2xl font-black text-center"
        >
          היי {childName} 👋
        </p>
        <p
          style={{ color: '#B7BCC8', fontFamily: 'Assistant' }}
          className="text-base text-center"
        >
          {remaining} שאלות מחכות לך היום + בונוס מיוחד בסוף
        </p>
        <button
          onClick={() => setScreen('game')}
          className="px-10 py-4 rounded-full font-black text-lg"
          style={{ background: ACCENT, color: BASE }}
        >
          בואי נתחיל
        </button>
        <button
          onClick={() => setScreen('dashboard')}
          className="flex items-center gap-1 font-bold text-sm"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          <BarChart3 size={15} /> לצפייה בסטטוס שלי קודם
        </button>
      </div>
    )
  }

  // ---------- דשבורד סטטוס ----------
  if (screen === 'dashboard') {
    return (
      <ChildDashboard
        onBack={() => setScreen('game')}
        earnedToday={earnedToday}
        childName={childName}
        stats={stats}
        parentMessage={parentMessage}
      />
    )
  }

  // ---------- מסך "סיימת להיום" ----------
  if (allDone) {
    return (
      <div
        dir="rtl"
        style={{
          background: BASE,
          minHeight: '100vh',
          maxWidth: 420,
          margin: '0 auto',
          fontFamily: "'Rubik', system-ui",
        }}
        className="flex flex-col items-center justify-center gap-4 px-6"
      >
        <style>{`${FONTS}${KEYFRAMES}`}</style>
        <Zap size={52} color={ACCENT} fill={ACCENT} />
        <p
          style={{ color: 'white', fontFamily: 'Rubik' }}
          className="text-3xl font-black text-center"
        >
          סיימת את היום! 🔥
        </p>
        <p
          style={{ color: '#B7BCC8', fontFamily: 'Assistant' }}
          className="text-base text-center"
        >
          מחר יחכו לך 5 שאלות חדשות + בונוס נוסף
        </p>
        <button
          onClick={() => setScreen('dashboard')}
          className="mt-2 px-8 py-3.5 rounded-full font-black text-base flex items-center gap-1.5"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
        >
          הסטטוס שלי <ChevronRight size={18} />
        </button>
      </div>
    )
  }

  // ---------- מסך המשחק ----------
  return (
    <div
      dir="rtl"
      onClick={handleScreenTap}
      style={{
        background: bg,
        minHeight: '100vh',
        maxWidth: 420,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Rubik', system-ui",
      }}
    >
      <style>{`${FONTS}${KEYFRAMES}`}</style>

      {phase === 'result' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: lastCorrect ? ACCENT : AMBER,
            animation: 'flash 0.5s ease-out forwards',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        />
      )}

      <Blob style={{ width: 260, height: 260, background: accent, top: -70, left: -70 }} />
      <Blob style={{ width: 220, height: 220, background: accent, bottom: 60, right: -60 }} />
      <Blob
        style={{ width: 140, height: 140, background: 'white', top: '40%', left: '60%', opacity: 0.12 }}
      />

      {/* פס התקדמות - כעת ניווט לחיץ */}
      <div className="flex items-center gap-2 px-3 pt-4 relative z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setScreen('dashboard')
          }}
          className="flex items-center justify-center shrink-0"
          style={{ width: 30, height: 30, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}
        >
          <BarChart3 size={15} color="white" />
        </button>

        {[0, 1, 2, 3, 4].map((i) => {
          const s = statuses[i]
          const isCurrent = i === current
          const fillColor =
            s === 'correct' ? ACCENT : s === 'incorrect' ? AMBER : 'transparent'
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                jumpTo(i)
              }}
              className="flex-1 h-2.5 rounded-full overflow-hidden relative"
              style={{
                background: 'rgba(255,255,255,0.22)',
                border: s === 'skipped' ? '1.5px dashed rgba(255,255,255,0.75)' : 'none',
                animation: isCurrent ? 'pulseRing 1.6s infinite' : 'none',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: fillColor === 'transparent' ? '0%' : '100%',
                  background: fillColor,
                  borderRadius: 99,
                }}
              />
            </button>
          )
        })}

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (statuses[5] !== 'locked') jumpTo(5)
          }}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 26,
            height: 26,
            transform: 'rotate(45deg)',
            background:
              statuses[5] === 'correct'
                ? ACCENT
                : statuses[5] === 'incorrect'
                  ? AMBER
                  : statuses[5] === 'locked'
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(255,255,255,0.5)',
            border: statuses[5] === 'skipped' ? '1.5px dashed white' : 'none',
            boxShadow:
              statuses[5] !== 'locked' &&
              statuses[5] !== 'correct' &&
              statuses[5] !== 'incorrect'
                ? `0 0 12px ${ACCENT2}`
                : 'none',
            borderRadius: 5,
          }}
        />
      </div>

      <div className="relative z-10 px-5 pt-6 flex items-center justify-between">
        <span
          className="inline-block text-sm font-black px-4 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.18)', color: 'white', backdropFilter: 'blur(4px)' }}
        >
          {q ? CATEGORY_LABEL[displayKey(q)] : ''}
        </span>
        <span
          className="flex items-center gap-1.5 font-black px-4 py-1.5 rounded-full text-base"
          style={{
            background: ACCENT,
            color: BASE,
            animation: pulseEarned ? 'popIn 0.5s cubic-bezier(.34,1.56,.64,1)' : 'none',
          }}
        >
          ₪{earnedToday} היום
        </span>
      </div>

      <div className="relative z-10 flex flex-col justify-center" style={{ minHeight: '58vh' }}>
        <div className="px-6">
          {phase !== 'result' && q && (
            <p
              style={{ color: 'white', fontFamily: 'Rubik' }}
              className="text-4xl font-black leading-snug mb-8 text-center"
            >
              {q.text}
            </p>
          )}

          {phase === 'question' && (
            <div className="flex flex-col gap-3">
              <div
                onClick={(e) => e.stopPropagation()}
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
                  style={{ fontFamily: 'Assistant' }}
                />
                <button
                  onClick={submit}
                  disabled={!answer.trim()}
                  className="rounded-full p-4 disabled:opacity-30"
                  style={{ background: accent }}
                >
                  <Send size={22} color={BASE} />
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  skip()
                }}
                className="self-center flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)' }}
              >
                <ArrowLeftCircle size={15} /> דלגי לעכשיו, אחזור אליה
              </button>
            </div>
          )}

          {phase === 'grading' && (
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
                      background: accent,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>
              {lastCorrect &&
                CONFETTI.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: -10,
                      left: `${c.left}%`,
                      width: c.size,
                      height: c.size * 0.4,
                      background: c.color,
                      animation: `confettiFall 1.1s ease-in ${c.delay}s forwards`,
                      transform: `rotate(${c.rotate}deg)`,
                      borderRadius: 2,
                    }}
                  />
                ))}

              <div
                className="rounded-full flex items-center justify-center mb-4"
                style={{
                  width: 96,
                  height: 96,
                  background: lastCorrect ? ACCENT : AMBER,
                  animation: lastCorrect ? 'popIn 0.5s cubic-bezier(.34,1.56,.64,1)' : 'shake 0.4s',
                  boxShadow: lastCorrect ? `0 0 40px ${ACCENT}` : `0 0 30px ${AMBER}88`,
                }}
              >
                {lastCorrect ? (
                  <Check size={52} color={BASE} strokeWidth={3.5} />
                ) : (
                  <X size={52} color={BASE} strokeWidth={3.5} />
                )}
              </div>

              <p
                style={{ color: 'white', fontFamily: 'Rubik' }}
                className="text-5xl font-black text-center mb-2"
              >
                {lastCorrect ? 'מדויק!' : 'כמעט!'}
              </p>

              {lastCorrect ? (
                <div className="rounded-full px-6 py-2 mt-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <p style={{ color: ACCENT, fontFamily: 'Rubik' }} className="text-2xl font-black">
                    {isBonus ? `+ ₪${resultAward} בונוס` : `+ ₪${resultAward}`}
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-2xl px-5 py-3 mt-1 text-center"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                >
                  <p style={{ color: '#D8DBE4', fontFamily: 'Assistant' }} className="text-base font-bold">
                    התשובה הנכונה: {resultAnswer}
                  </p>
                </div>
              )}

              {resultFeedback && (
                <p
                  style={{ color: 'white', fontFamily: 'Assistant' }}
                  className="text-sm mt-4 text-center px-3 leading-snug"
                >
                  {resultFeedback}
                </p>
              )}

              <p
                style={{ color: 'white', fontFamily: 'Assistant' }}
                className="text-sm mt-6 font-bold px-4 py-1.5 rounded-full"
              >
                <span style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: 99 }}>
                  געי במסך להמשך ←
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Trend graph data is not yet aggregated server-side; kept as the mockup's
// sample so the dashboard renders identically. Stat tiles below ARE real.
const CHILD_TREND = {
  week: {
    labels: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    values: [3, 5, 2, 6, 4, 5, 7],
    best: 'מתמטיקה',
    practiceMore: 'היסטוריה של ישראל',
  },
  month: {
    labels: ['שבוע 1', 'שבוע 2', 'שבוע 3', 'שבוע 4'],
    values: [18, 22, 19, 26],
    best: 'מתמטיקה',
    practiceMore: 'היסטוריה של ישראל',
  },
  year: {
    labels: ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול'],
    values: [40, 52, 48, 61, 58, 70, 74],
    best: 'מדעים',
    practiceMore: 'היסטוריה של ישראל',
  },
} as const

function ChildDashboard({
  onBack,
  earnedToday,
  childName,
  stats,
  parentMessage,
}: {
  onBack: () => void
  earnedToday: number
  childName: string
  stats: { totalStars: number; totalMoney: number; streak: number }
  parentMessage: string | null
}) {
  const totalStars = stats.totalStars
  const totalMoney = stats.totalMoney
  const streak = stats.streak
  const withinDecade = totalStars % 10 || (totalStars > 0 ? 10 : 0)
  const [range, setRange] = useState<'week' | 'month' | 'year'>('week')
  const trend = CHILD_TREND[range]
  const maxVal = Math.max(...trend.values)

  return (
    <div
      dir="rtl"
      style={{
        background: 'radial-gradient(circle at 15% 0%, #241A4E 0%, #0B0B0F 55%)',
        minHeight: '100vh',
        maxWidth: 420,
        margin: '0 auto',
        fontFamily: "'Rubik', system-ui",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`${FONTS}${KEYFRAMES}`}</style>
      <div
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: ACCENT2,
          filter: 'blur(70px)',
          opacity: 0.25,
          top: -60,
          left: -60,
        }}
      />

      <div className="relative z-10 px-5 pt-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 font-bold text-sm"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronRight size={18} /> חזרה למשחק
          </button>
          <p style={{ color: 'white', fontFamily: 'Rubik' }} className="text-lg font-black">
            היי {childName} 👋
          </p>
        </div>

        <div
          className="rounded-[26px] p-6 text-center mb-4"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #7CFF7A)`, borderRadius: 26 }}
        >
          <p style={{ color: BASE, fontFamily: 'Assistant' }} className="text-sm font-bold mb-1">
            סך הכל נחסך
          </p>
          <p style={{ color: BASE, fontFamily: 'Rubik' }} className="text-6xl font-black">
            ₪{totalMoney}
          </p>
          {earnedToday > 0 && (
            <p style={{ color: BASE, fontFamily: 'Assistant' }} className="text-sm font-bold mt-1">
              ₪{earnedToday} מהיום 🔥
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="rounded-3xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <p style={{ color: ACCENT2, fontFamily: 'Rubik' }} className="text-4xl font-black">
              {totalStars}
            </p>
            <p style={{ color: '#B7BCC8', fontFamily: 'Assistant' }} className="text-xs font-bold mt-1">
              כוכבים בסך הכול
            </p>
          </div>
          <div
            className="rounded-3xl p-4 text-center flex flex-col items-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center gap-1">
              <Flame size={22} color={AMBER} fill={AMBER} />
              <p style={{ color: AMBER, fontFamily: 'Rubik' }} className="text-4xl font-black">
                {streak}
              </p>
            </div>
            <p style={{ color: '#B7BCC8', fontFamily: 'Assistant' }} className="text-xs font-bold mt-1">
              ימים ברצף
            </p>
          </div>
        </div>

        <div
          className="rounded-3xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p style={{ color: 'white', fontFamily: 'Rubik' }} className="font-black text-sm">
              לתגמול הבא
            </p>
            <p style={{ color: ACCENT2, fontFamily: 'Assistant' }} className="text-xs font-bold">
              {withinDecade}/10 כוכבים
            </p>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div
              style={{
                height: '100%',
                width: `${withinDecade * 10}%`,
                background: `linear-gradient(90deg, ${ACCENT2}, ${AMBER})`,
                borderRadius: 99,
              }}
            />
          </div>
        </div>

        <div
          className="rounded-3xl p-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: 'white', fontFamily: 'Rubik' }} className="font-black text-sm">
              גרף השיפור שלך
            </p>
            <div className="flex gap-1 rounded-full p-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
              {[
                ['week', 'שבוע'],
                ['month', 'חודש'],
                ['year', 'שנה'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRange(key as 'week' | 'month' | 'year')}
                  className="px-2.5 py-1 rounded-full text-xs font-black"
                  style={{
                    background: range === key ? ACCENT : 'transparent',
                    color: range === key ? BASE : '#B7BCC8',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: 90 }}>
            {trend.values.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  style={{
                    width: '100%',
                    height: `${(v / maxVal) * 70}px`,
                    background: i === trend.values.length - 1 ? ACCENT : 'rgba(255,255,255,0.25)',
                    borderRadius: 8,
                  }}
                />
                <p
                  style={{
                    color: i === trend.values.length - 1 ? ACCENT : '#8A8F9E',
                    fontFamily: 'Assistant',
                  }}
                  className="text-[10px] font-bold"
                >
                  {trend.labels[i]}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            <p style={{ color: ACCENT, fontFamily: 'Assistant' }} className="text-xs font-black">
              🔥 הכי השתפרת ב{trend.best}!
            </p>
            <p style={{ color: '#8A8F9E', fontFamily: 'Assistant' }} className="text-xs font-bold">
              כדאי לתרגל עוד קצת ב{trend.practiceMore}
            </p>
          </div>
        </div>

        {parentMessage && (
          <div className="rounded-3xl p-4" style={{ background: `${ACCENT2}22`, border: `1px solid ${ACCENT2}55` }}>
            <p style={{ color: ACCENT2, fontFamily: 'Rubik' }} className="font-black text-sm mb-1">
              💌 הודעה מההורה
            </p>
            <p style={{ color: 'white', fontFamily: 'Assistant' }} className="text-sm">
              {parentMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
