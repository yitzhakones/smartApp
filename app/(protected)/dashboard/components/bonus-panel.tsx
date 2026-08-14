'use client'

import { useState } from 'react'
import { Check, ChevronDown, Send, Sparkles } from 'lucide-react'
import type { Tables } from '@/types/database'
import { parseCustomReward } from '@/lib/dashboard/parse-custom-reward'
import { Card } from './card'
import { sendBonus } from '../actions'
import { INK, PAPER, FUCHSIA, SOFT, ASSISTANT } from '../theme'

type Preset = Pick<Tables<'reward_presets'>, 'id' | 'kind' | 'label' | 'amount_nis'>

// Collapsible send-bonus panel from the mockup, wired to the parent's real
// reward_presets (money + privilege chips shown together, matching the mock)
// plus a free-text fallback disambiguated by parseCustomReward. Sending writes
// a `parent_reward` ledger row via the atomic send_parent_reward RPC; only a
// money reward reports a new balance back up to the summary card.
export function BonusPanel({
  child,
  presets,
  onBalanceChange,
}: {
  child: { id: string }
  presets: Preset[]
  onBalanceChange: (balance: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = presets.find((p) => p.id === selectedId) ?? null
  const custom = !selected ? parseCustomReward(customValue) : null
  const payload = selected
    ? { kind: selected.kind, label: selected.label, amountNis: selected.amount_nis }
    : custom
      ? { kind: custom.kind, label: custom.label, amountNis: custom.amountNis }
      : null

  function selectPreset(id: string) {
    setSelectedId(id)
    setCustomValue('')
  }

  async function send() {
    if (!payload) return
    setPending(true)
    setError(null)
    const res = await sendBonus({ childId: child.id, ...payload, note })
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (payload.kind === 'money') onBalanceChange(res.balance)
    setSent(true)
    setTimeout(() => {
      setSent(false)
      setOpen(false)
      setSelectedId(null)
      setCustomValue('')
      setNote('')
    }, 1400)
  }

  return (
    <Card>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} color={FUCHSIA} />
          <p style={{ color: INK }} className="font-black text-sm">
            שליחת בונוס / הודעה
          </p>
        </div>
        <ChevronDown
          size={18}
          color={SOFT}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPreset(p.id)}
                className="px-3 py-1.5 rounded-full text-sm font-bold"
                style={{
                  background: selectedId === p.id ? (p.kind === 'money' ? INK : FUCHSIA) : PAPER,
                  color: selectedId === p.id ? 'white' : INK,
                  border: '1px solid #e4e2d8',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <input
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value)
              setSelectedId(null)
            }}
            placeholder="או הקלידי סכום/פינוק משלך..."
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: PAPER, border: '1px solid #e4e2d8', fontFamily: ASSISTANT }}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="מסר אישי (לא חובה) - למשל 'כל הכבוד מלכה שלי'"
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: PAPER, border: '1px solid #e4e2d8', fontFamily: ASSISTANT }}
          />

          {error && (
            <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className="text-xs">
              {error}
            </p>
          )}

          <button
            onClick={send}
            disabled={!payload || pending}
            className="py-2.5 rounded-full font-black text-sm disabled:opacity-30 flex items-center justify-center gap-1.5"
            style={{ background: sent ? '#1FAE7A' : INK, color: 'white' }}
          >
            {sent ? (
              <>
                <Check size={16} /> נשלח לילד/ה!
              </>
            ) : pending ? (
              'שולח…'
            ) : (
              <>
                <Send size={15} /> שליחה
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  )
}
