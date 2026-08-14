'use client'

import { Settings } from 'lucide-react'
import { INK, SOFT, CARD } from '../theme'

// Top bar: one pill per child (lightweight switcher, one login — never a
// re-login per child) plus the settings gear. The gear's target screens
// (SettingsMenu / EditChild / …) are a separate follow-up task, so it's rendered
// for design parity but intentionally inert here — `onOpenSettings` is optional
// and left unwired until that task lands.
export function TabSwitcher({
  items,
  activeId,
  onSelect,
  onOpenSettings,
}: {
  items: { id: string; name: string }[]
  activeId: string
  onSelect: (id: string) => void
  onOpenSettings?: () => void
}) {
  return (
    <div className="px-4 pt-5 pb-2 flex gap-2 items-center">
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="flex-1 rounded-2xl py-2.5 text-center font-black text-sm"
          style={{
            background: activeId === c.id ? INK : CARD,
            color: activeId === c.id ? 'white' : INK,
            border: activeId === c.id ? 'none' : '1px solid #e4e2d8',
          }}
        >
          {c.name}
        </button>
      ))}
      <button
        onClick={onOpenSettings}
        className="relative w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: CARD, border: '1px solid #e4e2d8' }}
        aria-label="הגדרות"
      >
        <Settings size={16} color={SOFT} />
      </button>
    </div>
  )
}
