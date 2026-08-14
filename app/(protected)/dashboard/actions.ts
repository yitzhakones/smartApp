'use server'

// Server actions for parent-initiated dashboard mutations. Every action here
// follows the same security discipline: the parent has SELECT-only RLS on the
// money tables (reward_ledger / child_stats), so the actual write runs through a
// service-role SECURITY DEFINER RPC — but ONLY after we verify, against the
// parent's own RLS session, that the target child belongs to them. The service
// role bypasses RLS, so this ownership check is what stands in for it.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PaymentMethod, RewardKind, SubmissionStatus } from '@/types/database'

export type ActionResult<T = void> =
  | ({ ok: true } & T)
  | { ok: false; error: string }

/**
 * Confirm the logged-in parent owns `childId`. Uses the RLS client, so a
 * non-owned (or non-existent) child simply returns no row. Returns the parent id
 * on success for any follow-up parent-scoped work.
 */
async function requireOwnedChild(
  childId: string
): Promise<{ parentId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחוברים' }

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .maybeSingle()
  if (!child) return { error: 'הילד/ה לא נמצא/ה' }

  return { parentId: user.id }
}

/**
 * Record a real-world payout: insert a `withdrawal` ledger row and decrement the
 * child's running balance, atomically (apply_withdrawal RPC, migration 007).
 * Returns the new balance so the client can reflect it without a full reload.
 */
export async function recordWithdrawal(input: {
  childId: string
  amount: number
  paymentMethod: PaymentMethod
}): Promise<ActionResult<{ balance: number }>> {
  const owned = await requireOwnedChild(input.childId)
  if ('error' in owned) return { ok: false, error: owned.error }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: 'סכום לא תקין' }
  }

  const db = createServiceClient()
  const { data: newBalance, error } = await db.rpc('apply_withdrawal', {
    p_child_id: input.childId,
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
  })
  if (error) {
    // Surfaces the RPC's guards (e.g. amount exceeds balance) as a clean message.
    return { ok: false, error: 'רישום המשיכה נכשל' }
  }

  revalidatePath('/dashboard')
  return { ok: true, balance: Number(newBalance) }
}

/**
 * Manually flip a graded submission's verdict — the "תקן ידנית" safety net for
 * when Claude misjudged an answer. Atomically logs the override on the
 * submission, writes a compensating star ledger row, and adjusts child_stats
 * (apply_parent_override RPC, migration 011). Returns the new balance AND star
 * count, since — unlike a withdrawal or bonus — an override can change both.
 */
export async function overrideGrade(input: {
  submissionId: string
  childId: string
  newStatus: Extract<SubmissionStatus, 'correct' | 'incorrect'>
  note: string
}): Promise<ActionResult<{ balance: number; stars: number }>> {
  const owned = await requireOwnedChild(input.childId)
  if ('error' in owned) return { ok: false, error: owned.error }

  const db = createServiceClient()
  const { data, error } = await db.rpc('apply_parent_override', {
    p_submission_id: input.submissionId,
    p_child_id: input.childId,
    p_new_status: input.newStatus,
    p_note: input.note.trim() || null,
  })
  if (error || !data) return { ok: false, error: 'התיקון נכשל' }

  revalidatePath('/dashboard')
  return { ok: true, balance: Number(data.balance), stars: Number(data.stars) }
}

/**
 * Send a bonus/privilege to a child: writes a `parent_reward` ledger row and,
 * for kind=money, bumps child_stats.total_money_owed_nis — atomically
 * (send_parent_reward RPC, migration 010). Privilege rewards never touch the
 * balance, matching the doc ("privilege → no money impact, just recorded").
 */
export async function sendBonus(input: {
  childId: string
  kind: RewardKind
  label: string
  amountNis: number | null
  note: string
}): Promise<ActionResult<{ balance: number }>> {
  const owned = await requireOwnedChild(input.childId)
  if ('error' in owned) return { ok: false, error: owned.error }

  if (!input.label.trim()) return { ok: false, error: 'חסר תיאור לתגמול' }
  if (input.kind === 'money' && (!input.amountNis || input.amountNis <= 0)) {
    return { ok: false, error: 'סכום לא תקין' }
  }

  const db = createServiceClient()
  const { data: newBalance, error } = await db.rpc('send_parent_reward', {
    p_child_id: input.childId,
    p_kind: input.kind,
    p_label: input.label,
    p_amount_nis: input.kind === 'money' ? input.amountNis : null,
    p_note: input.note.trim() || null,
  })
  if (error) return { ok: false, error: 'שליחת התגמול נכשלה' }

  revalidatePath('/dashboard')
  return { ok: true, balance: Number(newBalance) }
}
