-- =============================================================================
-- 009_children_benchmark_opt_in.sql — per-child anonymous-comparison opt-in
-- Source of truth: docs/platform-data-model-and-rules.md → "Peer benchmarking"
--   ("Off by default until the parent explicitly opts in from settings.")
--
-- WHY: the parent dashboard's benchmark toggle needs somewhere to persist its
-- state — no column existed for it. Stored per-child (not per-parent): siblings
-- may reasonably differ (a parent may be comfortable comparing one child but not
-- another), and the benchmark figure itself is always scoped to one specific
-- child's age_group + category cohort, never the family as a whole.
--
-- Defaults false, matching "off by default until explicit opt-in".
-- =============================================================================

ALTER TABLE children
  ADD COLUMN benchmark_opt_in BOOLEAN NOT NULL DEFAULT false;
