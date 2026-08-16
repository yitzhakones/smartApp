import { ChevronRight } from 'lucide-react'
import { INK, SOFT, CARD, RUBIK, SETTINGS_TAP } from '../theme'

// Shared header for every settings sub-screen (SettingsMenu/EditChild/
// Notifications/Account/Presets) — a back chevron + title, matching the mockup.
export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="px-4 pt-5 pb-3 flex items-center gap-2">
      <button
        onClick={onBack}
        className={`${SETTINGS_TAP.circleBtn} rounded-full flex items-center justify-center`}
        style={{ background: CARD, border: '1px solid #e4e2d8' }}
        aria-label="חזרה"
      >
        <ChevronRight size={18} color={SOFT} />
      </button>
      <p style={{ color: INK, fontFamily: RUBIK }} className="font-black text-lg">
        {title}
      </p>
    </div>
  )
}
