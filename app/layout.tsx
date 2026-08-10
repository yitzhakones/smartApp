import type { Metadata, Viewport } from 'next'
import './globals.css'

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
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
