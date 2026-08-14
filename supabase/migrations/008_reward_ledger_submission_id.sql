-- =============================================================================
-- 008_reward_ledger_submission_id.sql — link ledger rows back to their submission
-- Source of truth: docs/platform-data-model-and-rules.md → reward_ledger,
--   "Parent override — safety net, not a gate"
--
-- WHY: the parent-override flow (parent dashboard build, activity-feed stage)
-- needs to reverse the exact star a submission earned when a parent flips a
-- grade after the fact. Without a link back to the submission, an override can
-- only insert a compensating ledger row — which still keeps the ledger a
-- truthful accounting trail, but can't point at "the row this submission
-- earned" for reconciliation/debugging. This column adds that link going
-- forward.
--
-- Nullable and NOT backfilled: weekly_bonus, parent_reward, and withdrawal rows
-- never correspond to a single submission, and existing `star` rows predate this
-- column — leaving them NULL is correct, not a gap to fix later.
--
-- ON DELETE SET NULL (not CASCADE): a submission can be deleted (e.g. the dev
-- test-reset script deletes today's daily_set, which cascades to its
-- submissions) — but money already paid out must never disappear from the
-- ledger just because the submission that earned it was removed. Losing the
-- link is fine; losing the audit row is not.
-- =============================================================================

ALTER TABLE reward_ledger
  ADD COLUMN submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL;

CREATE INDEX reward_ledger_submission_id_idx ON reward_ledger(submission_id);
