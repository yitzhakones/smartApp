import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require a logged-in parent. The CONSENT gate (checking
// consent_accepted_at in the DB) lives in app/(protected)/layout.tsx — this
// middleware only enforces authentication and keeps the session fresh. `/consent`
// requires auth but is deliberately NOT consent-gated (it's where a parent goes
// to accept), so it's listed here but not under the (protected) group.
const PROTECTED_PREFIXES = ['/dashboard', '/consent']
const AUTH_PAGES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  const isAuthPage = AUTH_PAGES.includes(pathname)

  // Unauthenticated → bounce off protected routes to login.
  if (!user && isProtected) {
    return redirectPreservingCookies(request, response, '/login')
  }

  // Already authenticated → keep them out of the auth screens.
  if (user && isAuthPage) {
    return redirectPreservingCookies(request, response, '/dashboard')
  }

  return response
}

/**
 * Build a redirect that carries over any auth cookies the session refresh set,
 * so redirecting never silently drops a rotated session.
 */
function redirectPreservingCookies(
  request: NextRequest,
  sourceResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export const config = {
  // Run on everything except Next internals, the PWA service worker/workbox
  // files, and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons/.*|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
