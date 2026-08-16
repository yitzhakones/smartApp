import { Bell, ChevronDown, Globe, Sparkles, User } from 'lucide-react'
import { Card } from './card'
import { ScreenHeader } from './screen-header'
import { SHELL, INK, SOFT, PAPER, FUCHSIA, ASSISTANT, SETTINGS_TEXT } from '../theme'

export type SettingsScreen = 'settings' | 'edit-child' | 'notifications' | 'account' | 'presets'

const ITEMS: { key: SettingsScreen; icon: typeof Sparkles; label: string; desc: string }[] = [
  { key: 'presets', icon: Sparkles, label: 'ניהול תגמולים מהירים', desc: "הצ'יפים בפאנל שליחת בונוס" },
  { key: 'edit-child', icon: User, label: 'עריכת פרופיל ילד/ה', desc: 'שם, קטגוריות, ₪, גישה' },
  { key: 'notifications', icon: Bell, label: 'התראות', desc: 'עדכונים ובונוסים שהתקבלו' },
  { key: 'account', icon: Globe, label: 'הגדרות חשבון', desc: 'שפה, וואטסאפ, העדפות' },
]

export function SettingsMenu({
  onBack,
  onNavigate,
}: {
  onBack: () => void
  onNavigate: (screen: SettingsScreen) => void
}) {
  return (
    <div dir="rtl" style={SHELL}>
      <ScreenHeader title="הגדרות" onBack={onBack} />
      <div className="px-4 flex flex-col gap-2 pb-24">
        {ITEMS.map((it) => (
          <button key={it.key} onClick={() => onNavigate(it.key)} className="w-full">
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: PAPER }}>
                    <it.icon size={20} color={FUCHSIA} />
                  </div>
                  <div className="text-right">
                    <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
                      {it.label}
                    </p>
                    <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={SETTINGS_TEXT.caption}>
                      {it.desc}
                    </p>
                  </div>
                </div>
                <ChevronDown size={18} color={SOFT} style={{ transform: 'rotate(90deg)' }} />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
