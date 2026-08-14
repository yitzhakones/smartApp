// Reward presets — the quick-pick chips shown in the send-bonus panel.
// Reads/writes run through the parent's own RLS session: reward_presets has a
// full-CRUD "Parent manages own reward presets" policy (unlike the money
// tables), so no service role is needed here at all.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'

// Source of truth: docs/platform-data-model-and-rules.md → reward_presets
// ("seeded with sensible defaults per new family (₪5/₪10/₪20 + the 4 privilege
// examples above)"). Every new parent already gets these from the
// seed_reward_presets DB trigger (migration 001) at signup — this list is a
// defensive fallback for the rare case a parent somehow has none.
const DEFAULT_PRESETS: Array<Pick<Tables<'reward_presets'>, 'kind' | 'label' | 'amount_nis'>> = [
  { kind: 'money', label: '₪5', amount_nis: 5 },
  { kind: 'money', label: '₪10', amount_nis: 10 },
  { kind: 'money', label: '₪20', amount_nis: 20 },
  { kind: 'privilege', label: 'גלידה', amount_nis: null },
  { kind: 'privilege', label: 'ערב סרט', amount_nis: null },
  { kind: 'privilege', label: 'חצי שעה מסך נוספת', amount_nis: null },
  { kind: 'privilege', label: 'חטיף אהוב', amount_nis: null },
]

export async function getOrSeedPresets(
  supabase: SupabaseClient<Database>,
  parentId: string
): Promise<Tables<'reward_presets'>[]> {
  const { data: existing } = await supabase
    .from('reward_presets')
    .select('id, parent_id, kind, label, amount_nis')
    .order('kind')
  if (existing && existing.length > 0) return existing

  const { data: seeded, error } = await supabase
    .from('reward_presets')
    .insert(DEFAULT_PRESETS.map((p) => ({ ...p, parent_id: parentId })))
    .select('id, parent_id, kind, label, amount_nis')
  if (error) throw error
  return seeded ?? []
}
