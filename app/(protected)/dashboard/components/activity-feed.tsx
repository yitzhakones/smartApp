'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { ActivityItem } from '@/lib/dashboard/activity-service'
import { formatActivityWhen } from '@/lib/dashboard/format'
import { CATEGORY_LABEL_HE } from '@/lib/categories'
import { Card } from './card'
import { overrideGrade } from '../actions'
import { INK, SOFT, ASSISTANT } from '../theme'

// Recent activity + the one place a parent can override Claude's grading. Each
// row starts read-only (matching the mockup); tapping "תקן ידנית" expands an
// inline confirm strip in place — a full-screen sheet felt heavier than a
// single flip-the-verdict action needs, and keeps each row self-contained in a
// scrolling list. The override never blocks/delays the child's original
// result; it only lets the parent correct it after the fact (doc: "safety net,
// not a gate").
export function ActivityFeed({
  childId,
  items,
  onStatsChange,
}: {
  childId: string
  items: ActivityItem[]
  onStatsChange: (patch: { money?: number; stars?: number }) => void
}) {
  // Local status overrides, keyed by submissionId, so a corrected row updates
  // in place without re-fetching the whole list.
  const [overrides, setOverrides] = useState<Record<string, 'correct' | 'incorrect'>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div>
        <p style={{ color: INK }} className="font-black text-sm mb-2">
          פעילות אחרונה
        </p>
        <Card>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs text-center">
            עדיין אין פעילות מהיום
          </p>
        </Card>
      </div>
    )
  }

  function toggleExpanded(id: string) {
    setError(null)
    setNote('')
    setExpandedId((cur) => (cur === id ? null : id))
  }

  async function confirmOverride(submissionId: string, currentStatus: 'correct' | 'incorrect') {
    const newStatus = currentStatus === 'correct' ? 'incorrect' : 'correct'
    setPending(true)
    setError(null)
    const res = await overrideGrade({ submissionId, childId, newStatus, note })
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setOverrides((prev) => ({ ...prev, [submissionId]: newStatus }))
    onStatsChange({ money: res.balance, stars: res.stars })
    setExpandedId(null)
  }

  return (
    <div>
      <p style={{ color: INK }} className="font-black text-sm mb-2">
        פעילות אחרונה
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const status = overrides[item.submissionId] ?? item.status
          const correct = status === 'correct'
          const expanded = expandedId === item.submissionId
          return (
            <Card key={item.submissionId}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="flex items-center gap-1 text-xs font-black"
                  style={{ color: correct ? '#1FAE7A' : '#E24B4B' }}
                >
                  {correct ? <Check size={13} /> : <X size={13} />}
                  {correct ? 'נכון' : 'לא נכון'}
                  {item.isBonus && (
                    <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="font-bold">
                      · בונוס
                    </span>
                  )}
                </span>
                <span style={{ color: SOFT }} className="text-[11px]">
                  {formatActivityWhen(item.gradedAt)}
                </span>
              </div>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-[11px] mb-1">
                {CATEGORY_LABEL_HE[item.category]}
              </p>
              <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-sm mb-1">
                {item.question}
              </p>
              {item.answer && (
                <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs mb-2">
                  תשובתה: &quot;{item.answer}&quot;
                </p>
              )}

              {!expanded ? (
                <button
                  onClick={() => toggleExpanded(item.submissionId)}
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#FBF7EE', color: SOFT, border: '1px solid #e4e2d8' }}
                >
                  תקן ידנית (אם Claude טעה)
                </button>
              ) : (
                <div className="mt-1 flex flex-col gap-2" style={{ borderTop: '1px solid #f0eee4', paddingTop: 10 }}>
                  <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-bold">
                    לסמן כ&quot;{correct ? 'לא נכון' : 'נכון'}&quot; במקום זאת?
                  </p>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="הערה (לא חובה)"
                    className="rounded-xl px-3 py-1.5 text-xs"
                    style={{ background: '#FBF7EE', border: '1px solid #e4e2d8', fontFamily: ASSISTANT }}
                  />
                  {error && (
                    <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className="text-xs">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmOverride(item.submissionId, status)}
                      disabled={pending}
                      className="flex-1 py-1.5 rounded-full font-black text-xs disabled:opacity-40"
                      style={{ background: INK, color: 'white' }}
                    >
                      {pending ? 'מתקן…' : 'אישור התיקון'}
                    </button>
                    <button
                      onClick={() => setExpandedId(null)}
                      disabled={pending}
                      className="flex-1 py-1.5 rounded-full font-black text-xs"
                      style={{ background: '#FBF7EE', color: INK, border: '1px solid #e4e2d8' }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
