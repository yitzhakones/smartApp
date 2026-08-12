import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/app/(auth)/actions'

export const metadata: Metadata = {
  title: 'לוח הורים — חידון יומי',
}

// Placeholder landing for authenticated + consented parents. The real parent
// dashboard (children tabs, stats, bonus panel, etc.) is built in later steps;
// this exists so the consent gate has a protected route to guard.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">לוח הורים</h1>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium"
          >
            התנתקות
          </button>
        </form>
      </div>
      <p className="mt-4 text-sm opacity-70">
        מחוברים בתור <span dir="ltr">{user?.email}</span>. הלוח המלא ייבנה בשלבים
        הבאים.
      </p>
    </main>
  )
}
