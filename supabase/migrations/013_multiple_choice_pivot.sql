-- =============================================================================
-- 013_multiple_choice_pivot.sql — multiple-choice questions + mandatory age
-- Source of truth: the multiple-choice pivot decision (docs/platform-data-model
-- -and-rules.md → "DECIDED (superseding the free-text+AI model going forward)")
--
-- WHY: free-text + Claude grading is being replaced, going forward, with fixed
-- 3-option multiple choice, graded deterministically server-side (no AI call).
-- This is additive, NOT a migration of existing data:
--   • questions.text_he/text_en (the prompt) stay the shared column for BOTH
--     formats — only the "how is it answered/graded" part changes.
--   • questions.answer_key_he/answer_key_en/difficulty_tier are left exactly
--     as they are; legacy free-text rows keep using them, untouched.
--   • A row is "multiple choice" iff correct_index IS NOT NULL. The app checks
--     that, not a separate type column — one less thing that could disagree
--     with the data.
--
-- Also adds mandatory age-based content selection:
--   • children.age (10-16, NOT NULL) — required going forward at the app layer
--     (add-child wizard blocks submission without it) and now enforced here too.
--   • age_band is DERIVED from age at read time (lib/ages.ts), not stored — it's
--     a pure function of age, so a stored column would just be one more place
--     for it to drift after an edit. questions.age_band IS a stored column
--     (there's no "age" to derive it from on a question), used to filter the
--     daily pool.
--   • Backfill: the 15 existing children have no `age` yet. TEMPORARY DEFAULT —
--     same pattern as the category_levels bypass (see actions.ts) — every
--     existing NULL age is set to 12 (age_band '12-13') so nobody gets blocked
--     by a newly-required field they were never asked for. REVERT: once every
--     parent has confirmed/edited their child's real age via EditChildScreen,
--     this backfilled value has no special status left to revert — it's real
--     data at that point, just a temporary starting value today.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (1) New category value: english_vocabulary. Extend everywhere `category` is
--     constrained to the fixed bank (questions, children.enabled_categories,
--     and the two aggregation tables that mirror the same enum).
-- ---------------------------------------------------------------------------
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_category_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_category_check
  CHECK (category IN ('math','science','israeli_history','general_knowledge','english_vocabulary'));

ALTER TABLE children DROP CONSTRAINT IF EXISTS children_enabled_categories_check;
ALTER TABLE children
  ADD CONSTRAINT children_enabled_categories_check
  CHECK (enabled_categories <@ ARRAY['math','science','israeli_history','general_knowledge','english_vocabulary']::TEXT[]);

ALTER TABLE peer_cohort_stats DROP CONSTRAINT IF EXISTS peer_cohort_stats_category_check;
ALTER TABLE peer_cohort_stats
  ADD CONSTRAINT peer_cohort_stats_category_check
  CHECK (category IN ('math','science','israeli_history','general_knowledge','english_vocabulary'));

ALTER TABLE analytics_fact_performance DROP CONSTRAINT IF EXISTS analytics_fact_performance_category_check;
ALTER TABLE analytics_fact_performance
  ADD CONSTRAINT analytics_fact_performance_category_check
  CHECK (category IN ('math','science','israeli_history','general_knowledge','english_vocabulary'));

-- ---------------------------------------------------------------------------
-- (2) Multiple-choice columns on questions. All nullable — legacy free-text
--     rows leave every one of these NULL and are completely unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE questions
  ADD COLUMN option1_he TEXT,
  ADD COLUMN option2_he TEXT,
  ADD COLUMN option3_he TEXT,
  ADD COLUMN option1_en TEXT,
  ADD COLUMN option2_en TEXT,
  ADD COLUMN option3_en TEXT,
  ADD COLUMN correct_index SMALLINT,
  ADD COLUMN age_band TEXT;

ALTER TABLE questions
  ADD CONSTRAINT questions_correct_index_check CHECK (correct_index IS NULL OR correct_index IN (0,1,2)),
  ADD CONSTRAINT questions_age_band_check CHECK (age_band IS NULL OR age_band IN ('10-11','12-13','14-16')),
  -- A row is either fully multiple-choice (all 6 option columns + correct_index
  -- populated) or fully legacy (correct_index NULL) — never a half-filled row
  -- that would silently render broken option buttons.
  ADD CONSTRAINT questions_mc_complete_check CHECK (
    correct_index IS NULL
    OR (
      option1_he IS NOT NULL AND option2_he IS NOT NULL AND option3_he IS NOT NULL AND
      option1_en IS NOT NULL AND option2_en IS NOT NULL AND option3_en IS NOT NULL
    )
  );

-- ---------------------------------------------------------------------------
-- (3) children.age — required going forward, backfilled for existing rows.
-- ---------------------------------------------------------------------------
ALTER TABLE children ADD COLUMN age INTEGER;

-- TEMPORARY DEFAULT (see file header) — existing children only.
UPDATE children SET age = 12 WHERE age IS NULL;

ALTER TABLE children
  ALTER COLUMN age SET NOT NULL,
  ADD CONSTRAINT children_age_check CHECK (age >= 10 AND age <= 16);

-- ---------------------------------------------------------------------------
-- (4) graded_by gains a third value for deterministic multiple-choice grading
--     (no Claude call — see lib/grading/service.ts's gradeMultipleChoice path).
-- ---------------------------------------------------------------------------
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_graded_by_check;
ALTER TABLE submissions
  ADD CONSTRAINT submissions_graded_by_check
  CHECK (graded_by IN ('claude_api','parent_override','mc_deterministic'));

-- apply_grading_result (006, restamped 011) hardcoded graded_by = 'claude_api'.
-- Add p_graded_by with that same value as its DEFAULT, so this is a pure
-- backward-compatible addition — every existing call site (which omits the new
-- param) behaves identically; only the new MC grading path passes
-- 'mc_deterministic' explicitly.
CREATE OR REPLACE FUNCTION public.apply_grading_result(
  p_submission_id UUID,
  p_child_id UUID,
  p_status TEXT,
  p_feedback TEXT,
  p_amount_nis NUMERIC,
  p_play_date DATE,
  p_graded_by TEXT DEFAULT 'claude_api'
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
  IF p_graded_by NOT IN ('claude_api', 'mc_deterministic') THEN
    RAISE EXCEPTION 'invalid graded_by for apply_grading_result: %', p_graded_by;
  END IF;

  UPDATE submissions
     SET status = p_status,
         graded_at = now(),
         graded_by = p_graded_by,
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

REVOKE EXECUTE ON FUNCTION public.apply_grading_result(UUID, UUID, TEXT, TEXT, NUMERIC, DATE, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_grading_result(UUID, UUID, TEXT, TEXT, NUMERIC, DATE, TEXT)
  TO service_role;
