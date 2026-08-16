// The logged-in parent's own account row (parents table). Reads through the
// parent's own RLS session ("Parent reads own row") — no service role needed.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Locale } from '@/types/database'

export interface NotificationPrefs {
  in_app: boolean
  email: boolean
  whatsapp: boolean
}

export interface ParentAccount {
  locale: Locale
  whatsappNumber: string | null
  notificationPrefs: NotificationPrefs
}

// Doc default: { in_app: true, email: true, whatsapp: false }. Used both as
// the fallback if notification_prefs is ever missing/malformed (it's an
// unconstrained JSONB column) and as the seed a brand-new parent row gets from
// the same default at the SQL level (migration 001).
const DEFAULT_PREFS: NotificationPrefs = { in_app: true, email: true, whatsapp: false }

function parsePrefs(json: unknown): NotificationPrefs {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>
    return {
      in_app: typeof obj.in_app === 'boolean' ? obj.in_app : DEFAULT_PREFS.in_app,
      email: typeof obj.email === 'boolean' ? obj.email : DEFAULT_PREFS.email,
      whatsapp: typeof obj.whatsapp === 'boolean' ? obj.whatsapp : DEFAULT_PREFS.whatsapp,
    }
  }
  return DEFAULT_PREFS
}

export async function getParentAccount(
  supabase: SupabaseClient<Database>,
  parentId: string
): Promise<ParentAccount> {
  const { data, error } = await supabase
    .from('parents')
    .select('locale, whatsapp_number, notification_prefs')
    .eq('id', parentId)
    .single()
  if (error) throw error

  return {
    locale: data.locale,
    whatsappNumber: data.whatsapp_number,
    notificationPrefs: parsePrefs(data.notification_prefs),
  }
}
