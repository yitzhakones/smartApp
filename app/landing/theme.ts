// Visual tokens for the public landing page, lifted verbatim from the approved
// mockup (landing-page-light-mockup.tsx). Kept in its own file rather than
// importing app/(protected)/dashboard/theme.ts: the two feature areas
// (public marketing page vs. authenticated dashboard) are independent, and a
// handful of duplicated hex constants is cheaper than a cross-route-group
// dependency. Fonts reference the next/font CSS variables already set up in
// the root layout (var(--font-rubik) / var(--font-assistant)) — never a
// runtime <style>@import>, which caused a hydration mismatch earlier.

export const INK = '#14172B'
export const PAPER = '#FBF7EE'
export const LIME = '#8FCB1F'
export const LIME_BRIGHT = '#C6FF3D'
export const FUCHSIA = '#D6127A'
export const AMBER = '#C97A00'
export const SOFT = '#6B7299'

export const RUBIK = 'var(--font-rubik), system-ui'
export const ASSISTANT = 'var(--font-assistant), system-ui'
