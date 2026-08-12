-- =============================================================================
-- 005_grade_and_reward_first_star_fix.sql — fix reward on a child's FIRST star
-- Source of truth: docs/platform-data-model-and-rules.md → "Grading"
--
-- BUG: in PL/pgSQL, `SELECT ... INTO` on a query that matches no row sets the
-- target variables to NULL — it does NOT leave them at their DECLARE defaults.
-- So the very first correct answer for a child (no child_stats row yet) computed
-- total_stars = NULL + 1 = NULL and failed the NOT NULL constraint (23502),
-- aborting the whole reward. The submission was already marked `correct`, so the
-- child got a locked "correct" with no star, no money, and (via the app's
-- already-graded path) a "+ ₪0" pill on the retry.
--
-- FIX: detect the no-row case explicitly with NOT FOUND and reset the "previous"
-- values to their zero defaults. Same signature as 004, so CREATE OR REPLACE
-- (no DROP needed).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grade_and_reward(
  p_child_id UUID,
  p_amount_nis NUMERIC,
  p_play_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_stars   INTEGER;
  v_prev_money   NUMERIC;
  v_streak       INTEGER;
  v_last         DATE;
  v_prev_pending BOOLEAN;
  v_new_stars    INTEGER;
  v_new_money    NUMERIC;
  v_new_streak   INTEGER;
  v_new_last     DATE;
  v_milestone    BOOLEAN;
BEGIN
  -- 1) Ledger row — the source of truth for money owed (amount = the award).
  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis)
  VALUES (p_child_id, 'star', 'money', p_amount_nis);

  -- 2) Current rollup, locked for the duration of this transaction.
  SELECT total_stars, total_money_owed_nis, streak, last_played_date, reward_milestone_pending
    INTO v_prev_stars, v_prev_money, v_streak, v_last, v_prev_pending
  FROM child_stats
  WHERE child_id = p_child_id
  FOR UPDATE;

  -- First star for this child: SELECT ... INTO set everything to NULL, so reset
  -- to the zero defaults (do NOT rely on DECLARE defaults after a SELECT INTO).
  IF NOT FOUND THEN
    v_prev_stars   := 0;
    v_prev_money   := 0;
    v_streak       := 0;
    v_last         := NULL;
    v_prev_pending := false;
  END IF;

  v_new_stars := v_prev_stars + 1;         -- one correct answer = one star
  v_new_money := v_prev_money + p_amount_nis;

  -- Milestone every 10 stars (integer division crosses a decade boundary).
  v_milestone := (v_new_stars / 10) > (v_prev_stars / 10);

  -- Streak keyed on the daily set's play date (timezone-free, deterministic).
  IF v_last IS DISTINCT FROM p_play_date THEN
    IF v_last = p_play_date - 1 THEN
      v_new_streak := v_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;
    v_new_last := CASE WHEN v_last IS NULL OR p_play_date > v_last
                       THEN p_play_date ELSE v_last END;
  ELSE
    v_new_streak := v_streak;   -- another correct answer the same day
    v_new_last   := v_last;
  END IF;

  -- 3) Upsert the rollup.
  INSERT INTO child_stats (
    child_id, total_stars, total_money_owed_nis, streak,
    last_played_date, reward_milestone_pending
  )
  VALUES (
    p_child_id, v_new_stars, v_new_money, v_new_streak,
    v_new_last, v_milestone OR v_prev_pending
  )
  ON CONFLICT (child_id) DO UPDATE SET
    total_stars              = EXCLUDED.total_stars,
    total_money_owed_nis     = EXCLUDED.total_money_owed_nis,
    streak                   = EXCLUDED.streak,
    last_played_date         = EXCLUDED.last_played_date,
    reward_milestone_pending = EXCLUDED.reward_milestone_pending;

  -- 4) On a milestone, create an in-app notification.
  IF v_milestone THEN
    INSERT INTO notifications (child_id, channel, trigger_type)
    VALUES (p_child_id, 'in_app', 'star_milestone');
  END IF;

  RETURN v_milestone;
END;
$$;

-- Preserve the server-only grant (CREATE OR REPLACE keeps existing ACLs, but be
-- explicit in case this runs on a fresh function).
REVOKE EXECUTE ON FUNCTION public.grade_and_reward(UUID, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grade_and_reward(UUID, NUMERIC, DATE)
  TO service_role;
