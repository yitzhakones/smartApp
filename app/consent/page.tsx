import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConsentForm } from './consent-form'

export const metadata: Metadata = {
  title: 'אישור תנאים — חידון יומי',
}

/**
 * Where the consent gate sends an authenticated parent whose consent_accepted_at
 * is still null (an edge case, since signup captures consent — e.g. a row created
 * out-of-band, or consent later cleared). Requires auth (middleware) but is NOT
 * itself consent-gated, so there's no redirect loop.
 */
export default async function ConsentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('consent_accepted_at')
    .eq('id', user.id)
    .single()

  // Already consented → nothing to do here.
  if (parent?.consent_accepted_at) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/10 p-6 shadow-sm">
        <h1 className="text-xl font-black">כמעט שם</h1>
        <p className="mt-2 text-sm opacity-70">
          כדי להשתמש בחשבון יש לאשר את התנאים. זהו שער חובה — לא ניתן להמשיך בלי
          אישור.
        </p>
        <div className="mt-5">
          <ConsentForm />
        </div>
      </div>
    </main>
  )
}
