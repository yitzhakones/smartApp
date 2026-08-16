'use client'

import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, User, BookOpen, Coins, Lock, Sparkles } from 'lucide-react'
import type { AccessMode, Category, Gender, Locale } from '@/types/database'
import { CATEGORY_LABEL_HE, CATEGORY_ORDER } from '@/lib/categories'
import { createChild } from '../actions'
import { INK, PAPER, CARD, LIME, FUCHSIA, AMBER, SOFT, RUBIK, ASSISTANT } from '../theme'

// Ported from child-profile-setup-mockup.jsx — 4-step wizard, same design.
// Two adjustments from the mock, both necessary rather than cosmetic:
//   1. The mock's CATEGORY_OPTIONS used shorthand keys ("history"/"general")
//      that don't match the real Category union — swapped for the real
//      israeli_history/general_knowledge keys against the existing label map
//      (same fix already applied in EditChildScreen).
//   2. The mock hides its back button entirely on step 0 (nothing to go back
//      to, in a standalone demo). Embedded in the real dashboard this needs an
//      exit path, so the back button is always visible, reading "ביטול" on
//      step 0 (cancels the wizard) and "חזרה" after that (goes back a step).
//
// Fixed (confirmed, not guessed): step 2's mockup label read "...תתרגל/תתרגל?"
// — the same word on both sides of the slash. `gender` is already known at
// that point, so it now picks the real 3rd-person future pair — "תתרגל" (she
// will practice) / "יתרגל" (he will practice) — and the "היא"/"הוא" fallback
// (shown before a name is typed) agrees with whichever verb form is picked,
// since a mismatched pronoun+verb would be its own new grammar error.
//
// age_group is deliberately never asked here, matching the mock's own note in
// step 0 — it's collected later (not yet built) for anonymous peer comparison
// only, not for content selection.

const STEPS = [
  { key: 'identity', label: 'פרטי הילד/ה', icon: User },
  { key: 'categories', label: 'קטגוריות', icon: BookOpen },
  { key: 'rewards', label: 'תגמול וגישה', icon: Coins },
  { key: 'summary', label: 'סיכום', icon: Sparkles },
] as const

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-5 pb-2">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className="flex items-center justify-center rounded-full font-black text-xs"
          style={{
            width: i === current ? 30 : 22,
            height: i === current ? 30 : 22,
            background: i < current ? LIME : i === current ? INK : '#e4e2d8',
            color: i <= current ? 'white' : SOFT,
          }}
        >
          {i < current ? <Check size={13} /> : i + 1}
        </div>
      ))}
    </div>
  )
}

export function AddChildWizard({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('female')
  const [locale, setLocale] = useState<Locale>('he')
  const [categories, setCategories] = useState<Category[]>(['math', 'science'])
  const [perStar, setPerStar] = useState(1)
  const [weeklyBonus, setWeeklyBonus] = useState(10)
  const [accessMode, setAccessMode] = useState<AccessMode>('pin')
  const [pin, setPin] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(key: Category) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
  }
  function next() {
    setError(null)
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }
  function back() {
    setError(null)
    if (step > 0) setStep((s) => s - 1)
    else onBack()
  }

  const canNextIdentity = name.trim().length > 0
  const canNextCategories = categories.length > 0
  const canNextRewards = accessMode === 'no_code' || pin.length === 4

  async function submit() {
    setPending(true)
    setError(null)
    const res = await createChild({
      displayName: name,
      gender,
      locale,
      enabledCategories: categories,
      shekelPerStar: perStar,
      weeklyImprovementBonus: weeklyBonus,
      accessMode,
      accessPin: accessMode === 'pin' ? pin : null,
    })
    // A successful call redirects server-side and never resolves back here —
    // only the failure path returns a value to react to.
    setPending(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: '100vh', maxWidth: 440, margin: '0 auto', fontFamily: RUBIK }}>
      <div className="px-5 pt-4">
        <p style={{ color: INK }} className="text-lg font-black text-center">
          הוספת פרופיל ילד/ה
        </p>
        <StepDots current={step} />
      </div>

      <div className="px-5 pb-28 pt-4">
        {/* שלב 1: זהות */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-1.5">
                שם
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: נועה"
                className="w-full rounded-2xl px-4 py-3 text-base font-bold"
                style={{ background: CARD, border: '1px solid #e4e2d8', color: INK }}
              />
            </div>

            <div>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-1.5">
                מגדר <span className="font-normal">(מתאים את הניסוח בעברית - &quot;כתבי&quot;/&quot;כתוב&quot;)</span>
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
                    className="flex-1 py-3 rounded-2xl font-black text-sm"
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
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-1.5">
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
                    className="flex-1 py-3 rounded-2xl font-black text-sm"
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

            <div className="rounded-2xl p-3" style={{ background: `${AMBER}15`, border: `1px solid ${AMBER}44` }}>
              <p style={{ color: '#8a5c00', fontFamily: ASSISTANT }} className="text-xs">
                קבוצת גיל תתבקש בהמשך - משמשת רק להשוואה אנונימית מול ילדים אחרים, לא לתוכן עצמו.
              </p>
            </div>
          </div>
        )}

        {/* שלב 2: קטגוריות */}
        {step === 1 && (
          <div>
            <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-3">
              באילו נושאים {name || (gender === 'female' ? 'היא' : 'הוא')}{' '}
              {gender === 'female' ? 'תתרגל' : 'יתרגל'}? אפשר לבחור כמה
            </p>
            <div className="flex flex-col gap-2.5">
              {CATEGORY_ORDER.map((key) => {
                const selected = categories.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleCategory(key)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                    style={{ background: selected ? INK : CARD, border: selected ? 'none' : '1px solid #e4e2d8' }}
                  >
                    <span style={{ color: selected ? 'white' : INK }} className="font-bold text-sm">
                      {CATEGORY_LABEL_HE[key]}
                    </span>
                    {selected && <Check size={18} color="#C6FF3D" />}
                  </button>
                )
              })}
            </div>
            <div className="rounded-2xl p-3 mt-4" style={{ background: `${FUCHSIA}10`, border: `1px solid ${FUCHSIA}33` }}>
              <p style={{ color: FUCHSIA, fontFamily: ASSISTANT }} className="text-xs font-bold">
                אחרי היצירה תופיע שאלת היכרות קצרה (בלי ציון) כדי להתאים את רמת הקושי לכל נושא בנפרד.
              </p>
            </div>
          </div>
        )}

        {/* שלב 3: תגמול וגישה */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
              <p style={{ color: INK }} className="font-bold text-sm mb-3">
                ₪ לכל תשובה נכונה
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPerStar((v) => Math.max(1, v - 1))}
                  className="w-10 h-10 rounded-full font-black text-lg"
                  style={{ background: PAPER, color: INK }}
                >
                  -
                </button>
                <span style={{ color: '#5a8a10' }} className="text-2xl font-black">
                  ₪{perStar}
                </span>
                <button
                  onClick={() => setPerStar((v) => v + 1)}
                  className="w-10 h-10 rounded-full font-black text-lg"
                  style={{ background: PAPER, color: INK }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
              <p style={{ color: INK }} className="font-bold text-sm mb-3">
                בונוס שיפור שבועי
              </p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setWeeklyBonus((v) => Math.max(0, v - 5))}
                  className="w-10 h-10 rounded-full font-black text-lg"
                  style={{ background: PAPER, color: INK }}
                >
                  -
                </button>
                <span style={{ color: FUCHSIA }} className="text-2xl font-black">
                  ₪{weeklyBonus}
                </span>
                <button
                  onClick={() => setWeeklyBonus((v) => v + 5)}
                  className="w-10 h-10 rounded-full font-black text-lg"
                  style={{ background: PAPER, color: INK }}
                >
                  +
                </button>
              </div>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-[11px] mt-2">
                ניתן אוטומטית אם השבוע טוב מהקודם
              </p>
            </div>

            <div>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-1.5 flex items-center gap-1">
                <Lock size={12} /> אופן כניסה
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
                    className="flex-1 py-3 rounded-2xl font-black text-sm"
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
                  className="w-full rounded-2xl px-4 py-3 text-center text-xl font-black tracking-widest"
                  style={{ background: CARD, border: '1px solid #e4e2d8', color: INK }}
                />
              )}
            </div>
          </div>
        )}

        {/* שלב 4: סיכום */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <div className="rounded-3xl p-5 text-center" style={{ background: `linear-gradient(135deg, #C6FF3D, ${FUCHSIA})` }}>
              <p style={{ color: INK }} className="text-2xl font-black">
                {name || 'הילד/ה'}
              </p>
              <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-bold mt-1">
                {gender === 'female' ? 'בת' : 'בן'} · {locale === 'he' ? 'עברית' : 'English'}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
              <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-2">
                קטגוריות
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <span key={c} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: PAPER, color: INK }}>
                    {CATEGORY_LABEL_HE[c]}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4 flex justify-between" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
              <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold">
                תגמול
              </span>
              <span style={{ color: INK }} className="text-xs font-black">
                ₪{perStar}/תשובה · בונוס ₪{weeklyBonus}
              </span>
            </div>
            <div className="rounded-2xl p-4 flex justify-between" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
              <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold">
                כניסה
              </span>
              <span style={{ color: INK }} className="text-xs font-black">
                {accessMode === 'pin' ? `קוד ${pin || '----'}` : 'בלי קוד'}
              </span>
            </div>
            {error && (
              <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className="text-xs font-bold text-center">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ניווט תחתון */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 flex gap-2"
        style={{ maxWidth: 440, margin: '0 auto', background: PAPER, borderTop: '1px solid #e4e2d8' }}
      >
        <button
          onClick={back}
          disabled={pending}
          className="px-5 py-3 rounded-full font-bold flex items-center gap-1 disabled:opacity-40"
          style={{ background: CARD, color: INK, border: '1px solid #e4e2d8' }}
        >
          <ChevronRight size={18} /> {step === 0 ? 'ביטול' : 'חזרה'}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            disabled={(step === 0 && !canNextIdentity) || (step === 1 && !canNextCategories) || (step === 2 && !canNextRewards)}
            className="flex-1 py-3 rounded-full font-black flex items-center justify-center gap-1 disabled:opacity-30"
            style={{ background: INK, color: 'white' }}
          >
            המשך <ChevronLeft size={18} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={pending}
            className="flex-1 py-3 rounded-full font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C6FF3D, #D6127A)', color: INK }}
          >
            <Sparkles size={17} /> {pending ? 'יוצר פרופיל…' : 'צור פרופיל והתחל כיול'}
          </button>
        )}
      </div>
    </div>
  )
}
