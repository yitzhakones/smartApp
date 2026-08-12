'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { signInAction, type AuthFormState } from '../actions'

const initialState: AuthFormState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-[#14172b] px-4 py-3 font-bold text-white transition disabled:opacity-40"
    >
      {pending ? 'מתחברים…' : 'התחברות'}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState)

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
          autoComplete="current-password"
          dir="ltr"
          className="rounded-xl border border-black/15 px-3 py-2 text-start"
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm opacity-70">
        אין לך חשבון עדיין?{' '}
        <Link href="/signup" className="font-bold underline">
          הרשמה
        </Link>
      </p>
    </form>
  )
}
