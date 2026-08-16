'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { RewardKind, Tables } from '@/types/database'
import type { PresetInput } from '../actions'
import { INK, PAPER, CARD, FUCHSIA, SOFT, RUBIK, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

type Preset = Pick<Tables<'reward_presets'>, 'id' | 'kind' | 'label' | 'amount_nis'>

export function PresetForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Preset | null
  pending: boolean
  onSave: (input: PresetInput) => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<RewardKind>(initial?.kind ?? 'money')
  const [label, setLabel] = useState(initial?.kind === 'privilege' ? initial.label : '')
  const [amount, setAmount] = useState(initial?.amount_nis ?? 10)

  function save() {
    if (kind === 'money') {
      onSave({ kind: 'money', label: `₪${amount}`, amountNis: amount })
    } else {
      if (!label.trim()) return
      onSave({ kind: 'privilege', label: label.trim(), amountNis: null })
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full rounded-t-3xl p-5"
      style={{ background: CARD, maxWidth: 440, margin: '0 auto' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p style={{ color: INK, fontFamily: RUBIK }} className="font-black text-lg">
          {initial ? "עריכת צ'יפ" : "צ'יפ חדש"}
        </p>
        <button
          onClick={onCancel}
          className={`${SETTINGS_TAP.circleBtn} rounded-full flex items-center justify-center`}
          style={{ background: PAPER }}
        >
          <X size={18} color={SOFT} />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setKind('money')}
          className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
          style={{ background: kind === 'money' ? INK : PAPER, color: kind === 'money' ? 'white' : INK }}
        >
          כספי
        </button>
        <button
          onClick={() => setKind('privilege')}
          className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
          style={{ background: kind === 'privilege' ? FUCHSIA : PAPER, color: kind === 'privilege' ? 'white' : INK }}
        >
          פינוק
        </button>
      </div>

      {kind === 'money' ? (
        <div className="flex items-center justify-center gap-6 mb-2">
          <button
            onClick={() => setAmount((v) => Math.max(1, v - 1))}
            className="w-12 h-12 rounded-full font-black text-2xl"
            style={{ background: PAPER, color: INK }}
          >
            -
          </button>
          <span style={{ color: '#5a8a10', fontFamily: RUBIK }} className="text-4xl font-black">
            ₪{amount}
          </span>
          <button
            onClick={() => setAmount((v) => v + 1)}
            className="w-12 h-12 rounded-full font-black text-2xl"
            style={{ background: PAPER, color: INK }}
          >
            +
          </button>
        </div>
      ) : (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="לדוגמה: פיצה למשפחה"
          className={`w-full rounded-xl px-3 py-3 mb-2 ${SETTINGS_TEXT.input}`}
          style={{ background: PAPER, border: '1px solid #e4e2d8' }}
        />
      )}

      <button
        onClick={save}
        disabled={pending}
        className={`w-full ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} mt-3 disabled:opacity-50`}
        style={{ background: INK, color: 'white' }}
      >
        <span className="flex items-center justify-center gap-1.5">
          <Check size={16} /> {pending ? 'שומר…' : 'שמירה'}
        </span>
      </button>
    </div>
  )
}
