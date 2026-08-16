'use server'

// Server actions for parent-initiated dashboard mutations. Every action here
// follows the same security discipline: the parent has SELECT-only RLS on the
// money tables (reward_ledger / child_stats), so the actual write runs through a
// service-role SECURITY DEFINER RPC — but ONLY after we verify, against the
// parent's own RLS session, that the target child belongs to them. The service
// role bypasses RLS, so this ownership check is what stands in for it.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type {
  AccessMode,
  Category,
  Gender,
  Locale,
  PaymentMethod,
  RewardKind,
  SubmissionStatus,
} from '@/types/database'

// T defaults to `unknown`, not `void`: `{ ok: true } & void` collapses to
// `never` in TS (a known intersection gotcha), which only broke once
// deletePreset became the first caller relying on the no-extra-fields default.
// `unknown` intersects away cleanly, leaving exactly `{ ok: true }`.
export type ActionResult<T = unknown> =
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

/** Confirm there's a logged-in parent, for actions that don't target a specific child. */
async function requireParent(): Promise<{ parentId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחוברים' }
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

// -----------------------------------------------------------------------------
// Settings — EditChildScreen / NotificationsScreen / AccountSettingsScreen /
// PresetsScreen. None of these touch reward_ledger/child_stats, so — unlike the
// three actions above — they write directly through the parent's own RLS
// session (children, parents, and reward_presets all already grant the owning
// parent full CRUD via RLS; no service role, no RPC needed). The one exception
// is markNotificationsRead: notifications has SELECT-only RLS for parents, so
// that one write goes through the service role after an ownership check, same
// as the money actions — but as a single plain UPDATE, not an RPC, since it
// touches only one table and needs no cross-table atomicity.
// -----------------------------------------------------------------------------

export interface ChildProfileInput {
  displayName: string
  gender: Gender
  locale: Locale
  enabledCategories: Category[]
  shekelPerStar: number
  weeklyImprovementBonus: number
  accessMode: AccessMode
  accessPin: string | null
}

export interface UpdateChildInput extends ChildProfileInput {
  childId: string
}

/** Shared by createChild and updateChild — the two write different rows, but the same shape. */
function validateChildProfile(input: ChildProfileInput): string | null {
  if (!input.displayName.trim()) return 'חסר שם'
  if (input.enabledCategories.length === 0) return 'יש לבחור לפחות קטגוריה אחת'
  if (!Number.isFinite(input.shekelPerStar) || input.shekelPerStar <= 0) {
    return '₪ לכוכב חייב להיות מספר חיובי'
  }
  if (!Number.isFinite(input.weeklyImprovementBonus) || input.weeklyImprovementBonus < 0) {
    return 'בונוס שבועי לא תקין'
  }
  if (input.accessMode === 'pin' && !/^\d{4}$/.test(input.accessPin ?? '')) {
    return 'קוד PIN חייב להיות בן 4 ספרות'
  }
  return null
}

/**
 * Create a brand-new child profile. RLS-scoped directly (children.parent_id =
 * auth.uid(), enforced by the "Parent manages own children" policy's own
 * WITH CHECK) — no service role needed. access_token is left for the column's
 * own DB default (two concatenated gen_random_uuid()s, migration 001) rather
 * than generated here — one less thing that could drift from the DB's own
 * definition of "unguessable."
 *
 * On success this redirects straight into the new child's placement quiz
 * (app/p/[token]/page.tsx already routes there on its own — a fresh child has
 * enabled_categories set and category_levels empty, which is exactly the
 * condition that page checks) rather than returning to the caller, matching
 * the wizard's own "צור פרופיל והתחל כיול" framing. Only the failure path
 * returns a value.
 */
export async function createChild(input: ChildProfileInput): Promise<ActionResult<never>> {
  const validationError = validateChildProfile(input)
  if (validationError) return { ok: false, error: validationError }
  const accessPin = input.accessMode === 'pin' ? input.accessPin : null

  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('children')
    .insert({
      parent_id: owned.parentId,
      display_name: input.displayName.trim(),
      gender: input.gender,
      locale: input.locale,
      enabled_categories: input.enabledCategories,
      shekel_per_star: input.shekelPerStar,
      weekly_improvement_bonus: input.weeklyImprovementBonus,
      access_mode: input.accessMode,
      access_pin: accessPin,
    })
    .select('access_token')
    .single()
  if (error || !data) return { ok: false, error: 'יצירת הפרופיל נכשלה' }

  redirect(`/p/${data.access_token}`)
}

/**
 * Save an edited child profile. RLS-scoped directly (children.parent_id =
 * auth.uid()) — no service role. access_pin is forced to null unless
 * accessMode is 'pin' (the DB's own pin_requires_pin_mode CHECK would reject
 * an inconsistent combination anyway; validating here gives a clean message
 * instead of a raw constraint-violation error).
 */
export async function updateChild(
  input: UpdateChildInput
): Promise<ActionResult<{ child: UpdateChildInput }>> {
  const validationError = validateChildProfile(input)
  if (validationError) return { ok: false, error: validationError }
  const accessPin = input.accessMode === 'pin' ? input.accessPin : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('children')
    .update({
      display_name: input.displayName.trim(),
      gender: input.gender,
      locale: input.locale,
      enabled_categories: input.enabledCategories,
      shekel_per_star: input.shekelPerStar,
      weekly_improvement_bonus: input.weeklyImprovementBonus,
      access_mode: input.accessMode,
      access_pin: accessPin,
    })
    .eq('id', input.childId)
    .select(
      'id, display_name, gender, locale, enabled_categories, shekel_per_star, weekly_improvement_bonus, access_mode, access_pin'
    )
    .single()
  if (error || !data) return { ok: false, error: 'שמירת הפרופיל נכשלה' }

  revalidatePath('/dashboard')
  return {
    ok: true,
    child: {
      childId: data.id,
      displayName: data.display_name,
      gender: data.gender,
      locale: data.locale,
      enabledCategories: data.enabled_categories,
      shekelPerStar: Number(data.shekel_per_star),
      weeklyImprovementBonus: Number(data.weekly_improvement_bonus),
      accessMode: data.access_mode,
      accessPin: data.access_pin,
    },
  }
}

/** Mark every unread in-app notification, across all of this parent's children, as read. */
export async function markNotificationsRead(): Promise<ActionResult<{ readAt: string }>> {
  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }

  const supabase = await createClient()
  // RLS ("Parent manages own children") already scopes this to the parent's own rows.
  const { data: children } = await supabase.from('children').select('id')
  const childIds = (children ?? []).map((c) => c.id)
  const readAt = new Date().toISOString()
  if (childIds.length === 0) return { ok: true, readAt }

  const db = createServiceClient()
  const { error } = await db
    .from('notifications')
    .update({ read_at: readAt })
    .in('child_id', childIds)
    .is('read_at', null)
  if (error) return { ok: false, error: 'סימון ההתראות נכשל' }

  revalidatePath('/dashboard')
  return { ok: true, readAt }
}

export interface UpdateAccountInput {
  locale: Locale
  whatsappNumber: string
  emailNotifications: boolean
}

/**
 * Save account settings. RLS-scoped directly (parents.id = auth.uid()) — no
 * service role. in_app is always forced true and whatsapp always false,
 * regardless of any client input, matching the doc ("in_app: always on",
 * "whatsapp: off — not built yet") — this UI doesn't even expose controls for
 * either, but the server enforces it too rather than trusting the client.
 */
export async function updateAccountSettings(
  input: UpdateAccountInput
): Promise<ActionResult<{ whatsappNumber: string | null }>> {
  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }

  const whatsappNumber = input.whatsappNumber.trim() || null
  const supabase = await createClient()
  const { error } = await supabase
    .from('parents')
    .update({
      locale: input.locale,
      whatsapp_number: whatsappNumber,
      notification_prefs: { in_app: true, email: input.emailNotifications, whatsapp: false },
    })
    .eq('id', owned.parentId)
  if (error) return { ok: false, error: 'שמירת ההגדרות נכשלה' }

  revalidatePath('/dashboard')
  return { ok: true, whatsappNumber }
}

export interface PresetInput {
  kind: RewardKind
  label: string
  amountNis: number | null
}

function validatePreset(input: PresetInput): string | null {
  if (!input.label.trim()) return 'חסר תיאור לתגמול'
  if (input.kind === 'money' && (!input.amountNis || input.amountNis <= 0)) {
    return 'סכום לא תקין'
  }
  if (input.kind === 'privilege' && input.amountNis !== null) {
    return 'לפינוק אין סכום'
  }
  return null
}

/** Add a new reward preset. RLS-scoped directly (reward_presets.parent_id = auth.uid()). */
export async function createPreset(
  input: PresetInput
): Promise<ActionResult<{ preset: { id: string; kind: RewardKind; label: string; amount_nis: number | null } }>> {
  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }
  const validationError = validatePreset(input)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reward_presets')
    .insert({
      parent_id: owned.parentId,
      kind: input.kind,
      label: input.label.trim(),
      amount_nis: input.kind === 'money' ? input.amountNis : null,
    })
    .select('id, kind, label, amount_nis')
    .single()
  if (error || !data) return { ok: false, error: 'הוספת הצ׳יפ נכשלה' }

  revalidatePath('/dashboard')
  return { ok: true, preset: data }
}

/** Edit an existing reward preset. RLS-scoped directly. */
export async function updatePreset(
  id: string,
  input: PresetInput
): Promise<ActionResult<{ preset: { id: string; kind: RewardKind; label: string; amount_nis: number | null } }>> {
  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }
  const validationError = validatePreset(input)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reward_presets')
    .update({
      kind: input.kind,
      label: input.label.trim(),
      amount_nis: input.kind === 'money' ? input.amountNis : null,
    })
    .eq('id', id)
    .select('id, kind, label, amount_nis')
    .single()
  if (error || !data) return { ok: false, error: 'עדכון הצ׳יפ נכשל' }

  revalidatePath('/dashboard')
  return { ok: true, preset: data }
}

/** Delete a reward preset. RLS-scoped directly. */
export async function deletePreset(id: string): Promise<ActionResult> {
  const owned = await requireParent()
  if ('error' in owned) return { ok: false, error: owned.error }

  const supabase = await createClient()
  const { error } = await supabase.from('reward_presets').delete().eq('id', id)
  if (error) return { ok: false, error: 'מחיקת הצ׳יפ נכשלה' }

  revalidatePath('/dashboard')
  return { ok: true }
}
