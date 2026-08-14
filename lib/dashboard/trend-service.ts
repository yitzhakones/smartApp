// Fetches the raw data computeTrendData needs and hands it off. Runs through
// the CALLER'S OWN RLS session (the parent's, from lib/supabase/server) — never
// the service role. Parents already have SELECT-only RLS on submissions
// (is_my_child) and on the shared questions bank, so no privileged access is
// needed just to read a trend chart.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Database } from '@/types/database'
import { computeTrendData, type CorrectSubmission, type TrendData } from './trend'

export async function getChildTrend(
  supabase: SupabaseClient<Database>,
  childId: string,
  enabledCategories: Category[]
): Promise<TrendData> {
  const { data, error } = await supabase
    .from('submissions')
    .select('graded_at, questions!inner ( category )')
    .eq('child_id', childId)
    .eq('status', 'correct')
  if (error) throw error

  const rows: CorrectSubmission[] = (data ?? [])
    .map((row): CorrectSubmission | null => {
      // Supabase types a to-one embed as an array; normalize (same pattern as
      // lib/grading/service.ts).
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions
      if (!row.graded_at || !question) return null
      return { gradedAt: row.graded_at, category: question.category }
    })
    .filter((r): r is CorrectSubmission => r !== null)

  return computeTrendData(rows, enabledCategories)
}
