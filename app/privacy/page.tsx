import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'מדיניות פרטיות — חידון יומי',
}

// PLACEHOLDER — final Privacy Policy copy to be supplied and dropped in here.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-black">מדיניות פרטיות</h1>
      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        טקסט זמני — תוכן מדיניות הפרטיות הסופי יסופק ויוטמע כאן.
      </p>
      <p className="mt-6 text-sm opacity-70">
        (Placeholder — final Privacy Policy document pending.)
      </p>
      <Link href="/signup" className="mt-8 inline-block text-sm font-bold underline">
        חזרה להרשמה
      </Link>
    </main>
  )
}
