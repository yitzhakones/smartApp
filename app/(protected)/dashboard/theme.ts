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

// Text/tap-target scale for the SETTINGS screens only (SettingsMenu,
// EditChildScreen, NotificationsScreen, AccountSettingsScreen, PresetsScreen).
// Same palette, spacing rhythm, and component shapes as the rest of the
// mockup — every class here is just one step up from what the mockup uses at
// that role, because parents read and edit exact values here (not glancing at
// a stat), so legibility matters more than density on these screens
// specifically. The main dashboard cards (summary/trend/bonus/activity) are
// untouched and keep the mockup's original sizes.
export const SETTINGS_TEXT = {
  caption: 'text-sm', // field labels / helper captions (mockup: text-xs / text-[11px])
  body: 'text-base', // row labels, descriptions, toggle rows (mockup: text-sm)
  button: 'text-base', // button labels (mockup: text-sm)
  value: 'text-3xl', // big stepper values, e.g. ₪ amounts (mockup: text-2xl)
  input: 'text-lg', // text input values (mockup: text-base/text-sm)
  pin: 'text-2xl', // PIN entry (mockup: text-xl)
} as const

// Larger tap targets for the same screens: buttons get a touch more vertical
// padding, icon-only circular buttons get a touch more diameter.
export const SETTINGS_TAP = {
  buttonPadY: 'py-3.5', // mockup: py-2.5 / py-3
  circleBtn: 'w-11 h-11', // mockup: w-8 h-8 / w-9 h-9 / w-10 h-10
} as const
