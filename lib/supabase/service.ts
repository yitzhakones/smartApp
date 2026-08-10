import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role Supabase client — **server-only**.
 *
 * Uses the SERVICE_ROLE key, which BYPASSES RLS. This is the client every
 * child-mediated flow runs through: children have no auth session, so opening
 * the access-token link, playing, placement calibration, Claude grading and all
 * cron jobs are executed here (see supabase/README.md security model).
 *
 * NEVER import this into client components or expose the key to the browser.
 * There is no cookie/session wiring on purpose — every call is fully privileged,
 * so callers MUST scope their queries explicitly (e.g. by child_id / access_token).
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase service-role env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
