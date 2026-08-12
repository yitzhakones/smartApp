import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Refresh the Supabase auth session on every request and surface the current
 * user. This MUST run in middleware for server components to see a valid session
 * (@supabase/ssr keeps the auth cookies fresh here). The returned response
 * carries any rotated cookies — callers redirecting elsewhere must copy them
 * over (see middleware.ts) so the session isn't dropped.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          // Auth-cookie responses must not be cached by a CDN/proxy, or one
          // user's session could be served to another. ssr passes the required
          // Cache-Control/Expires/Pragma headers here.
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value)
          )
        },
      },
    }
  )

  // Do not run any logic between createServerClient and getUser() — it must be
  // the first call so the session is refreshed before anything reads it.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
