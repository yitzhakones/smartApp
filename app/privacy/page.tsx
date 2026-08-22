import type { Metadata } from 'next'
import { LegalPage } from '@/app/legal/legal-page'
import { PRIVACY_HE, PRIVACY_EN } from '@/app/legal/content'

export const metadata: Metadata = {
  title: 'מדיניות פרטיות — Tzuffix',
}

// Content lives in app/legal/content.ts (PRIVACY_HE / PRIVACY_EN).
export default function PrivacyPage() {
  return <LegalPage heDoc={PRIVACY_HE} enDoc={PRIVACY_EN} backHref="/signup" />
}
