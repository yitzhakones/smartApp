'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { PaymentMethod } from '@/types/database'
import { INK, PAPER, SOFT, CARD, RUBIK, ASSISTANT } from '../theme'

// The withdrawal sheet from the mockup, plus the one addition the mockup omits:
// a payment-method selector. The data model requires payment_method on every
// `withdrawal` row ("amount actually paid + how"), so it's a functional
// necessity, not a redesign — styled with the same pill toggles the rest of the
// dashboard uses. The amount stepper is capped at the current balance, since the
// running total means "what I still owe" and must not go negative.

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'מזומן' },
  { key: 'bit', label: 'ביט' },
  { key: 'bank_transfer', label: 'העברה' },
  { key: 'other', label: 'אחר' },
]

export function UpdateSheet({
  childName,
  balance,
  pending,
  onClose,
  onConfirm,
}: {
  childName: string
  balance: number
  pending: boolean
  onClose: () => void
  onConfirm: (amount: number, method: PaymentMethod) => void
}) {
  const [amount, setAmount] = useState(balance)
  const [method, setMethod] = useState<PaymentMethod>('cash')

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-b-3xl p-5"
        style={{ background: CARD, maxWidth: 440, margin: '0 auto' }}
      >
        <div className="flex items-center justify-between mb-5">
          <p style={{ color: INK, fontFamily: RUBIK }} className="font-black text-base">
            עדכון · {childName}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: PAPER }}
          >
            <X size={16} color={SOFT} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mb-2">
          <button
            onClick={() => setAmount((v) => Math.max(0, v - 1))}
            className="w-11 h-11 rounded-full font-black text-xl"
            style={{ background: PAPER, color: INK }}
          >
            -
          </button>
          <span style={{ color: '#5a8a10', fontFamily: RUBIK }} className="text-4xl font-black">
            ₪{amount}
          </span>
          <button
            onClick={() => setAmount((v) => Math.min(balance, v + 1))}
            className="w-11 h-11 rounded-full font-black text-xl"
            style={{ background: PAPER, color: INK }}
          >
            +
          </button>
        </div>
        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs text-center mb-5">
          מתוך {balance} ₪ זמינים
        </p>

        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-1.5">
          אופן התשלום
        </p>
        <div className="flex gap-2 mb-5">
          {METHODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className="flex-1 py-2 rounded-2xl font-black text-xs"
              style={{
                background: method === m.key ? INK : CARD,
                color: method === m.key ? 'white' : INK,
                border: method === m.key ? 'none' : '1px solid #e4e2d8',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onConfirm(amount, method)}
          disabled={pending || amount <= 0}
          className="w-full py-3 rounded-full font-black text-sm disabled:opacity-40"
          style={{ background: INK, color: 'white' }}
        >
          {pending ? 'רושם…' : 'עדכון היתרה'}
        </button>
      </div>
    </div>
  )
}
