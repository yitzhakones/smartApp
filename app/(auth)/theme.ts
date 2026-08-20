// Visual tokens for the public auth screens (login/signup), matching the
// landing page and dashboard exactly (app/landing/theme.ts,
// app/(protected)/dashboard/theme.ts). Kept in its own file rather than
// importing either of those: each route group owns its tokens independently
// (same reasoning as landing/theme.ts's header comment) even though the
// values themselves are identical by design. Fonts reference the next/font
// CSS variables set on <html> in the root layout (var(--font-rubik) /
// var(--font-assistant)) — never a runtime <style>@import>.

export const INK = '#14172B'
export const PAPER = '#FBF7EE'
export const LIME_BRIGHT = '#C6FF3D'
export const FUCHSIA = '#D6127A'
export const AMBER = '#C97A00'
export const SOFT = '#6B7299'
export const CARD = '#FFFFFF'
export const BORDER = '#e4e2d8'
export const DANGER = '#E24B4B'

export const RUBIK = 'var(--font-rubik), system-ui'
export const ASSISTANT = 'var(--font-assistant), system-ui'
