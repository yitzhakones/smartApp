import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal/legal-page'
import { TERMS_HE, TERMS_EN } from '@/app/legal/content'

export const metadata: Metadata = {
  title: 'תנאי שימוש — Tzuffix',
}

// Content lives in app/legal/content.ts (TERMS_HE / TERMS_EN).
export default function TermsPage() {
  return <LegalPage heDoc={TERMS_HE} enDoc={TERMS_EN} backHref="/signup" />
}
