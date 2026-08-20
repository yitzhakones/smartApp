'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { signInAction, type AuthFormState } from '../actions'
import { INK, SOFT, BORDER, ASSISTANT, DANGER } from '../theme'

const initialState: AuthFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full py-3.5 rounded-full font-black text-base disabled:opacity-40"
      style={{ background: INK, color: 'white', fontFamily: ASSISTANT }}
    >
      {pending ? 'מתחברים…' : 'התחברות'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState)

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
          autoComplete="current-password"
          dir="ltr"
          className="rounded-2xl px-4 py-3 text-start text-base outline-none"
          style={{ background: '#FBF7EE', border: `1px solid ${BORDER}`, color: INK, fontFamily: ASSISTANT }}
        />
      </label>

      {state.error && (
        <p
          style={{ background: '#FDEBEC', color: DANGER, fontFamily: ASSISTANT }}
          className="rounded-2xl px-4 py-2.5 text-sm font-bold text-center"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-center text-sm">
        אין לך חשבון עדיין?{' '}
        <Link href="/signup" style={{ color: INK }} className="font-bold underline">
          הרשמה
        </Link>
      </p>
    </form>
  )
}
