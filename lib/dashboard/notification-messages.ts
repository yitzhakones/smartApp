// Notification display copy. The notifications table stores no message text
// (see migration 012's comment) or the specific number/amount that triggered
// it (e.g. which star milestone, how much a weekly bonus paid) — those aren't
// captured anywhere at insert time, so a generic per-trigger-type message is
// the honest option here rather than fabricating a number. Gendered per the
// CHILD's gender (known, unlike the parent's) — mirrors the doc's own
// weekly-bonus example ("הבת שלך השתפרה השבוע"). Hebrew-only, matching every
// other dashboard piece built so far (the dashboard has no locale branching
// yet — a separate, not-yet-started scope).

import type { Gender, NotificationTrigger } from '@/types/database'

type Template = (childName: string) => string

const MESSAGES: Record<NotificationTrigger, Record<Gender, Template>> = {
  star_milestone: {
    female: (name) => `${name} עברה אבן דרך בכוכבים! 🎉`,
    male: (name) => `${name} עבר אבן דרך בכוכבים! 🎉`,
  },
  weekly_bonus: {
    female: (name) => `${name} השתפרה השבוע וקיבלה בונוס שיפור! 🎉`,
    male: (name) => `${name} השתפר השבוע וקיבל בונוס שיפור! 🎉`,
  },
  correct_answer: {
    female: (name) => `${name} ענתה נכון על שאלה! ✅`,
    male: (name) => `${name} ענה נכון על שאלה! ✅`,
  },
}

export function notificationMessage(
  triggerType: NotificationTrigger,
  childName: string,
  gender: Gender
): string {
  return MESSAGES[triggerType][gender](childName)
}
