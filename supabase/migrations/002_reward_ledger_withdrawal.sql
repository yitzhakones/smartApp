-- =============================================================================
-- 002_reward_ledger_withdrawal.sql — settlement / withdrawal support
-- Source of truth: platform-data-model-and-rules.md
--   ("Withdrawal / settlement — a core v1 requirement" + reward_ledger entity)
--
-- WHY: child_stats.total_money_owed only ever grows until a parent can record a
-- real-world payout (cash / Bit / bank transfer). A `withdrawal` ledger row lets
-- the parent log the amount actually paid and how; app logic then reduces the
-- running balance by that amount. History is never rewritten — the balance shown
-- is sum(earned) - sum(withdrawn).
--
-- SCOPE: this migration touches ONLY reward_ledger — (1) allow type='withdrawal',
-- (2) add a nullable payment_method that is meaningful only on withdrawal rows.
--
-- No change is needed to the existing amount/kind constraints: a withdrawal is
-- always money (reward_kind defaults to 'money'), so `non_reward_is_money`
-- already forbids a privilege withdrawal, and `money_has_amount` already forces
-- amount_nis to be present — exactly the "amount actually paid out" the doc wants.
-- =============================================================================

-- (1) Extend the allowed ledger types with 'withdrawal'.
-- The original inline CHECK (type IN (...)) is auto-named reward_ledger_type_check.
ALTER TABLE reward_ledger DROP CONSTRAINT IF EXISTS reward_ledger_type_check;
ALTER TABLE reward_ledger
  ADD CONSTRAINT reward_ledger_type_check
  CHECK (type IN ('star','weekly_bonus','parent_reward','withdrawal'));

-- (2) How the payout was made — free short enum, only for withdrawal rows.
ALTER TABLE reward_ledger
  ADD COLUMN payment_method TEXT
  CHECK (payment_method IS NULL OR payment_method IN ('cash','bit','bank_transfer','other'));

-- payment_method is meaningful only on a withdrawal (mirrors 001's
-- pin_requires_pin_mode pattern): non-withdrawal rows must leave it NULL.
ALTER TABLE reward_ledger
  ADD CONSTRAINT payment_method_only_on_withdrawal
  CHECK (payment_method IS NULL OR type = 'withdrawal');
