import type { Metadata } from 'next'
import { SignupForm } from './signup-form'
import { INK, RUBIK } from '../theme'

export const metadata: Metadata = {
  title: 'הרשמה — חידון יומי',
}

export default function SignupPage() {
  return (
    <>
      <h2 style={{ color: INK, fontFamily: RUBIK }} className="mb-5 text-center text-xl font-black">
        יצירת חשבון הורה
      </h2>
      <SignupForm />
    </>
  )
}
