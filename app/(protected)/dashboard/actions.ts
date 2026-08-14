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
import type { PaymentMethod } from '@/types/database'

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
