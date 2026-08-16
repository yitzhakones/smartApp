// Notifications across ALL of this parent's children (not just the active
// tab) — reads through the parent's own RLS session (is_my_child on
// notifications) — no service role needed for the read.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Gender, NotificationTrigger } from '@/types/database'

// No pagination yet — fine at v1 volumes (today, only star_milestone rows are
// ever produced, by apply_grading_result). Revisit if this list grows large.
const NOTIFICATIONS_LIMIT = 50

export interface NotificationItem {
  id: string
  childId: string
  childName: string
  childGender: Gender
  triggerType: NotificationTrigger
  createdAt: string
  readAt: string | null
}

export async function getAllNotifications(
  supabase: SupabaseClient<Database>
): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, child_id, trigger_type, created_at, read_at, children!inner ( display_name, gender )')
    .eq('channel', 'in_app')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT)
  if (error) throw error

  return (data ?? [])
    .map((row): NotificationItem | null => {
      // Supabase types a to-one embed as an array; normalize.
      const child = Array.isArray(row.children) ? row.children[0] : row.children
      if (!child) return null
      return {
        id: row.id,
        childId: row.child_id,
        childName: child.display_name,
        childGender: child.gender,
        triggerType: row.trigger_type,
        createdAt: row.created_at,
        readAt: row.read_at,
      }
    })
    .filter((r): r is NotificationItem => r !== null)
}
