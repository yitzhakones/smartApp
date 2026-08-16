'use client'

import { useState } from 'react'
import type { ParentAccount } from '@/lib/dashboard/account-service'
import { signOutAction } from '@/app/(auth)/actions'
import { updateAccountSettings } from '../actions'
import { Card } from './card'
import { ScreenHeader } from './screen-header'
import { SHELL, INK, PAPER, CARD, SOFT, ASSISTANT, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

// The mockup never wires this screen's fields to persistence at all (pure
// local state). Explicit save button, matching EditChildScreen — every save
// action already built in this dashboard (withdrawal, bonus, override, edit
// child) uses an explicit confirm/save button, never autosave-on-blur, so this
// stays consistent rather than introducing a second save pattern.
export function AccountSettingsScreen({
  account,
  onBack,
  onSaved,
}: {
  account: ParentAccount
  onBack: () => void
  onSaved: (patch: { locale: ParentAccount['locale']; whatsappNumber: string | null; email: boolean }) => void
}) {
  const [locale, setLocale] = useState(account.locale)
  const [whatsapp, setWhatsapp] = useState(account.whatsappNumber ?? '')
  const [emailOn, setEmailOn] = useState(account.notificationPrefs.email)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setPending(true)
    setError(null)
    setSaved(false)
    const res = await updateAccountSettings({ locale, whatsappNumber: whatsapp, emailNotifications: emailOn })
    setPending(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onSaved({ locale, whatsappNumber: res.whatsappNumber, email: emailOn })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div dir="rtl" style={SHELL}>
      <ScreenHeader title="הגדרות חשבון" onBack={onBack} />
      <div className="px-4 flex flex-col gap-4 pb-28">
        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            שפת הדשבורד
          </p>
          <div className="flex gap-2">
            {(
              [
                ['he', 'עברית'],
                ['en', 'English'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLocale(key)}
                className={`flex-1 ${SETTINGS_TAP.buttonPadY} rounded-2xl font-black ${SETTINGS_TEXT.button}`}
                style={{
                  background: locale === key ? INK : CARD,
                  color: locale === key ? 'white' : INK,
                  border: locale === key ? 'none' : '1px solid #e4e2d8',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`font-bold mb-1.5 ${SETTINGS_TEXT.caption}`}>
            מספר וואטסאפ (לתשתית התראות עתידית)
          </p>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="05X-XXXXXXX"
            className={`w-full rounded-2xl px-4 py-3.5 ${SETTINGS_TEXT.input}`}
            style={{ background: CARD, border: '1px solid #e4e2d8', color: INK }}
          />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
              התראות בתוך האפליקציה
            </span>
            <span
              className={`font-bold px-2.5 py-1 rounded-full ${SETTINGS_TEXT.caption}`}
              style={{ background: '#8FCB1F22', color: '#5a8a10' }}
            >
              תמיד פעיל
            </span>
          </div>
          <div className="flex items-center justify-between mb-1" style={{ borderTop: '1px solid #f0eee4', paddingTop: 12 }}>
            <span style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
              התראות במייל
            </span>
            <button
              onClick={() => setEmailOn((v) => !v)}
              style={{ width: 46, height: 26, borderRadius: 99, background: emailOn ? '#1FAE7A' : '#e4e2d8', position: 'relative' }}
              aria-label="התראות במייל"
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  background: 'white',
                  position: 'absolute',
                  top: 2,
                  [emailOn ? 'right' : 'left']: 2,
                  transition: 'all .2s',
                }}
              />
            </button>
          </div>
          <div
            className="flex items-center justify-between opacity-40"
            style={{ borderTop: '1px solid #f0eee4', paddingTop: 12, marginTop: 12 }}
          >
            <span style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
              התראות בוואטסאפ
            </span>
            <span className={`font-bold ${SETTINGS_TEXT.caption}`} style={{ color: SOFT }}>
              בקרוב
            </span>
          </div>
        </Card>

        {/* Sign-out lives here now that account settings is a real screen —
            was a temporary link at the bottom of the whole dashboard page. */}
        <form action={signOutAction}>
          <button type="submit" className={`font-bold underline ${SETTINGS_TEXT.caption}`} style={{ color: SOFT }}>
            התנתקות
          </button>
        </form>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ maxWidth: 440, margin: '0 auto', background: PAPER, borderTop: '1px solid #e4e2d8' }}
      >
        {error && (
          <p style={{ color: '#E24B4B', fontFamily: ASSISTANT }} className={`text-center mb-2 ${SETTINGS_TEXT.caption}`}>
            {error}
          </p>
        )}
        <button
          onClick={save}
          disabled={pending}
          className={`w-full ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button} disabled:opacity-50`}
          style={{ background: saved ? '#1FAE7A' : INK, color: 'white' }}
        >
          {pending ? 'שומר…' : saved ? 'נשמר!' : 'שמירת שינויים'}
        </button>
      </div>
    </div>
  )
}
