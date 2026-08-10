-- =============================================================================
-- 001_initial.sql — Trivia rewards platform, initial schema + RLS
-- Source of truth: platform-data-model-and-rules.md
--
-- SECURITY MODEL (read this before touching any policy):
--   • Parents ARE Supabase Auth users. Everything they touch is guarded by RLS
--     keyed on auth.uid(). A parent may read/write only their own subtree.
--   • Children have NO auth session. Their whole experience (opening the
--     access-token link, playing, answer grading) is mediated by the Next.js
--     server using the SERVICE ROLE key, which BYPASSES RLS. The same is true
--     for the Claude grading calls and every scheduled (cron) job.
--   • Therefore RLS here only needs to (a) scope each parent to their own data,
--     (b) allow authenticated reads of the shared question bank and the
--     aggregated peer stats, and (c) deny everyone on the raw warehouse table
--     (analytics_fact_performance) — that one is service-role only.
--
-- Fields follow the data-model doc exactly; created_at is present only on the
-- entities where the doc lists it.
-- =============================================================================

-- =============================================================================
-- Tables
-- =============================================================================

-- Parents — extends auth.users (1:1), like Printhood's profiles table.
CREATE TABLE parents (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  whatsapp_number TEXT,                              -- optional in v1 (in-app notifications only)
  locale TEXT NOT NULL DEFAULT 'he' CHECK (locale IN ('he','en')),
  consent_accepted_at TIMESTAMPTZ,                   -- hard gate: account unusable until set (enforced app-side)
  notification_prefs JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "whatsapp": false}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Children — owned by a parent. access_token is the real, unguessable per-child
-- identifier baked into the shared link; access_pin is only a soft sibling gate.
CREATE TABLE children (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  locale TEXT NOT NULL DEFAULT 'he' CHECK (locale IN ('he','en')),
  age_group TEXT,                                    -- e.g. "10-12" — anonymous cohort bucketing only
  region TEXT,                                       -- optional, coarse only
  access_mode TEXT NOT NULL DEFAULT 'pin' CHECK (access_mode IN ('pin','no_code')),
  -- 64-char unguessable token from two core gen_random_uuid()s (no pgcrypto/search_path dependency).
  access_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', ''),
  access_pin TEXT CHECK (access_pin IS NULL OR access_pin ~ '^[0-9]{4}$'),
  enabled_categories TEXT[] NOT NULL DEFAULT '{}'
    CHECK (enabled_categories <@ ARRAY['math','science','israeli_history','general_knowledge']::TEXT[]),
  category_levels JSONB NOT NULL DEFAULT '{}',       -- { math: "hard", science: "easy", ... }
  shekel_per_star NUMERIC(6,2) NOT NULL DEFAULT 1,
  weekly_improvement_bonus NUMERIC(6,2) NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- A PIN only makes sense in 'pin' mode.
  CONSTRAINT pin_requires_pin_mode CHECK (access_pin IS NULL OR access_mode = 'pin')
);

-- Questions — shared, platform-managed bank. Bilingual from day one.
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('math','science','israeli_history','general_knowledge')),
  difficulty_tier TEXT NOT NULL CHECK (difficulty_tier IN ('easy','medium','hard')),
  text_he TEXT NOT NULL,
  text_en TEXT NOT NULL,
  answer_key_he TEXT NOT NULL,
  answer_key_en TEXT NOT NULL
);

-- Daily sets — exactly 5 questions per child per day, one row per (child, date).
CREATE TABLE daily_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  question_ids UUID[] NOT NULL CHECK (cardinality(question_ids) = 5),
  UNIQUE (child_id, date)
);

-- Submissions — one attempt per question per day (no retry).
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_set_id UUID REFERENCES daily_sets(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  status TEXT NOT NULL DEFAULT 'unanswered'
    CHECK (status IN ('unanswered','grading','correct','incorrect')),
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by TEXT CHECK (graded_by IN ('claude_api','parent_override')),
  ai_feedback_text TEXT,
  parent_override_at TIMESTAMPTZ,
  parent_override_note TEXT,
  UNIQUE (daily_set_id, question_id)                 -- enforces "one attempt per question per day"
);

-- Child stats — rollup, one row per child, updated on every grading event.
CREATE TABLE child_stats (
  child_id UUID REFERENCES children(id) ON DELETE CASCADE PRIMARY KEY,
  total_stars INTEGER NOT NULL DEFAULT 0,
  total_money_owed_nis NUMERIC(10,2) NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,
  reward_milestone_pending BOOLEAN NOT NULL DEFAULT false
);

-- Weekly rollups — one row per child per week, produced by the weekly cron.
CREATE TABLE weekly_rollups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  stars_this_week INTEGER NOT NULL DEFAULT 0,
  stars_last_week INTEGER NOT NULL DEFAULT 0,
  improved BOOLEAN NOT NULL DEFAULT false,
  bonus_awarded BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (child_id, week_start_date)
);

-- Reward ledger — full audit trail; the source of truth for money owed.
--   type = star | weekly_bonus | parent_reward
--   reward_kind = money | privilege  (star/weekly_bonus are ALWAYS money)
--   amount_nis set only for money rewards; label/note optional free text.
CREATE TABLE reward_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('star','weekly_bonus','parent_reward')),
  reward_kind TEXT NOT NULL DEFAULT 'money' CHECK (reward_kind IN ('money','privilege')),
  amount_nis NUMERIC(10,2),
  label TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- star/weekly_bonus are always money; only parent_reward may be a privilege.
  CONSTRAINT non_reward_is_money CHECK (type = 'parent_reward' OR reward_kind = 'money'),
  -- money rows carry an amount; privilege rows never do.
  CONSTRAINT money_has_amount CHECK (
    (reward_kind = 'money' AND amount_nis IS NOT NULL) OR
    (reward_kind = 'privilege' AND amount_nis IS NULL)
  )
);

-- Reward presets — parent-editable quick-pick chips; seeded per new family.
CREATE TABLE reward_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('money','privilege')),
  label TEXT NOT NULL,
  amount_nis NUMERIC(10,2),
  CONSTRAINT preset_money_has_amount CHECK (
    (kind = 'money' AND amount_nis IS NOT NULL) OR
    (kind = 'privilege' AND amount_nis IS NULL)
  )
);

-- Notifications — v1 builds in_app only; email/whatsapp reserved for later phases.
-- (Doc lists no created_at here, so none is added — status default is a convenience.)
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','whatsapp')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('correct_answer','star_milestone','weekly_bonus')),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Peer cohort stats — parent-facing aggregate projection (age + category only).
-- Populated by the weekly cron, which must only emit rows with n >= 5 children
-- (k-anonymity). This is the ONLY comparison table the parent app ever reads.
CREATE TABLE peer_cohort_stats (
  age_group TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('math','science','israeli_history','general_knowledge')),
  week_start_date DATE NOT NULL,
  avg_correct_rate NUMERIC(5,4),
  percentile_buckets JSONB,                          -- { p25, p50, p75, p90 }
  PRIMARY KEY (age_group, category, week_start_date)
);

-- Analytics warehouse — the rich fact table everything else projects from.
-- Service-role only: RLS is enabled with NO policies, so it is default-deny for
-- every non-service caller. k-anonymity (suppress child_count < 5) is enforced
-- by consumers/jobs; nothing parent-facing ever queries this table directly.
CREATE TABLE analytics_fact_performance (
  period_start DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('week','month','year')),
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  category TEXT NOT NULL CHECK (category IN ('math','science','israeli_history','general_knowledge')),
  difficulty_tier TEXT NOT NULL CHECK (difficulty_tier IN ('easy','medium','hard')),
  region TEXT,                                       -- nullable — only where a family provided it
  child_count INTEGER NOT NULL,
  avg_accuracy_rate NUMERIC(5,4),
  avg_stars_per_child NUMERIC(8,2),
  avg_improvement_rate NUMERIC(5,4)
);

-- region is nullable, so COALESCE it to keep the dimension combo uniquely upsertable.
CREATE UNIQUE INDEX analytics_fact_performance_dims_idx ON analytics_fact_performance (
  period_start, period_type, age_group, gender, category, difficulty_tier, COALESCE(region, '')
);

-- =============================================================================
-- Indexes (foreign keys used by RLS subqueries and hot lookups)
-- =============================================================================
CREATE INDEX children_parent_id_idx        ON children(parent_id);
CREATE INDEX daily_sets_child_id_idx       ON daily_sets(child_id);
CREATE INDEX submissions_child_id_idx      ON submissions(child_id);
CREATE INDEX submissions_daily_set_id_idx  ON submissions(daily_set_id);
CREATE INDEX weekly_rollups_child_id_idx   ON weekly_rollups(child_id);
CREATE INDEX reward_ledger_child_id_idx    ON reward_ledger(child_id);
CREATE INDEX reward_presets_parent_id_idx  ON reward_presets(parent_id);
CREATE INDEX notifications_child_id_idx    ON notifications(child_id);

-- =============================================================================
-- Helper — "does this child belong to the current parent?"
-- SECURITY DEFINER so the ownership check itself bypasses RLS on children
-- (avoids recursive policy evaluation); safe because it only ever compares
-- against auth.uid().
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_my_child(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM children WHERE id = cid AND parent_id = auth.uid()
  );
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE parents                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE children                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_stats                ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rollups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_ledger              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_presets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_cohort_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_fact_performance ENABLE ROW LEVEL SECURITY; -- no policies = default deny

-- Parents: a parent sees and edits only their own row.
CREATE POLICY "Parent reads own row"
  ON parents FOR SELECT USING (id = auth.uid());
CREATE POLICY "Parent updates own row"
  ON parents FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Parent inserts own row"
  ON parents FOR INSERT WITH CHECK (id = auth.uid());

-- Children: full CRUD for the owning parent.
CREATE POLICY "Parent manages own children"
  ON children FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Questions: shared bank, readable by any authenticated parent (for the activity
-- feed). NOTE: RLS is row-level, so answer_key_* columns are also visible to
-- authenticated parents. That is acceptable in v1 (parents are trusted and can
-- already override grades); if we ever need to hide answer keys, expose a
-- text-only view and revoke direct SELECT here. Children read via service role.
CREATE POLICY "Authenticated reads question bank"
  ON questions FOR SELECT TO authenticated USING (true);

-- Child-scoped read-only surfaces for the parent dashboard. All writes to these
-- happen server-side via the service role (grading, cron, overrides, bonuses).
CREATE POLICY "Parent reads own children daily sets"
  ON daily_sets FOR SELECT USING (is_my_child(child_id));
CREATE POLICY "Parent reads own children submissions"
  ON submissions FOR SELECT USING (is_my_child(child_id));
CREATE POLICY "Parent reads own children stats"
  ON child_stats FOR SELECT USING (is_my_child(child_id));
CREATE POLICY "Parent reads own children weekly rollups"
  ON weekly_rollups FOR SELECT USING (is_my_child(child_id));
CREATE POLICY "Parent reads own children ledger"
  ON reward_ledger FOR SELECT USING (is_my_child(child_id));
CREATE POLICY "Parent reads own children notifications"
  ON notifications FOR SELECT USING (is_my_child(child_id));

-- Reward presets: parent fully manages their own quick-pick chips.
CREATE POLICY "Parent manages own reward presets"
  ON reward_presets FOR ALL
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Peer cohort stats: aggregated & identity-free, readable by any parent (the
-- dashboard gates the benchmark behind an opt-in at the app layer).
CREATE POLICY "Authenticated reads peer cohort stats"
  ON peer_cohort_stats FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-create a parents row when a new auth user signs up (mirrors Printhood's
-- handle_new_user). consent_accepted_at stays NULL until the parent accepts.
CREATE OR REPLACE FUNCTION handle_new_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO parents (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_parent();

-- Seed each new family's default reward presets (₪5/₪10/₪20 + 4 privileges),
-- per the "seeded with sensible defaults per new family" rule. Parents can then
-- add/edit/remove, and free-text entry is always available in the UI too.
CREATE OR REPLACE FUNCTION seed_reward_presets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO reward_presets (parent_id, kind, label, amount_nis) VALUES
    (NEW.id, 'money',     '₪5',              5),
    (NEW.id, 'money',     '₪10',             10),
    (NEW.id, 'money',     '₪20',             20),
    (NEW.id, 'privilege', 'משחק',            NULL),
    (NEW.id, 'privilege', 'ערב סרט',         NULL),
    (NEW.id, 'privilege', 'חצי שעה מסך נוספת', NULL),
    (NEW.id, 'privilege', 'מאכל אהוב',        NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_parent_created_seed_presets
  AFTER INSERT ON parents
  FOR EACH ROW EXECUTE FUNCTION seed_reward_presets();
