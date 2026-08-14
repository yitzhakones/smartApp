// Recent graded submissions for the activity feed. Reads through the parent's
// own RLS session (is_my_child on submissions, "authenticated reads" on the
// shared questions bank) — no service role needed for a read.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Database, Locale, SubmissionStatus } from '@/types/database'

// Recent-activity list length. No pagination yet — fine at v1 volumes (5
// questions/day/child); revisit if this list needs to span many weeks.
const ACTIVITY_LIMIT = 15

export interface ActivityItem {
  submissionId: string
  question: string
  answer: string | null
  status: Extract<SubmissionStatus, 'correct' | 'incorrect'>
  gradedAt: string
  category: Category
  isBonus: boolean
}

export async function getRecentActivity(
  supabase: SupabaseClient<Database>,
  childId: string,
  locale: Locale
): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `id, question_id, answer_text, status, graded_at,
       questions!inner ( text_he, text_en, category ),
       daily_sets!inner ( question_ids )`
    )
    .eq('child_id', childId)
    .in('status', ['correct', 'incorrect'])
    .order('graded_at', { ascending: false })
    .limit(ACTIVITY_LIMIT)
  if (error) throw error

  return (data ?? [])
    .map((row): ActivityItem | null => {
      if (row.status !== 'correct' && row.status !== 'incorrect') return null
      // Supabase types a to-one embed as an array; normalize (same pattern as
      // lib/grading/service.ts).
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions
      const dailySet = Array.isArray(row.daily_sets) ? row.daily_sets[0] : row.daily_sets
      if (!question || !dailySet || !row.graded_at) return null
      return {
        submissionId: row.id,
        question: locale === 'he' ? question.text_he : question.text_en,
        answer: row.answer_text,
        status: row.status,
        gradedAt: row.graded_at,
        category: question.category,
        isBonus: !dailySet.question_ids.includes(row.question_id),
      }
    })
    .filter((r): r is ActivityItem => r !== null)
}
