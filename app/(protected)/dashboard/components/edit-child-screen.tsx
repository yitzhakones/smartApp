'use client'

import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Category } from '@/types/database'
import { CATEGORY_LABEL_HE, CATEGORY_ORDER } from '@/lib/categories'
import { MAX_CHILD_AGE, MIN_CHILD_AGE } from '@/lib/ages'
import { deleteChild, updateChild, type UpdateChildInput } from '../actions'
import { ScreenHeader } from './screen-header'
import { ShareLinkCard } from './share-link-card'
import { SHELL, INK, PAPER, CARD, FUCHSIA, SOFT, ASSISTANT, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

// The one destructive color in this dashboard — matches the existing inline
// error red already used for validation messages on this screen.
const DANGER = '#E24B4B'

// age_group/region still aren't part of this screen (not asked for, and not
// otherwise editable anywhere in this dashboard yet) — but `age` (migration
// 013) is real, required, and drives the daily game's question selection, so
// it's editable here like every other real field.
export function EditChildScreen({
  child,
  shareUrl,
  onBack,
  onSaved,
  onDeleted,
}: {
  child: UpdateChildInput
  /** The child's one-time access link (app.com/p/{access_token}) — read-only,
   *  never part of the editable/savable fields above. */
  shareUrl: string
  onBack: () => void
  onSaved: (patch: UpdateChildInput) => void
  /** Called after a successful delete so the dashboard can drop this child
   *  from its list and route away — including to the empty state, if this was
   *  the last child. */
  onDeleted: (childId: string) => void
}) {
  const [name, setName] = useState(child.displayName)
  const [gender, setGender] = useState(child.gender)
  const [locale, setLocale] = useState(child.locale)
  const [age, setAge] = useState(child.age)
  const [categories, setCategories] = useState<Category[]>(child.enabledCategories)
  const [perStar, setPerStar] = useState(child.shekelPerStar)
  const [weeklyBonus, setWeeklyBonus] = useState(child.weeklyImprovementBonus)
  const [accessMode, setAccessMode] = useState(child.accessMode)
  const [pin, setPin] = useState(child.accessPin ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Delete flow: collapsed by default, expands into a type-the-name
  // confirmation. Kept as its own state (not a modal/route) so it can't be
  // reached without deliberately opening it first.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Compared against the child's ORIGINAL stored name (child.displayName), not
  // the `name` edit field — otherwise typing a new name above would silently
  // change what you have to type to delete. The server re-checks this against
  // the DB value regardless; this only gates the button.
  const deleteNameMatches = deleteConfirmName.trim() === child.displayName.trim()

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
      age,
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

  async function confirmDelete() {
    if (!deleteNameMatches) return
    setDeletePending(true)
    setDeleteError(null)
    const res = await deleteChild({
      childId: child.childId,
      confirmName: deleteConfirmName,
    })
    setDeletePending(false)
    if (!res.ok) {
      setDeleteError(res.error)
      return
    }
    // Parent decides where to go — this screen can't route itself, since
    // whether a dashboard still exists depends on the remaining child count.
    onDeleted(child.childId)
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
            גיל <span className="font-normal">(קובע את רמת השאלות שיוצגו)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: MAX_CHILD_AGE - MIN_CHILD_AGE + 1 }, (_, i) => MIN_CHILD_AGE + i).map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`${SETTINGS_TAP.circleBtn} rounded-2xl font-black text-sm shrink-0`}
                style={{
                  background: age === a ? INK : CARD,
                  color: age === a ? 'white' : INK,
                  border: age === a ? 'none' : '1px solid #e4e2d8',
                }}
              >
                {a}
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

        {/* Destructive zone — visually separated from everything above it, and
            from the fixed save button below, so it can't be confused for part
            of the normal edit flow. */}
        <div
          className="rounded-2xl p-4 mt-2"
          style={{ background: `${DANGER}0d`, border: `1px solid ${DANGER}55` }}
        >
          {!confirmingDelete ? (
            <>
              <p style={{ color: DANGER, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
                מחיקת פרופיל
              </p>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`mt-1 mb-3 ${SETTINGS_TEXT.caption}`}>
                מחיקה לצמיתות של {child.displayName} — כולל כל ההתקדמות, הכוכבים, היסטוריית התגמולים והשאלות
                שנענו. לא ניתן לשחזר.
              </p>
              <button
                onClick={() => {
                  setConfirmingDelete(true)
                  setDeleteConfirmName('')
                  setDeleteError(null)
                }}
                className={`w-full ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} flex items-center justify-center gap-2`}
                style={{ background: 'transparent', color: DANGER, border: `1.5px solid ${DANGER}` }}
              >
                <Trash2 size={16} /> מחיקת פרופיל
              </button>
            </>
          ) : (
            <>
              <p style={{ color: DANGER, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
                בטוחים? הפעולה בלתי הפיכה
              </p>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`mt-1 mb-3 ${SETTINGS_TEXT.caption}`}>
                כדי לאשר, הקלידו את שם הילד/ה במדויק:{' '}
                <span style={{ color: INK, fontWeight: 700 }}>{child.displayName}</span>
              </p>
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={child.displayName}
                autoFocus
                className={`w-full rounded-2xl px-4 py-3.5 font-bold mb-3 ${SETTINGS_TEXT.input}`}
                style={{ background: CARD, border: `1px solid ${DANGER}55`, color: INK }}
              />
              {deleteError && (
                <p
                  style={{ color: DANGER, fontFamily: ASSISTANT }}
                  className={`text-center mb-2 ${SETTINGS_TEXT.caption}`}
                >
                  {deleteError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfirmingDelete(false)
                    setDeleteConfirmName('')
                    setDeleteError(null)
                  }}
                  disabled={deletePending}
                  className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} disabled:opacity-50`}
                  style={{ background: CARD, color: INK, border: '1px solid #e4e2d8' }}
                >
                  ביטול
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={!deleteNameMatches || deletePending}
                  className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} disabled:opacity-40`}
                  style={{ background: DANGER, color: 'white' }}
                >
                  {deletePending ? 'מוחק…' : 'מחיקה לצמיתות'}
                </button>
              </div>
            </>
          )}
        </div>
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
