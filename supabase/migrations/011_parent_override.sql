-- =============================================================================
-- 011_parent_override.sql — manual grade correction (activity feed's "תקן ידנית")
-- Source of truth: docs/platform-data-model-and-rules.md →
--   "Parent override — safety net, not a gate"
--
-- Depends on migration 008 (reward_ledger.submission_id). Two changes:
--
-- (1) apply_grading_result (006) now stamps submission_id on the star row it
--     inserts, so future overrides (and any reconciliation query) can trace a
--     star back to the exact answer that earned it. Pure addition — no other
--     behavior changes; CREATE OR REPLACE keeps the same signature.
--
-- (2) apply_parent_override — the actual correction. This does NOT edit or
--     delete the original star row (reward_ledger has no UPDATE/DELETE-by-
--     submission path exposed anywhere else in the app, and rewriting history
--     would make the ledger a worse audit trail, not a better one). Instead it
--     inserts a COMPENSATING row — positive when Claude wrongly marked an
--     answer wrong (award the star now), negative when Claude was too lenient
--     (claw the star back) — and adjusts child_stats to match. Every override
--     is itself logged on the submission (parent_override_at/_note) per the
--     doc, in addition to the compensating ledger entry.
--
-- Deliberately NOT replicated here: apply_grading_result's star-milestone
-- detection/notification. A milestone crossed via a rare manual correction is
-- an edge case the doc doesn't call out; can be added later if wanted.
--
-- The bonus-question 3x math is duplicated from lib/grading/service.ts
-- (isBonus = question not among the daily_set's 5 regular ids) because this
-- runs in SQL at override time, not at grading time — keep both in sync if the
-- bonus multiplier ever changes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (1) apply_grading_result — now stamps submission_id (identical otherwise).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_grading_result(
  p_submission_id UUID,
  p_child_id UUID,
  p_status TEXT,
  p_feedback TEXT,
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
  IF p_status NOT IN ('correct', 'incorrect') THEN
    RAISE EXCEPTION 'invalid grading status: %', p_status;
  END IF;

  UPDATE submissions
     SET status = p_status,
         graded_at = now(),
         graded_by = 'claude_api',
         ai_feedback_text = p_feedback
   WHERE id = p_submission_id
     AND status IN ('unanswered', 'grading');

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_status = 'incorrect' THEN
    RETURN false;
  END IF;

  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis, submission_id)
  VALUES (p_child_id, 'star', 'money', p_amount_nis, p_submission_id);

  SELECT total_stars, total_money_owed_nis, streak, last_played_date, reward_milestone_pending
    INTO v_prev_stars, v_prev_money, v_streak, v_last, v_prev_pending
  FROM child_stats
  WHERE child_id = p_child_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_prev_stars   := 0;
    v_prev_money   := 0;
    v_streak       := 0;
    v_last         := NULL;
    v_prev_pending := false;
  END IF;

  v_new_stars := v_prev_stars + 1;
  v_new_money := v_prev_money + p_amount_nis;

  v_milestone := (v_new_stars / 10) > (v_prev_stars / 10);

  IF v_last IS DISTINCT FROM p_play_date THEN
    IF v_last = p_play_date - 1 THEN
      v_new_streak := v_streak + 1;
    ELSE
      v_new_streak := 1;
    END IF;
    v_new_last := CASE WHEN v_last IS NULL OR p_play_date > v_last
                       THEN p_play_date ELSE v_last END;
  ELSE
    v_new_streak := v_streak;
    v_new_last   := v_last;
  END IF;

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

  IF v_milestone THEN
    INSERT INTO notifications (child_id, channel, trigger_type)
    VALUES (p_child_id, 'in_app', 'star_milestone');
  END IF;

  RETURN v_milestone;
END;
$$;

-- ---------------------------------------------------------------------------
-- (2) apply_parent_override — flip a graded submission's verdict.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_parent_override(
  p_submission_id UUID,
  p_child_id UUID,
  p_new_status TEXT,   -- 'correct' | 'incorrect' — the corrected verdict
  p_note TEXT          -- parent_override_note; optional
)
RETURNS JSONB          -- { "balance": number, "stars": number } after the override
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status      TEXT;
  v_question_id     UUID;
  v_daily_set_id    UUID;
  v_daily_set_qids  UUID[];
  v_shekel_per_star NUMERIC;
  v_is_bonus        BOOLEAN;
  v_amount          NUMERIC;
  v_star_delta      INTEGER;
  v_balance         NUMERIC;
  v_new_stars       INTEGER;
BEGIN
  IF p_new_status NOT IN ('correct', 'incorrect') THEN
    RAISE EXCEPTION 'invalid override status: %', p_new_status;
  END IF;

  SELECT status, question_id, daily_set_id
    INTO v_old_status, v_question_id, v_daily_set_id
  FROM submissions
  WHERE id = p_submission_id AND child_id = p_child_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission % not found for child %', p_submission_id, p_child_id;
  END IF;
  IF v_old_status NOT IN ('correct', 'incorrect') THEN
    RAISE EXCEPTION 'submission % has not been graded yet (status=%)', p_submission_id, v_old_status;
  END IF;
  IF v_old_status = p_new_status THEN
    RAISE EXCEPTION 'submission % is already %', p_submission_id, p_new_status;
  END IF;

  SELECT shekel_per_star INTO v_shekel_per_star FROM children WHERE id = p_child_id;
  SELECT question_ids INTO v_daily_set_qids FROM daily_sets WHERE id = v_daily_set_id;
  -- Same "not among the daily set's 5 regular ids" rule as lib/grading/service.ts.
  v_is_bonus := NOT (v_question_id = ANY (v_daily_set_qids));
  v_amount := v_shekel_per_star * (CASE WHEN v_is_bonus THEN 3 ELSE 1 END);

  -- 1) Flip the verdict; log the override on the submission itself (doc:
  --    parent_override_at / parent_override_note).
  UPDATE submissions
     SET status = p_new_status,
         graded_by = 'parent_override',
         parent_override_at = now(),
         parent_override_note = NULLIF(btrim(p_note), '')
   WHERE id = p_submission_id;

  IF p_new_status = 'correct' THEN
    v_star_delta := 1;   -- Claude wrongly marked it wrong — award the star now.
  ELSE
    v_star_delta := -1;  -- Claude was too lenient — claw the star back.
    v_amount := -v_amount;
  END IF;

  -- 2) Compensating ledger row (never edits the original — see file header).
  INSERT INTO reward_ledger (child_id, type, reward_kind, amount_nis, label, note, submission_id)
  VALUES (
    p_child_id, 'star', 'money', v_amount,
    CASE WHEN p_new_status = 'correct'
      THEN 'תיקון הורה: תשובה סומנה כנכונה'
      ELSE 'תיקון הורה: תשובה סומנה כלא נכונה'
    END,
    NULLIF(btrim(p_note), ''),
    p_submission_id
  );

  -- 3) Adjust the rollup. GREATEST(...,0) floors both fields at zero — an
  --    override can never leave a negative balance or star count even if
  --    called in an unexpected order.
  INSERT INTO child_stats (child_id, total_stars, total_money_owed_nis)
  VALUES (p_child_id, GREATEST(v_star_delta, 0), GREATEST(v_amount, 0))
  ON CONFLICT (child_id) DO UPDATE SET
    total_stars          = GREATEST(child_stats.total_stars + v_star_delta, 0),
    total_money_owed_nis = GREATEST(child_stats.total_money_owed_nis + v_amount, 0)
  RETURNING total_money_owed_nis, total_stars INTO v_balance, v_new_stars;

  RETURN jsonb_build_object('balance', COALESCE(v_balance, 0), 'stars', COALESCE(v_new_stars, 0));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_parent_override(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_parent_override(UUID, UUID, TEXT, TEXT)
  TO service_role;
