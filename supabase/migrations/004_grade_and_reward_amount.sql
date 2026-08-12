-- =============================================================================
-- 004_grade_and_reward_amount.sql — pass the award amount explicitly
-- Source of truth: docs/platform-data-model-and-rules.md → "Grading"
--
-- WHY: the bonus question pays 3× shekel_per_star (a regular correct answer pays
-- shekel_per_star). Rather than teach the DB function about bonus multipliers,
-- grade_and_reward now takes the already-computed money award (p_amount_nis) and
-- simply applies it — the 3× business rule lives in one place, the grading
-- service. total_stars still increments by exactly 1 per correct answer (one
-- answer = one star; milestones count answers), while money owed and the ledger
-- row use the passed amount.
--
-- Param rename (p_shekel_per_star → p_amount_nis) requires DROP + CREATE.
-- =============================================================================

DROP FUNCTION IF EXISTS public.grade_and_reward(UUID, NUMERIC, DATE);

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
  v_prev_stars   INTEGER := 0;
  v_prev_money   NUMERIC := 0;
  v_streak       INTEGER := 0;
  v_last         DATE    := NULL;
  v_prev_pending BOOLEAN := false;
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
  -- (NOT FOUND → the DECLARE defaults above stand: first star for this child.)

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

-- Server-only: no parent/child role may award themselves rewards directly.
REVOKE EXECUTE ON FUNCTION public.grade_and_reward(UUID, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grade_and_reward(UUID, NUMERIC, DATE)
  TO service_role;
