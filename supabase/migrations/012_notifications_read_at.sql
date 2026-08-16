-- =============================================================================
-- 012_notifications_read_at.sql — read/unread tracking + a real timestamp
-- Source of truth: docs/platform-data-model-and-rules.md → notifications
--
-- Two additive gaps, both discovered building the parent dashboard's
-- NotificationsScreen, bundled here since they're both plain nullable/defaulted
-- columns on the same table:
--
-- (1) read_at — nothing tracks whether the PARENT has seen an in-app
--     notification (the doc's `status` is delivery status — pending/sent/
--     failed, relevant once email/whatsapp phases exist — a different concern).
--     Reusing `status` for this would conflate the two; this adds a dedicated,
--     nullable timestamp instead: NULL = unread, a value = when the parent
--     marked it read (same "nullable when-it-happened" shape as graded_at).
--
-- (2) created_at — the table has NO created_at at all (migration 001
--     deliberately omitted it: "doc lists no created_at here"), and `sent_at`
--     is nullable and never actually set by apply_grading_result's milestone
--     insert (006/011) — so EVERY existing row currently has sent_at = NULL.
--     There is no column to sort or display "when" by. Rather than repurpose
--     sent_at (a differently-documented field) or sort by id (a random UUID,
--     not time-ordered), this adds created_at TIMESTAMPTZ DEFAULT now(),
--     matching every other timestamped table in the schema.
--     KNOWN LIMITATION: existing rows have no true creation time recorded, so
--     ADD COLUMN ... DEFAULT now() backfills them all to this migration's
--     apply-time (the same instant for every pre-existing row) — not their
--     real original moment, which was never captured. Every notification
--     created AFTER this migration gets an accurate created_at.
--
-- No RLS policy changes: notifications keeps its existing SELECT-only policy
-- for parents. Marking as read is a plain, single-statement UPDATE (no other
-- table involved, so no atomicity concern requiring an RPC) — the parent
-- dashboard's dashboard/actions.ts performs it via the service role after
-- confirming, via the parent's own RLS session, which child ids belong to them.
-- =============================================================================

ALTER TABLE notifications
  ADD COLUMN read_at TIMESTAMPTZ,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
