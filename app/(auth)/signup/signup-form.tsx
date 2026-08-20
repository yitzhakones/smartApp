'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { signUpAction, type AuthFormState } from '../actions'
import { INK, SOFT, BORDER, ASSISTANT, DANGER } from '../theme'

const initialState: AuthFormState = {}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-2 w-full py-3.5 rounded-full font-black text-base disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: INK, color: 'white', fontFamily: ASSISTANT }}
    >
      {pending ? 'יוצרים חשבון…' : 'יצירת חשבון'}
    </button>
  )
}

export function SignupForm() {
  const [state, formAction] = useFormState(signUpAction, initialState)
  // Client-side mirror of the hard gate: the button stays disabled until the box
  // is checked. The server re-validates regardless (see signUpAction).
  const [consented, setConsented] = useState(false)

  if (state.needsConfirmation) {
    return (
      <div className="rounded-2xl p-4" style={{ background: '#1FAE7A1a' }}>
        <p style={{ color: '#0f7a54', fontFamily: ASSISTANT }} className="font-black text-base">
          כמעט סיימנו! 📧
        </p>
        <p style={{ color: '#0f7a54', fontFamily: ASSISTANT }} className="mt-1.5 text-sm leading-relaxed">
          שלחנו קישור אימות לכתובת האימייל שלך. אשרו אותו ואז{' '}
          <Link href="/login" className="font-bold underline">
            התחברו
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="font-bold">
          אימייל
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          className="rounded-2xl px-4 py-3 text-start text-base outline-none"
          style={{ background: '#FBF7EE', border: `1px solid ${BORDER}`, color: INK, fontFamily: ASSISTANT }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="font-bold">
          סיסמה
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
          className="rounded-2xl px-4 py-3 text-start text-base outline-none"
          style={{ background: '#FBF7EE', border: `1px solid ${BORDER}`, color: INK, fontFamily: ASSISTANT }}
        />
        <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs">
          לפחות 8 תווים
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="font-bold">
          מספר וואטסאפ <span className="opacity-70">(לא חובה)</span>
        </span>
        <input
          type="tel"
          name="whatsapp"
          autoComplete="tel"
          dir="ltr"
          className="rounded-2xl px-4 py-3 text-start text-base outline-none"
          style={{ background: '#FBF7EE', border: `1px solid ${BORDER}`, color: INK, fontFamily: ASSISTANT }}
        />
      </label>

      <label className="mt-1 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="consent"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span style={{ color: SOFT, fontFamily: ASSISTANT }}>
          אני ההורה/האפוטרופוס החוקי, ואני מסכים/ה ל
          <Link href="/terms" target="_blank" style={{ color: INK }} className="font-bold underline">
            תנאי השימוש
          </Link>{' '}
          ול
          <Link href="/privacy" target="_blank" style={{ color: INK }} className="font-bold underline">
            מדיניות הפרטיות
          </Link>
          .
        </span>
      </label>

      {state.error && (
        <p
          style={{ background: '#FDEBEC', color: DANGER, fontFamily: ASSISTANT }}
          className="rounded-2xl px-4 py-2.5 text-sm font-bold text-center"
        >
          {state.error}
        </p>
      )}

      <SubmitButton disabled={!consented} />

      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-center text-sm">
        כבר יש לך חשבון?{' '}
        <Link href="/login" style={{ color: INK }} className="font-bold underline">
          התחברות
        </Link>
      </p>
    </form>
  )
}
