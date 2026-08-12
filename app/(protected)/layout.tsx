import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * THE CONSENT GATE (server-side, DB-backed).
 *
 * Every route placed under the (protected) group inherits this layout, so the
 * gate is enforced on the server for all of them — not a client-side UI block
 * that can be bypassed. Two checks, in order:
 *   1. Authenticated?               no  → /login
 *   2. consent_accepted_at set?     no  → /consent
 *
 * The consent state is read fresh from the parents row on every navigation, so
 * revoking/clearing it in the DB immediately locks the account out. To add a new
 * protected page, just place it under app/(protected)/ — it is gated automatically.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (!parent?.consent_accepted_at) {
    redirect('/consent')
  }

  return <>{children}</>
}
