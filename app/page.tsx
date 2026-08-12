import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Route to the right place: authenticated parents go to the dashboard (where the
// consent gate then applies); everyone else lands on login.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/dashboard' : '/login')
}
