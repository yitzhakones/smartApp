'use client'

import { X } from 'lucide-react'
import { ShareLinkCard } from './share-link-card'
import { CARD, INK, FUCHSIA, SOFT, RUBIK, ASSISTANT } from '../theme'

// Shown once, right after a child is created (either entry point — the
// empty-dashboard state or SettingsMenu's "add another child" — both land
// here now instead of the child's own /p/[token] screens; see createChild's
// comment in actions.ts). The point is to make the share link immediately
// visible and prominent, not require digging into settings to find it.
export function NewChildBanner({
  childName,
  shareUrl,
  onDismiss,
}: {
  childName: string
  shareUrl: string
  onDismiss: () => void
}) {
  return (
    <div className="rounded-3xl p-4" style={{ background: CARD, border: `2px solid ${FUCHSIA}` }}>
      <div className="flex items-start justify-between mb-1">
        <p style={{ color: INK, fontFamily: RUBIK }} className="font-black text-base">
          🎉 {childName} נוסף/ה בהצלחה!
        </p>
        <button onClick={onDismiss} aria-label="סגירה" className="shrink-0 p-1">
          <X size={18} color={SOFT} />
        </button>
      </div>
      <p style={{ color: FUCHSIA, fontFamily: ASSISTANT }} className="text-sm font-bold mb-3">
        שתפו את הקישור עם הילד/ה
      </p>
      <ShareLinkCard url={shareUrl} childName={childName} />
    </div>
  )
}
