'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Record consent for the currently-authenticated parent. Uses the auth'd client
 * so RLS ("Parent updates own row") scopes the write to their own row.
 */
export async function acceptConsentAction(
  _prev: { error?: string },
  _formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('parents')
    .update({ consent_accepted_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
