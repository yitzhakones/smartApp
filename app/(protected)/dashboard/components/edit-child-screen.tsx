'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Category } from '@/types/database'
import { CATEGORY_LABEL_HE, CATEGORY_ORDER } from '@/lib/categories'
import { updateChild, type UpdateChildInput } from '../actions'
import { ScreenHeader } from './screen-header'
import { ShareLinkCard } from './share-link-card'
import { SHELL, INK, PAPER, CARD, FUCHSIA, SOFT, ASSISTANT, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

// Real fields only — age_group/region aren't part of this screen (not asked
// for, and not otherwise editable anywhere in this dashboard yet).
export function EditChildScreen({
  child,
  shareUrl,
  onBack,
  onSaved,
}: {
  child: UpdateChildInput
  /** The child's one-time access link (app.com/p/{access_token}) — read-only,
   *  never part of the editable/savable fields above. */
  shareUrl: string
  onBack: () => void
  onSaved: (patch: UpdateChildInput) => void
}) {
  const [name, setName] = useState(child.displayName)
  const [gender, setGender] = useState(child.gender)
  const [locale, setLocale] = useState(child.locale)
  const [categories, setCategories] = useState<Category[]>(child.enabledCategories)
  const [perStar, setPerStar] = useState(child.shekelPerStar)
  const [weeklyBonus, setWeeklyBonus] = useState(child.weeklyImprovementBonus)
  const [accessMode, setAccessMode] = useState(child.accessMode)
  const [pin, setPin] = useState(child.accessPin ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(key: Category) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
  }

  async function save() {
    setPending(true)
    setError(null)
    const res = await updateChild({
      childId: child.childId,
      displayName: name,
      gender,
      locale,
      enabledCategories: categories,
      shekelPerStar: perStar,
      weeklyImprovementBonus: weeklyBonus,
      accessMode,
      accessPin: accessMode === 'pin' ? pin : null,
    })
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved(res.child)
    onBack()
  }

  return (
    <div dir="rtl" style={SHELL}>
      <ScreenHeader title={`עריכת פרופיל · ${child.displayName}`} onBack={onBack} />
      <div className="px-4 flex flex-col gap-4 pb-28">
        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            שם
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-2xl px-4 py-3.5 font-bold ${SETTINGS_TEXT.input}`}
            style={{ background: CARD, border: '1px solid #e4e2d8', color: INK }}
          />
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            מגדר
          </p>
          <div className="flex gap-2">
            {(
              [
                ['female', 'בת'],
                ['male', 'בן'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGender(key)}
                className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
                style={{
                  background: gender === key ? INK : CARD,
                  color: gender === key ? 'white' : INK,
                  border: gender === key ? 'none' : '1px solid #e4e2d8',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            שפת משחק
          </p>
          <div className="flex gap-2">
            {(
              [
                ['he', 'עברית'],
                ['en', 'English'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLocale(key)}
                className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
                style={{
                  background: locale === key ? FUCHSIA : CARD,
                  color: locale === key ? 'white' : INK,
                  border: locale === key ? 'none' : '1px solid #e4e2d8',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            קטגוריות
          </p>
          <div className="flex flex-col gap-2">
            {CATEGORY_ORDER.map((key) => {
              const selected = categories.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(key)}
                  className={`flex items-center justify-between px-4 ${SETTINGS_TAP.buttonPadY} rounded-2xl`}
                  style={{ background: selected ? INK : CARD, border: selected ? 'none' : '1px solid #e4e2d8' }}
                >
                  <span style={{ color: selected ? 'white' : INK }} className={`font-bold ${SETTINGS_TEXT.body}`}>
                    {CATEGORY_LABEL_HE[key]}
                  </span>
                  {selected && <Check size={18} color="#C6FF3D" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
          <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold mb-3 ${SETTINGS_TEXT.body}`}>
            ₪ לכל תשובה נכונה
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPerStar((v) => Math.max(1, v - 1))}
              className={`${SETTINGS_TAP.circleBtn} rounded-full font-black text-xl`}
              style={{ background: PAPER, color: INK }}
            >
              -
            </button>
            <span style={{ color: '#5a8a10', fontFamily: 'var(--font-rubik)' }} className={`font-black ${SETTINGS_TEXT.value}`}>
              ₪{perStar}
            </span>
            <button
              onClick={() => setPerStar((v) => v + 1)}
              className={`${SETTINGS_TAP.circleBtn} rounded-full font-black text-xl`}
              style={{ background: PAPER, color: INK }}
            >
              +
            </button>
          </div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`mt-2 ${SETTINGS_TEXT.caption}`}>
            בונוס יחושב אוטומטית פי 3 מהערך הזה
          </p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
          <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold mb-3 ${SETTINGS_TEXT.body}`}>
            בונוס שיפור שבועי
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeeklyBonus((v) => Math.max(0, v - 5))}
              className={`${SETTINGS_TAP.circleBtn} rounded-full font-black text-xl`}
              style={{ background: PAPER, color: INK }}
            >
              -
            </button>
            <span style={{ color: FUCHSIA, fontFamily: 'var(--font-rubik)' }} className={`font-black ${SETTINGS_TEXT.value}`}>
              ₪{weeklyBonus}
            </span>
            <button
              onClick={() => setWeeklyBonus((v) => v + 5)}
              className={`${SETTINGS_TAP.circleBtn} rounded-full font-black text-xl`}
              style={{ background: PAPER, color: INK }}
            >
              +
            </button>
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            אופן כניסה
          </p>
          <div className="flex gap-2 mb-2">
            {(
              [
                ['pin', 'קוד PIN'],
                ['no_code', 'בלי קוד'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAccessMode(key)}
                className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
                style={{
                  background: accessMode === key ? INK : CARD,
                  color: accessMode === key ? 'white' : INK,
                  border: accessMode === key ? 'none' : '1px solid #e4e2d8',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {accessMode === 'pin' && (
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="קוד בן 4 ספרות"
              className={`w-full rounded-2xl px-4 py-3.5 text-center font-black tracking-widest ${SETTINGS_TEXT.pin}`}
              style={{ background: CARD, border: '1px solid #e4e2d8', color: INK }}
            />
          )}
        </div>

        <ShareLinkCard url={shareUrl} childName={child.displayName} />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ maxWidth: 440, margin: '0 auto', background: PAPER, borderTop: '1px solid #e4e2d8' }}
      >
        {error && (
          <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className={`text-center mb-2 ${SETTINGS_TEXT.caption}`}>
            {error}
          </p>
        )}
        <button
          onClick={save}
          disabled={pending}
          className={`w-full ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} disabled:opacity-50`}
          style={{ background: INK, color: 'white' }}
        >
          {pending ? 'שומר…' : 'שמירת שינויים'}
        </button>
      </div>
    </div>
  )
}
