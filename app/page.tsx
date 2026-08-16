import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/app/landing/landing-page'

// Authenticated parents skip straight to the dashboard (where the consent
// gate then applies), exactly as before. Everyone else now sees the public
// marketing page instead of being redirected to /login.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
