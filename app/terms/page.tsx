import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'תנאי שימוש — חידון יומי',
}

// PLACEHOLDER — final Terms of Service copy to be supplied and dropped in here.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-black">תנאי שימוש</h1>
      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        טקסט זמני — תוכן תנאי השימוש הסופי יסופק ויוטמע כאן.
      </p>
      <p className="mt-6 text-sm opacity-70">
        (Placeholder — final Terms of Service document pending.)
      </p>
      <Link href="/signup" className="mt-8 inline-block text-sm font-bold underline">
        חזרה להרשמה
      </Link>
    </main>
  )
}
