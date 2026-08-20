import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal/legal-page'
import { PRIVACY_HE, PRIVACY_EN } from '@/app/legal/content'

export const metadata: Metadata = {
  title: 'מדיניות פרטיות — Tzuffix',
}

// Content sourced verbatim from docs/terms-and-privacy-draft.md — still a
// DRAFT pending legal review before this goes fully live (see that doc's
// warning note, deliberately not rendered here).
export default function PrivacyPage() {
  return <LegalPage heDoc={PRIVACY_HE} enDoc={PRIVACY_EN} backHref="/signup" />
}
