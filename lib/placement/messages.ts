// =============================================================================
// lib/placement/messages.ts — neutral placement copy, keyed by locale.
//
// Placement shows NO score and NO correct/incorrect feedback in the moment
// (no confetti, no colour flash, no "wrong" framing) — it's diagnostic plumbing,
// not a reward moment, and revealing a result would risk making it feel like a
// test the child can fail. Between questions we show only a neutral, encouraging
// beat; at the end, a neutral "let's start" with no number or grade ever shown.
//
// Placement copy references no gendered verbs, so unlike the main child UI it
// needs only a [locale] axis (no [gender] axis). If that changes, add the axis
// here rather than at call sites.
// =============================================================================

import type { Locale } from '@/types/database'

interface PlacementCopy {
  /** Shown briefly between questions — never implies right/wrong. */
  betweenQuestions: string
  /** Shown once the whole placement completes — no score, ever. */
  completed: string
}

const COPY: Record<Locale, PlacementCopy> = {
  he: {
    betweenQuestions: 'תודה! הבאה',
    completed: 'מעולה, מתחילים!',
  },
  en: {
    betweenQuestions: 'Thanks! Next',
    completed: "Great, let's start!",
  },
}

export function placementCopy(locale: Locale): PlacementCopy {
  return COPY[locale]
}
