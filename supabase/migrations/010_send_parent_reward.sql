-- =============================================================================
-- 010_send_parent_reward.sql — parent-initiated bonus/privilege reward
-- Source of truth: docs/platform-data-model-and-rules.md →
--   "Parent-to-child bonus/encouragement — in-app"
--
-- WHY: the send-bonus panel writes a `parent_reward` row to reward_ledger.
-- kind=money must also bump child_stats.total_money_owed_nis; kind=privilege
-- must NOT touch it (recorded + shown only, per the doc). Both the ledger
-- insert and the conditional balance bump happen in one transaction — same
-- discipline as apply_grading_result (006) and apply_withdrawal (007).
--
-- Unlike apply_withdrawal, a bonus can be the very FIRST reward this child ever
-- receives (e.g. a brand-new child with no child_stats row yet, sent a bonus
-- before ever playing) — so the money path upserts child_stats rather than
-- requiring an existing row.
--
-- SECURITY: service-role only, reached exclusively via a server action that
-- first verifies the parent owns the child (parents have SELECT-only RLS on
-- reward_ledger/child_stats).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_parent_reward(
  p_child_id UUID,
  p_kind TEXT,          -- money | privilege
  p_label TEXT,
  p_amount_nis NUMERIC, -- required (> 0) for money; must be NULL for privilege
  p_note TEXT           -- optional encouragement note; NULL/blank allowed
)
RETURNS NUMERIC  -- balance after the reward (unchanged for a privilege)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF p_kind NOT IN ('money', 'privilege') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind;
  END IF;
  IF p_label IS NULL OR btrim(p_label) = '' THEN
    RAISE EXCEPTION 'label is required';
  END IF;
  IF p_kind = 'money' AND (p_amount_nis IS NULL OR p_amount_nis <= 0) THEN
    RAISE EXCEPTION 'amount must be positive for a money reward';
  END IF;
  IF p_kind = 'privilege' AND p_amount_nis IS NOT NULL THEN
    RAISE EXCEPTION 'privilege rewards must not carry an amount';
  END IF;

  -- 1) Audit row — always written, regardless of kind.
  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis, label, note)
  VALUES (p_child_id, 'parent_reward', p_kind, p_amount_nis, btrim(p_label), NULLIF(btrim(p_note), ''));

  -- 2) Money only: upsert-and-increment the rollup (no existing child_stats row
  --    is required — a bonus may be this child's first-ever reward).
  IF p_kind = 'money' THEN
    INSERT INTO child_stats (child_id, total_money_owed_nis)
    VALUES (p_child_id, p_amount_nis)
    ON CONFLICT (child_id) DO UPDATE
      SET total_money_owed_nis = child_stats.total_money_owed_nis + EXCLUDED.total_money_owed_nis
    RETURNING total_money_owed_nis INTO v_balance;
  ELSE
    SELECT total_money_owed_nis INTO v_balance FROM child_stats WHERE child_id = p_child_id;
  END IF;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- Server-only: reached solely via the service role after an ownership check.
REVOKE EXECUTE ON FUNCTION public.send_parent_reward(UUID, TEXT, TEXT, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_parent_reward(UUID, TEXT, TEXT, NUMERIC, TEXT)
  TO service_role;
