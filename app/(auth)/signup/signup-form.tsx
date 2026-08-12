'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { signUpAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = {}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-2 w-full rounded-xl bg-[#14172b] px-4 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900">
        <p className="font-bold">כמעט סיימנו! 📧</p>
        <p className="mt-1">
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
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">אימייל</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          className="rounded-xl border border-black/15 px-3 py-2 text-start"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">סיסמה</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
          className="rounded-xl border border-black/15 px-3 py-2 text-start"
        />
        <span className="text-xs opacity-60">לפחות 8 תווים</span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          מספר וואטסאפ <span className="opacity-60">(לא חובה)</span>
        </span>
        <input
          type="tel"
          name="whatsapp"
          autoComplete="tel"
          dir="ltr"
          className="rounded-xl border border-black/15 px-3 py-2 text-start"
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
        <span>
          אני ההורה/האפוטרופוס החוקי, ואני מסכים/ה ל
          <Link
            href="/terms"
            target="_blank"
            className="font-bold underline"
          >
            תנאי השימוש
          </Link>{' '}
          ול
          <Link
            href="/privacy"
            target="_blank"
            className="font-bold underline"
          >
            מדיניות הפרטיות
          </Link>
          .
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton disabled={!consented} />

      <p className="text-center text-sm opacity-70">
        כבר יש לך חשבון?{' '}
        <Link href="/login" className="font-bold underline">
          התחברות
        </Link>
      </p>
    </form>
  )
}
