import type { Metadata } from 'next'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'הרשמה — חידון יומי',
}

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-4 text-center text-lg font-bold">יצירת חשבון הורה</h2>
      <SignupForm />
    </>
  )
}
