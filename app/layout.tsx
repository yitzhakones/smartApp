import type { Metadata, Viewport } from 'next'
import { Rubik, Assistant } from 'next/font/google'
import './globals.css'

// Self-hosted via next/font (no runtime @import → no hydration mismatch, not
// render-blocking). Exposed as CSS variables so inline styles can reference
// var(--font-rubik) / var(--font-assistant).
const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '700', '900'],
  variable: '--font-rubik',
  display: 'swap',
})
const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '700'],
  variable: '--font-assistant',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'חידון יומי — פרסים',
  description: 'טריוויה יומית לילדים עם פרסים שההורים מגדירים',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'חידון',
  },
}

export const viewport: Viewport = {
  themeColor: '#14172b',
  width: 'device-width',
  initialScale: 1,
}

// Default locale/direction is Hebrew; per-child routes will override
// `lang`/`dir` at their own layout level once localization lands.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
