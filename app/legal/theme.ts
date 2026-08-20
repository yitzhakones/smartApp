// Visual tokens for the public legal pages (/terms, /privacy), matching the
// landing page, dashboard, and auth screens exactly (app/landing/theme.ts,
// app/(protected)/dashboard/theme.ts, app/(auth)/theme.ts). Kept in its own
// file rather than importing one of those, same reasoning as each of them:
// every area owns its own tokens independently even though the values are
// identical by design. Not a route itself — no page.tsx lives directly under
// app/legal, so this folder never becomes a URL.

export const INK = '#14172B'
export const PAPER = '#FBF7EE'
export const FUCHSIA = '#D6127A'
export const SOFT = '#6B7299'
export const CARD = '#FFFFFF'
export const BORDER = '#e4e2d8'
export const AMBER = '#C97A00'

export const RUBIK = 'var(--font-rubik), system-ui'
export const ASSISTANT = 'var(--font-assistant), system-ui'
