import { INK, PAPER, CARD, BORDER, RUBIK } from './theme'

// Shell for /login and /signup — same visual system as the landing page and
// dashboard: PAPER background, a white rounded-2xl card, Rubik headings. The
// header mirrors the landing page's own header exactly (rotated-square INK
// diamond + "Tzuffix" wordmark) instead of the old generic "חידון יומי 🎯"
// text, so the brand mark is consistent from the very first screen a parent
// sees through to the one they land on.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main
      dir="rtl"
      style={{ background: PAPER, minHeight: '100vh', fontFamily: RUBIK }}
      className="flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div
            style={{ width: 34, height: 34, borderRadius: 10, background: INK, transform: 'rotate(45deg)' }}
          />
          <p style={{ color: INK, fontFamily: RUBIK }} className="text-xl font-black">
            Tzuffix
          </p>
        </div>
        <div
          className="rounded-2xl p-6"
          style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(20,23,43,0.06)' }}
        >
          {children}
        </div>
      </div>
    </main>
  )
}
