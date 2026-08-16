'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Tables } from '@/types/database'
import { createPreset, deletePreset, updatePreset, type PresetInput } from '../actions'
import { Card } from './card'
import { ScreenHeader } from './screen-header'
import { PresetForm } from './preset-form'
import { SHELL, INK, PAPER, FUCHSIA, SOFT, ASSISTANT, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

type Preset = Pick<Tables<'reward_presets'>, 'id' | 'kind' | 'label' | 'amount_nis'>

// Presets are LIFTED state, owned by DashboardClient and passed down here the
// same way the mockup does (`presets` + `setPresets`) — BonusPanel reads the
// exact same array, so a create/edit/delete here is reflected there the moment
// the parent navigates back to the dashboard, with no page reload and no
// separate copy to go stale.
export function PresetsScreen({
  presets,
  setPresets,
  onBack,
}: {
  presets: Preset[]
  setPresets: Dispatch<SetStateAction<Preset[]>>
  onBack: () => void
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setError(null)
    setFormOpen(true)
  }
  function openEdit(p: Preset) {
    setEditing(p)
    setError(null)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    setPending(true)
    setError(null)
    const res = await deletePreset(id)
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setPresets((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSave(input: PresetInput) {
    setPending(true)
    setError(null)
    const res = editing ? await updatePreset(editing.id, input) : await createPreset(input)
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (editing) {
      setPresets((prev) => prev.map((p) => (p.id === res.preset.id ? res.preset : p)))
    } else {
      setPresets((prev) => [...prev, res.preset])
    }
    setFormOpen(false)
  }

  const money = presets.filter((p) => p.kind === 'money')
  const privileges = presets.filter((p) => p.kind === 'privilege')

  return (
    <div dir="rtl" style={SHELL}>
      <ScreenHeader title="ניהול תגמולים מהירים" onBack={onBack} />
      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`px-4 mb-4 ${SETTINGS_TEXT.caption}`}>
        הצ&apos;יפים שמופיעים בפאנל &quot;שליחת בונוס&quot; - אפשר להוסיף, לערוך ולמחוק בכל עת
      </p>
      {error && (
        <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className={`px-4 mb-2 ${SETTINGS_TEXT.caption}`}>
          {error}
        </p>
      )}
      <div className="px-4 flex flex-col gap-3 pb-24">
        <Card>
          <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold mb-1 ${SETTINGS_TEXT.body}`}>
            כספי
          </p>
          {money.length === 0 && (
            <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={SETTINGS_TEXT.caption}>
              אין צ&apos;יפים כספיים עדיין
            </p>
          )}
          {money.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              disabled={pending}
              accentBg="#8FCB1F22"
              accentText="#5a8a10"
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </Card>
        <Card>
          <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold mb-1 ${SETTINGS_TEXT.body}`}>
            פינוקים
          </p>
          {privileges.length === 0 && (
            <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={SETTINGS_TEXT.caption}>
              אין פינוקים עדיין
            </p>
          )}
          {privileges.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              disabled={pending}
              accentBg={`${FUCHSIA}18`}
              accentText={FUCHSIA}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </Card>
        <button
          onClick={openNew}
          className={`flex items-center justify-center gap-1.5 ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button}`}
          style={{ background: INK, color: 'white' }}
        >
          <Plus size={18} /> צ&apos;יפ חדש
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setFormOpen(false)}>
          <PresetForm initial={editing} pending={pending} onSave={handleSave} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </div>
  )
}

function PresetRow({
  preset,
  disabled,
  accentBg,
  accentText,
  onEdit,
  onDelete,
}: {
  preset: Preset
  disabled: boolean
  accentBg: string
  accentText: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f0eee4' }}>
      <span
        className={`font-black px-3 py-1 rounded-full ${SETTINGS_TEXT.body}`}
        style={{ background: accentBg, color: accentText }}
      >
        {preset.label}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          disabled={disabled}
          className={`${SETTINGS_TAP.circleBtn} rounded-full flex items-center justify-center disabled:opacity-50`}
          style={{ background: PAPER }}
        >
          <Pencil size={16} color={SOFT} />
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className={`${SETTINGS_TAP.circleBtn} rounded-full flex items-center justify-center disabled:opacity-50`}
          style={{ background: PAPER }}
        >
          <Trash2 size={16} color="#E24B4B" />
        </button>
      </div>
    </div>
  )
}
