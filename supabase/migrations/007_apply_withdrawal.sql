-- =============================================================================
-- 007_apply_withdrawal.sql — record a real-world payout (settlement)
-- Source of truth: docs/platform-data-model-and-rules.md
--   ("Withdrawal / settlement — a core v1 requirement")
--
-- WHY: child_stats.total_money_owed_nis is the running balance shown to both
-- parent and child. Grading only ever grows it; without a way to record that the
-- parent actually paid out (cash / Bit / bank transfer), the number stops meaning
-- "what I still owe". A `withdrawal` ledger row logs the amount paid + how, and
-- this function atomically inserts that row AND decrements the rollup, so the
-- audit trail and the displayed balance can never diverge — the same
-- one-transaction discipline as apply_grading_result (migration 006).
--
-- History is never rewritten: every star/bonus/reward row stays; only the running
-- balance reflects sum(earned) - sum(withdrawn).
--
-- SECURITY: service-role only. Parents have SELECT-only RLS on reward_ledger /
-- child_stats, so this privileged write is reached exclusively through a server
-- action that first verifies the parent owns the child (see dashboard/actions.ts).
-- Returns the new balance after the withdrawal.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_withdrawal(
  p_child_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT   -- cash | bit | bank_transfer | other
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'withdrawal amount must be positive (got %)', p_amount;
  END IF;
  IF p_payment_method NOT IN ('cash', 'bit', 'bank_transfer', 'other') THEN
    RAISE EXCEPTION 'invalid payment_method: %', p_payment_method;
  END IF;

  -- Lock the rollup for the transaction so two concurrent withdrawals can't both
  -- pass the balance check and overdraw.
  SELECT total_money_owed_nis
    INTO v_balance
  FROM child_stats
  WHERE child_id = p_child_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no stats row for child % — nothing owed yet', p_child_id;
  END IF;

  -- The balance means "what I still owe"; it must never go negative.
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'withdrawal % exceeds balance %', p_amount, v_balance;
  END IF;

  -- 1) Audit row — amount actually paid out + how (payment_method).
  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis, payment_method)
  VALUES (p_child_id, 'withdrawal', 'money', p_amount, p_payment_method);

  -- 2) Reduce the running balance by that amount (history is untouched).
  UPDATE child_stats
     SET total_money_owed_nis = total_money_owed_nis - p_amount
   WHERE child_id = p_child_id;

  RETURN v_balance - p_amount;
END;
$$;

-- Server-only: reached solely via the service role after an ownership check.
REVOKE EXECUTE ON FUNCTION public.apply_withdrawal(UUID, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_withdrawal(UUID, NUMERIC, TEXT)
  TO service_role;
