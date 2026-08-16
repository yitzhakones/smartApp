'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { CARD, PAPER, INK, SOFT, ASSISTANT, SETTINGS_TEXT, SETTINGS_TAP } from '../theme'

// The one-time shareable link a parent sends their child once (docs → "Child
// access"): app.com/p/{access_token}. Copy button + a WhatsApp share button
// (wa.me with the link pre-filled — opens WhatsApp's own contact picker,
// doesn't target a specific number). Not part of the mockup; a real gap the
// token already covers server-side, this just surfaces it.
export function ShareLinkCard({ url, childName }: { url: string; childName: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can fail (no permission, insecure context) — the link
      // text stays visible/selectable either way, so nothing is actually lost.
    }
  }

  const whatsappText = `היי! הנה הקישור האישי שלך למשחק היומי 🎉\n${url}`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`

  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: '1px solid #e4e2d8' }}>
      <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold mb-1 ${SETTINGS_TEXT.body}`}>
        קישור אישי ל{childName}
      </p>
      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`mb-3 ${SETTINGS_TEXT.caption}`}>
        לשליחה חד-פעמית - {childName} מוסיפ/ה אותו למסך הבית ולא צריכ/ה להקליד שוב
      </p>

      <div
        dir="ltr"
        className={`w-full rounded-xl px-3 py-3 mb-3 break-all ${SETTINGS_TEXT.caption}`}
        style={{ background: PAPER, border: '1px solid #e4e2d8', color: INK, fontFamily: 'monospace' }}
      >
        {url}
      </div>

      <div className="flex gap-2">
        <button
          onClick={copy}
          className={`flex-1 flex items-center justify-center gap-1.5 ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button}`}
          style={{ background: copied ? '#1FAE7A' : INK, color: 'white' }}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'הועתק!' : 'העתקת קישור'}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1.5 ${SETTINGS_TAP.buttonPadY} rounded-full font-black ${SETTINGS_TEXT.button}`}
          style={{ background: '#25D366', color: 'white' }}
        >
          <MessageCircle size={18} /> שיתוף בוואטסאפ
        </a>
      </div>
    </div>
  )
}
