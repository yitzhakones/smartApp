import type { CSSProperties, ReactNode } from 'react'
import { CARD } from '../theme'

// The one shared surface primitive from the mockup — a white rounded panel with
// a soft shadow. Presentational only (no hooks), so it composes into both server
// and client components.
export function Card({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: CARD, boxShadow: '0 1px 3px rgba(20,23,43,0.06)', ...style }}
    >
      {children}
    </div>
  )
}
