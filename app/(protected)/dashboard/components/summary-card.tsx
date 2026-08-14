'use client'

import { useState } from 'react'
import { Flame, Pencil, Check } from 'lucide-react'
import type { PaymentMethod } from '@/types/database'
import { Card } from './card'
import { UpdateSheet } from './update-sheet'
import { recordWithdrawal } from '../actions'
import { INK, ASSISTANT } from '../theme'

// Top summary card: the child's running balance (big), stars + streak, and the
// "next reward" progress within the current decade of stars. The "עדכון" button
// opens the withdrawal sheet; confirming runs the atomic apply_withdrawal RPC
// server-side and reflects the returned balance here — never a client-side edit.

export function SummaryCard({
  child,
  onBalanceChange,
}: {
  child: { id: string; name: string; money: number; stars: number; streak: number }
  onBalanceChange: (balance: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Progress toward the next 10-star reward (10/10 while sitting exactly on a
  // milestone, matching the mockup's `stars % 10 || 10`).
  const withinDecade = child.stars % 10 || 10

  async function confirm(amount: number, method: PaymentMethod) {
    setPending(true)
    setError(null)
    const res = await recordWithdrawal({ childId: child.id, amount, paymentMethod: method })
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onBalanceChange(res.balance)
    setOpen(false)
    setToast(true)
    setTimeout(() => setToast(false), 1500)
  }

  return (
    <>
      <Card style={{ background: INK }}>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5">
            <p style={{ color: '#C6FF3D' }} className="text-7xl font-black leading-none">
              ₪{child.money}
            </p>
            <button
              onClick={() => {
                setError(null)
                setOpen(true)
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[11px]"
              style={{ background: 'rgba(198,255,61,0.16)', color: '#C6FF3D' }}
            >
              <Pencil size={11} /> עדכון
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              <span style={{ color: '#FF3DBB' }} className="text-sm font-bold">
                {child.stars}
              </span>
              <span style={{ color: '#9BA3C7' }} className="text-xs">
                כוכבים
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Flame size={12} color="#FFB63D" fill="#FFB63D" />
              <span style={{ color: '#9BA3C7' }} className="text-xs">
                {child.streak} ימים
              </span>
            </div>
          </div>
        </div>
        <div
          className="mt-3 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <div
            style={{
              height: '100%',
              width: `${withinDecade * 10}%`,
              background: 'linear-gradient(90deg, #FF3DBB, #FFB63D)',
            }}
          />
        </div>
        <p style={{ color: '#9BA3C7', fontFamily: ASSISTANT }} className="text-[11px] mt-1.5">
          {withinDecade}/10 כוכבים לתגמול הבא
        </p>
        {error && (
          <p style={{ color: '#FF8A8A', fontFamily: ASSISTANT }} className="text-xs mt-2 text-center">
            {error}
          </p>
        )}
      </Card>

      {open && (
        <UpdateSheet
          childName={child.name}
          balance={child.money}
          pending={pending}
          onClose={() => !pending && setOpen(false)}
          onConfirm={confirm}
        />
      )}

      {toast && (
        <div
          className="fixed left-1/2 top-4 z-50 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5"
          style={{ background: '#1FAE7A', color: 'white', transform: 'translateX(-50%)' }}
        >
          <Check size={14} /> עודכן בהצלחה
        </div>
      )}
    </>
  )
}
