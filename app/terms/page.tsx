import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal/legal-page'
import { TERMS_HE, TERMS_EN } from '@/app/legal/content'

export const metadata: Metadata = {
  title: 'תנאי שימוש — Tzuffix',
}

// Content sourced verbatim from docs/terms-and-privacy-draft.md — still a
// DRAFT pending legal review before this goes fully live (see that doc's
// warning note, deliberately not rendered here).
export default function TermsPage() {
  return <LegalPage heDoc={TERMS_HE} enDoc={TERMS_EN} backHref="/signup" />
}
