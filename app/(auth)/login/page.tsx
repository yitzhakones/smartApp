import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'התחברות — חידון יומי',
}

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-4 text-center text-lg font-bold">התחברות</h2>
      <LoginForm />
    </>
  )
}
