-- =============================================================================
-- 006_apply_grading_result.sql — one atomic transaction for a graded answer
-- Source of truth: docs/platform-data-model-and-rules.md → "Grading"
--
-- WHY: previously the app marked a submission `correct` and THEN called the
-- reward function as two separate statements. When the reward failed (see
-- migration 005), the submission was left locked-`correct` with no star/money —
-- the exact failure class that caused the two-click / "+ ₪0" bug. This function
-- folds both steps into ONE transaction: the verdict + feedback are written and
-- the reward (ledger + child_stats rollup + milestone notification) is applied
-- together, so they can never diverge.
--
-- Idempotent: the submission is only transitioned from unanswered/grading, so a
-- retry after a completed grade is a no-op (no double reward). Returns TRUE when
-- a correct answer crossed a 10-star milestone; FALSE otherwise (incorrect, or
-- an already-graded no-op).
--
-- Supersedes grade_and_reward, which is dropped.
-- =============================================================================

DROP FUNCTION IF EXISTS public.grade_and_reward(UUID, NUMERIC, DATE);

CREATE OR REPLACE FUNCTION public.apply_grading_result(
  p_submission_id UUID,
  p_child_id UUID,
  p_status TEXT,          -- 'correct' | 'incorrect'
  p_feedback TEXT,        -- ai_feedback_text
  p_amount_nis NUMERIC,   -- money award when correct (ignored when incorrect)
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
  IF p_status NOT IN ('correct', 'incorrect') THEN
    RAISE EXCEPTION 'invalid grading status: %', p_status;
  END IF;

  -- 1) Lock the verdict in — but ONLY from a not-yet-graded state, so a retry
  --    after grading is a no-op and can never double-reward.
  UPDATE submissions
     SET status = p_status,
         graded_at = now(),
         graded_by = 'claude_api',
         ai_feedback_text = p_feedback
   WHERE id = p_submission_id
     AND status IN ('unanswered', 'grading');

  IF NOT FOUND THEN
    RETURN false;  -- already graded (locked) — nothing to do
  END IF;

  -- Incorrect: no star, no money (docs → Grading, on incorrect).
  IF p_status = 'incorrect' THEN
    RETURN false;
  END IF;

  -- 2) Ledger row — the source of truth for money owed (amount = the award).
  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis)
  VALUES (p_child_id, 'star', 'money', p_amount_nis);

  -- 3) Current rollup, locked for the duration of this transaction.
  SELECT total_stars, total_money_owed_nis, streak, last_played_date, reward_milestone_pending
    INTO v_prev_stars, v_prev_money, v_streak, v_last, v_prev_pending
  FROM child_stats
  WHERE child_id = p_child_id
  FOR UPDATE;

  -- First star for this child: SELECT ... INTO set everything to NULL (it does
  -- NOT keep DECLARE defaults on a no-row match) — reset to the zero defaults.
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

  -- 4) Upsert the rollup.
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

  -- 5) On a milestone, create an in-app notification.
  IF v_milestone THEN
    INSERT INTO notifications (child_id, channel, trigger_type)
    VALUES (p_child_id, 'in_app', 'star_milestone');
  END IF;

  RETURN v_milestone;
END;
$$;

-- Server-only: no parent/child role may grade / award directly.
REVOKE EXECUTE ON FUNCTION public.apply_grading_result(UUID, UUID, TEXT, TEXT, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_grading_result(UUID, UUID, TEXT, TEXT, NUMERIC, DATE)
  TO service_role;
