import type { Metadata } from 'next'
import { LoginForm } from './login-form'
import { INK, RUBIK } from '../theme'

export const metadata: Metadata = {
  title: 'התחברות — חידון יומי',
}

export default function LoginPage() {
  return (
    <>
      <h2 style={{ color: INK, fontFamily: RUBIK }} className="mb-5 text-center text-xl font-black">
        התחברות
      </h2>
      <LoginForm />
    </>
  )
}
