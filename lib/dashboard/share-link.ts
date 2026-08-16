// The child's shareable one-time link (docs → "Child access"): app.com/p/{access_token}.
// The origin is read from the current request's headers rather than a
// hardcoded env var, so the link is always correct — dev, preview, or
// production — without needing separate config to keep in sync per environment.

import { headers } from 'next/headers'

export async function getAppOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export function buildChildShareLink(origin: string, accessToken: string): string {
  return `${origin}/p/${accessToken}`
}
