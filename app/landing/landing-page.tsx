'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Globe } from 'lucide-react'
import { LANDING_STRINGS, type Locale } from './strings'
import { DashboardPreview } from './components/dashboard-preview'
import { HowItWorks } from './components/how-it-works'
import { INK, PAPER, LIME_BRIGHT, FUCHSIA, SOFT, RUBIK, ASSISTANT } from './theme'

// Public landing page for signed-out visitors (docs → app/page.tsx routes
// authenticated users straight to /dashboard before this ever renders).
// Ported from landing-page-light-mockup.tsx — layout, spacing, copy, and
// colors are locked; the only things actually wired to the real app are
// navigation (sign up / log in), the "How it works" CTA smooth-scrolling to
// its own section on this page, and the locale + reward-stepper interactivity
// the mockup already specified as client state.
//
// Fonts: no runtime <style>@import> (that caused a hydration mismatch
// earlier) — Rubik/Assistant are already loaded via next/font/google in the
// root layout and referenced here through the CSS variables it sets.
export function LandingPage() {
  const [locale, setLocale] = useState<Locale>('he')
  const [perStar, setPerStar] = useState(1)
  const t = LANDING_STRINGS[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const howItWorksRef = useRef<HTMLDivElement>(null)

  function scrollToHowItWorks() {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div dir={dir} style={{ background: PAPER, minHeight: '100vh', fontFamily: RUBIK }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div style={{ width: 34, height: 34, borderRadius: 10, background: INK, transform: 'rotate(45deg)' }} />
          <p style={{ color: INK, fontFamily: RUBIK }} className="text-xl font-black">
            Tzuffix
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocale((l) => (l === 'he' ? 'en' : 'he'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm"
            style={{ background: 'white', border: `2px solid ${INK}`, color: INK }}
          >
            <Globe size={14} /> {locale === 'he' ? 'EN' : "עב'"}
          </button>
          <Link href="/login" style={{ color: INK, fontFamily: ASSISTANT }} className="text-base font-bold">
            {t.login}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 pt-8 pb-10">
        <p style={{ color: INK, fontFamily: RUBIK, lineHeight: 1.15 }} className="text-5xl font-black mb-5">
          {t.headlineA}
          <br />
          <span style={{ color: FUCHSIA }}>{t.headlineB}</span>
        </p>
        <p style={{ color: '#3A3F52', fontFamily: ASSISTANT }} className="text-lg leading-relaxed mb-8 max-w-sm">
          {t.subtitle}
        </p>
        <div className="flex flex-col gap-3 max-w-xs">
          <Link
            href="/signup"
            className="py-4 rounded-2xl font-black text-lg text-center"
            style={{ background: INK, color: LIME_BRIGHT }}
          >
            {t.cta1}
          </Link>
          <button
            onClick={scrollToHowItWorks}
            className="py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2"
            style={{ background: 'white', color: INK, border: `2px solid ${INK}` }}
          >
            {t.cta2} <ArrowLeft size={18} style={{ transform: locale === 'en' ? 'scaleX(-1)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Reward-config + stat - compact side-by-side, not stacked */}
      <div className="px-6 pb-10 grid grid-cols-2 gap-3">
        <div className="rounded-3xl p-4" style={{ background: 'white', border: `2px solid ${INK}` }}>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold mb-3 leading-snug">
            {t.rewardLabel}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPerStar((v) => Math.min(20, v + 1))}
              className="w-9 h-9 rounded-full font-black text-lg shrink-0"
              style={{ background: INK, color: LIME_BRIGHT }}
            >
              +
            </button>
            <div className="text-center">
              <p style={{ color: FUCHSIA, fontFamily: RUBIK }} className="text-2xl font-black leading-none">
                ₪{perStar}
              </p>
            </div>
            <button
              onClick={() => setPerStar((v) => Math.max(1, v - 1))}
              className="w-9 h-9 rounded-full font-black text-lg shrink-0"
              style={{ background: PAPER, color: INK, border: `2px solid ${INK}` }}
            >
              −
            </button>
          </div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-[11px] font-bold mt-2 text-center">
            {t.rewardValue}
          </p>
        </div>

        <div className="rounded-3xl p-4 flex flex-col justify-center" style={{ background: LIME_BRIGHT, border: `2px solid ${INK}` }}>
          <p style={{ color: INK, fontFamily: RUBIK }} className="text-4xl font-black">
            {t.statNum}
          </p>
          <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-bold mt-1">
            {t.statLabel}
          </p>
        </div>
      </div>

      {/* Dashboard "screenshot" preview - mirrors the real product's dashboard
          card + trend card, but is illustrative sample data, not a live fetch. */}
      <DashboardPreview t={t} />

      <div ref={howItWorksRef}>
        <HowItWorks t={t} />
      </div>

      {/* Trust strip */}
      <div className="px-6 pb-8">
        <div className="rounded-3xl p-5 text-center" style={{ background: INK }}>
          <p
            style={{ color: 'white', fontFamily: ASSISTANT, whiteSpace: 'pre-line' }}
            className="text-base leading-relaxed font-bold"
          >
            {t.trust}
          </p>
        </div>
      </div>

      <div className="px-6 pb-14">
        <Link
          href="/signup"
          className="w-full py-4 rounded-2xl font-black text-lg text-center block"
          style={{ background: FUCHSIA, color: 'white' }}
        >
          {t.finalCta}
        </Link>
      </div>
    </div>
  )
}
