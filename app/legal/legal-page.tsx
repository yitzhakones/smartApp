'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import type { LegalBlock, LegalDoc, Locale } from './content'
import { INK, PAPER, CARD, BORDER, SOFT, FUCHSIA, RUBIK, ASSISTANT } from './theme'

// Shared renderer for /terms and /privacy — same visual system as the
// landing page and auth screens (PAPER background, white rounded-2xl card,
// Rubik headings, the rotated-square Tzuffix mark) plus the landing page's
// own he/en locale toggle. Content comes from ./content.ts, sourced verbatim
// from docs/terms-and-privacy-draft.md; this file only lays it out.

// Turns `**bold**` spans into <strong>; everything else renders as plain text.
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={i}>{chunk.slice(2, -2)}</strong>
    }
    return <span key={i}>{chunk}</span>
  })
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'list') {
    return (
      <ul className="list-disc pe-5 flex flex-col gap-1.5">
        {block.items.map((item) => (
          <li key={item} style={{ color: '#3A3F52', fontFamily: ASSISTANT }} className="text-[15px] leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p style={{ color: '#3A3F52', fontFamily: ASSISTANT }} className="text-[15px] leading-relaxed">
      {renderInline(block.text)}
    </p>
  )
}

function Document({ doc }: { doc: LegalDoc }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ color: INK, fontFamily: RUBIK }} className="text-2xl font-black mb-1">
          {doc.title}
        </h1>
        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-sm font-bold">
          {doc.lastUpdatedLabel}
        </p>
      </div>
      {doc.sections.map((section) => (
        <div key={section.heading} className="flex flex-col gap-2">
          <h2 style={{ color: INK, fontFamily: RUBIK }} className="text-lg font-black">
            {section.heading}
          </h2>
          <div className="flex flex-col gap-2">
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LegalPage({
  heDoc,
  enDoc,
  backHref,
}: {
  heDoc: LegalDoc
  enDoc: LegalDoc
  backHref: string
}) {
  const [locale, setLocale] = useState<Locale>('he')
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const doc = locale === 'he' ? heDoc : enDoc
  const backLabel = locale === 'he' ? 'חזרה' : 'Back'

  return (
    <div dir={dir} style={{ background: PAPER, minHeight: '100vh', fontFamily: RUBIK }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <Link href="/" className="flex items-center gap-2">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: INK, transform: 'rotate(45deg)' }} />
          <p style={{ color: INK, fontFamily: RUBIK }} className="text-lg font-black">
            Tzuffix
          </p>
        </Link>
        <button
          onClick={() => setLocale((l) => (l === 'he' ? 'en' : 'he'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm"
          style={{ background: CARD, border: `2px solid ${INK}`, color: INK }}
        >
          <Globe size={14} /> {locale === 'he' ? 'EN' : "עב'"}
        </button>
      </div>

      <div className="px-6 pb-10 mx-auto" style={{ maxWidth: 640 }}>
        <div
          className="rounded-2xl p-6 mt-4"
          style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: '0 1px 3px rgba(20,23,43,0.06)' }}
        >
          <Document doc={doc} />
        </div>

        <Link
          href={backHref}
          style={{ color: FUCHSIA, fontFamily: ASSISTANT }}
          className="mt-6 inline-block font-bold underline text-sm"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
