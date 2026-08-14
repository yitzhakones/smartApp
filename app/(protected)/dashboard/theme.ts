// Shared visual tokens for the parent dashboard, lifted verbatim from the
// approved mockup (docs/parent-dashboard-mockup.jsx) so every piece renders
// identically. Fonts reference the next/font CSS variables from the root layout
// (var(--font-rubik) / var(--font-assistant)) instead of the mockup's runtime
// @import — the app self-hosts them to avoid the hydration mismatch a runtime
// font import caused earlier. One-off accent hexes used by a single element
// (e.g. #C6FF3D, #1FAE7A) stay inline at their call site, matching the mockup.

export const INK = '#14172B'
export const PAPER = '#FBF7EE'
export const FUCHSIA = '#D6127A'
export const SOFT = '#6B7299'
export const CARD = '#FFFFFF'

export const RUBIK = "var(--font-rubik), system-ui"
export const ASSISTANT = "var(--font-assistant), system-ui"

// The mobile-frame shell shared by every dashboard screen.
export const SHELL = {
  background: PAPER,
  minHeight: '100vh',
  maxWidth: 440,
  margin: '0 auto',
  fontFamily: RUBIK,
} as const
