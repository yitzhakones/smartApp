'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { acceptConsentAction } from './actions'

const initialState: { error?: string } = {}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-2 w-full rounded-xl bg-[#14172b] px-4 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? 'שומרים…' : 'אני מאשר/ת וממשיך/ה'}
    </button>
  )
}

export function ConsentForm() {
  const [state, formAction] = useFormState(acceptConsentAction, initialState)
  const [consented, setConsented] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span>
          אני ההורה/האפוטרופוס החוקי, ואני מסכים/ה ל
          <Link href="/terms" target="_blank" className="font-bold underline">
            תנאי השימוש
          </Link>{' '}
          ול
          <Link href="/privacy" target="_blank" className="font-bold underline">
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
    </form>
  )
}
