'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface AuthFormState {
  error?: string
  /** Signup succeeded but the email needs confirming before a session exists. */
  needsConfirmation?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const whatsapp = String(formData.get('whatsapp') ?? '').trim()
  // The consent box is the hard gate — validated server-side, never trusting the
  // client to have blocked submission.
  const consent = formData.get('consent') === 'on'

  if (!EMAIL_RE.test(email)) {
    return { error: 'כתובת אימייל לא תקינה' }
  }
  if (password.length < 8) {
    return { error: 'הסיסמה חייבת להכיל לפחות 8 תווים' }
  }
  if (!consent) {
    return { error: 'יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    return { error: error.message }
  }
  const userId = data.user?.id
  if (!userId) {
    return { error: 'יצירת החשבון נכשלה, נסו שוב' }
  }

  // Persist consent (and optional WhatsApp) via the service role so it's recorded
  // even when email confirmation is on and no session exists yet. The parents row
  // was created by the handle_new_parent trigger during signUp.
  const admin = createServiceClient()
  const { error: updateError } = await admin
    .from('parents')
    .update({
      consent_accepted_at: new Date().toISOString(),
      whatsapp_number: whatsapp || null,
    })
    .eq('id', userId)
  if (updateError) {
    return { error: updateError.message }
  }

  // Auto-confirm on → we already have a session; go straight in.
  if (data.session) {
    redirect('/dashboard')
  }
  // Email confirmation required → let the UI tell them to check their inbox.
  return { needsConfirmation: true }
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'יש להזין אימייל וסיסמה' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'אימייל או סיסמה שגויים' }
  }

  redirect('/dashboard')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
