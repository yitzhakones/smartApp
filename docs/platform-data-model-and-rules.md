# Data model & business rules — v1 (multi-family, real product)

## Entities (Supabase / Postgres tables)

**parents**
- id, email, auth via Supabase Auth
- whatsapp_number (optional at signup — not required for v1 since notifications are in-app only; collected now so it's ready when WhatsApp notifications are added later)
- locale: `he` | `en` (controls the parent dashboard's own language — independent of each child's `locale`, since a parent might run the dashboard in English for an investor demo while a child still plays in Hebrew, or vice versa)
- consent_accepted_at (timestamp — required, blocks account use until set)
- notification_prefs (in_app: bool [always on], email: bool [default on], whatsapp: bool [off — not built yet])
- created_at

**children**
- id, parent_id
- display_name
- gender: `male` | `female` (drives Hebrew grammatical agreement across the UI — see Localization section below)
- locale: `he` | `en` (set per child, independently — siblings can each play in their own language)
- age_group (e.g. "10-12" — used only for anonymous peer-cohort bucketing, never shown to other families)
- region (optional, coarse only — e.g. city/district, never precise geolocation; disclosed explicitly in the consent screen since it's an added data point about a minor)
- access_mode: `pin` | `no_code` (parent's choice per child)
- access_token (long random string — the real per-child identifier baked into the one-time link the parent shares; see the Child access section below)
- access_pin (nullable, only if access_mode = pin — a simple 4-digit secondary gate, not globally unique)
- enabled_categories (array — parent picks from the fixed bank: math / science / israeli_history / general_knowledge, etc.)
- category_levels (JSON, one tier per enabled category — e.g. `{ math: "hard", science: "easy", history: "medium" }` — set by the placement calibration below, then adjusted over time; this, not `age_group`, is what actually drives which difficulty of question gets picked daily. `age_group` is kept only for anonymous peer-cohort bucketing.)
- shekel_per_star (numeric, parent-configurable, default ₪1)
- weekly_improvement_bonus (numeric, parent-configurable, default ₪10)
- created_at

**questions** (shared bank, platform-managed — not user-editable in v1)
- id, category, difficulty_tier: `easy` | `medium` | `hard` (calibrated against official Ministry of Education curriculum grade-bands per subject, not an arbitrary label — this is the "evidence" behind age/grade appropriateness)
- text_he, text_en (full bilingual content from day one, per the decision to translate the question bank itself, not just UI chrome)
- answer_key_he, answer_key_en (the Claude grader uses whichever matches the child's `locale`)

**daily_sets**
- id, child_id, date, question_ids[] (5 questions)
- auto-generated once per child+date, deterministic seed = hash(child_id + date), pulled only from that child's `enabled_categories`

**submissions**
- id, daily_set_id, question_id, child_id
- answer_text, status: `unanswered` | `grading` | `correct` | `incorrect`
- submitted_at, graded_at
- graded_by: `claude_api` | `parent_override`
- ai_feedback_text (the short encouraging message + correct-answer explanation Claude returns)
- parent_override_at, parent_override_note (nullable — filled only if a parent manually flips the grade)
- locked once graded (auto, near-instant) — no child-side editing after that, and (per decision) **no retry on a wrong answer** — one attempt per question per day

**child_stats** (rollup, updated on every grading event — avoids recomputing from scratch)
- child_id, total_stars, total_money_owed_nis, streak, last_played_date, reward_milestone_pending (bool)

**weekly_rollups**
- child_id, week_start_date, stars_this_week, stars_last_week, improved (bool), bonus_awarded (bool)
- computed by a scheduled job (Vercel Cron, weekly) — compares this week's correct count to last week's

**reward_ledger** (full audit trail — this is the source of truth for "how much money is owed")
- id, child_id, type: `star` | `weekly_bonus` | `parent_reward` | `withdrawal`
- reward_kind: `money` | `privilege` (only relevant for type=`parent_reward` — a `star`/`weekly_bonus` is always money; `withdrawal` is always money)
- amount_nis (nullable — only set for `money` rewards and for `withdrawal`, where it's the amount actually paid out), label (e.g. "גלידה 🍦", "חצי שעה זמן מסך נוסף", or a custom free-text privilege; null for plain star/weekly rows)
- payment_method (only for type=`withdrawal` — free text/short enum, e.g. `cash` | `bit` | `bank_transfer` | `other`)
- note (optional free text — an encouragement message attached to any reward, monetary or not)
- created_at

**Withdrawal / settlement — a core v1 requirement, not a future nice-to-have**
- Without a way to record actual payment, `child_stats.total_money_owed` only ever grows and stops meaning anything the moment a parent pays out cash, Bit, or any other real-world method outside the app.
- The parent dashboard needs a "סימון משיכה/תשלום" action per child: parent enters the amount actually paid and how (`payment_method`), which inserts a `withdrawal` row and **reduces** `child_stats.total_money_owed` by that amount. This is what keeps the displayed balance meaning "what I still owe," not "everything ever earned."
- This deducts from the running total but never rewrites history — every star/bonus/reward row stays in the ledger permanently; only the running balance shown to both parent and child reflects `sum(earned) - sum(withdrawn)`.

**reward_presets** (parent-editable quick-pick chips shown when sending a bonus)
- id, parent_id, kind: `money` | `privilege`
- label (e.g. "₪10", "גלידה", "ערב סרט", "חטיף אהוב", "חצי שעה זמן מסך נוסף")
- amount_nis (only for kind=money)
- seeded with sensible defaults per new family (₪5/₪10/₪20 + the 4 privilege examples above); parent can add/edit/remove; free-text entry is always available too, not limited to presets

**notifications**
- id, child_id, channel: `in_app` | `email` | `whatsapp` (only `in_app` is built in v1; `email` is phase 2; `whatsapp` is reserved for a later phase)
- trigger_type: `correct_answer` | `star_milestone` | `weekly_bonus`
- sent_at, status

**peer_cohort_stats** (aggregated only — no per-child or per-family identifiers)
- age_group, category, week_start_date, avg_correct_rate, percentile_buckets (e.g. p25/p50/p75/p90)
- refreshed by a scheduled job; this is the ONLY table a parent's dashboard queries for "how does my child compare" — it never joins against another family's raw data
- **from a data-architecture standpoint, this is really just a parent-facing narrow view of `analytics_fact_performance` below (age + category only) — it exists as its own simple table so the parent app never has to touch the richer warehouse table directly**

**analytics_fact_performance** (the actual warehouse layer — everything else, including `peer_cohort_stats`, is a projection of this)
- Dimensions: `period_start`, `period_type` (`week`/`month`/`year` — matching the trend-chart granularity already built), `age_group`, `gender`, `category`, `difficulty_tier`, `region` (nullable — only populated where a family provided it)
- Metrics: `child_count` (n — how many children fall into this exact dimension combination), `avg_accuracy_rate`, `avg_stars_per_child`, `avg_improvement_rate`
- Refreshed by the same weekly cron job as the other periodic jobs; this is what any future cross-cutting analysis (business reporting, product decisions, or richer parent-facing comparisons) should query, rather than each new "compare X" feature inventing its own aggregation from scratch.
- **Privacy safeguard (k-anonymity):** any row where `child_count` falls below a minimum threshold (suggest N=5) is suppressed — not returned to any consumer, parent-facing or internal. Slicing by several dimensions at once (age + gender + region + category, say) can shrink a cell down to a handful of children, which risks effectively re-identifying a specific kid even though no name is attached. This threshold rule applies uniformly, everywhere this table is read from.
- **What's shown to parents today stays deliberately narrow** (age_group + category only, exactly as already built) — gender/region cuts exist in the warehouse for future product or business use, but nothing about them is surfaced to parents unless we decide later, this is a considered decision.

**Parent dashboard — multiple children**
- One dashboard, one login. If a parent has more than one child, a lightweight tab switcher at the top lets them flip between children — not separate re-login screens per child. All the per-child views (stats, activity/override feed, send-bonus panel, peer benchmark) live under whichever tab is active.

**Localization — language (per child) and grammatical gender (Hebrew only)**
- `locale` is a per-child setting, not per-family — siblings can each play in their own language independently.
- **The parent dashboard also needs full English support**, as its own `parents.locale` setting — this is a deliberate product requirement, not just a nice-to-have: it means the whole thing (metrics, trend chart, bonus panel, activity feed, settings) can be flipped to English instantly for a non-Hebrew-speaking audience — e.g. showing it to an overseas investor — without anyone needing to demo it live in Hebrew and translate on the fly.
- Parent-facing Hebrew copy is simpler to make gender-neutral than the child side (it mostly references "your child" rather than addressing the parent directly with gendered verbs), so this layer should need less linguistic nuance than the child side — but any spot that does address the parent directly ("שלחת בונוס!") should default to a neutral construction rather than assuming the parent's gender, since we don't collect that.
- English has no grammatical gender for the phrasing we use ("write your answer", "skip for now") — `gender` only affects string selection when `locale = he`.
- Every UI string in the child experience needs a small lookup keyed by `[locale][gender-if-he]` rather than being hardcoded — e.g. "כתבי כאן" (female) / "כתוב כאן" (male) / "Write here" (en, gender-irrelevant). This touches nearly every verb in the story-mode screens (skip button, "let's start", encouragement text, etc.), so it's a real content pass across the whole locked child UI, not a one-line fix. The parent dashboard needs the equivalent `[locale]`-keyed lookup (no gender axis needed there).
- `locale = en` also flips layout direction (`dir="ltr"`) and mirrors any direction-sensitive elements (e.g. the skip icon's arrow, progress-bar order) — on both the child and parent sides.
- The question bank itself is bilingual from day one (`text_he`/`text_en`, `answer_key_he`/`answer_key_en`) per the decision above — this is a content-authoring task (writing and reviewing ~equivalent English versions of every question) as much as a code task.

**Difficulty calibration — placement quiz + ongoing recalibration**
- **Evidence base, two layers:** (1) a generic default — each question's `difficulty_tier` is calibrated against official Ministry of Education curriculum grade-bands per subject, giving every child a sane starting point before we know anything about them personally; (2) a personal override — the placement quiz and ongoing recalibration below, which always take precedence over the generic default once real data exists for that child.
- **Placement quiz (once, at child setup):** for each `enabled_category`, run a 2-question adaptive ladder, not a fixed quiz: Q1 = medium tier. Correct → Q2 = hard (correct again → start at `hard`; wrong → start at `medium`). Incorrect → Q2 = easy (correct → start at `easy`; wrong again → start at `easy` as well — it's the floor tier, there's nothing below it in the 3-tier scale). With ~5 categories this naturally lands around 10 questions total, but the count isn't fixed — it falls out of however many categories the parent enabled.
- **No score, no pass/fail feedback during placement.** Unlike the real daily flow, placement questions show no correct/incorrect indicator at all in the moment (no confetti, no color flash, no "wrong" framing) — just a neutral, encouraging "תודה! הבאה" between questions. At the end: "מעולה, מתחילים!" with no number or grade ever shown to the child (or the parent) — this is diagnostic plumbing, not a reward moment, and revealing a score would risk making it feel like a test she can fail.
- **Levels are per-category, never a single overall level** — a child can be `hard` in math and `easy` in history simultaneously; `category_levels` reflects that independently.
- **Ongoing recalibration (weekly, same cron as the improvement-bonus job):** for each category, look at recent accuracy; consistently high accuracy at the current tier → bump the tier up one notch; consistently low accuracy → bump it down one notch. This keeps the difficulty tracking real, current performance rather than freezing at whatever the one-time placement quiz found months earlier.

**Bonus question — difficulty and opt-in**
- Always selected from `difficulty_tier = 'hard'`, regardless of the child's `category_levels` tier for that category — it's worth 3× and should read as a genuine extra challenge, not just another question at her usual level.
- Not auto-queued into the flow. After all 5 regular questions are resolved, show an explicit choice screen ("רוצה לנסות שאלת בונוס?") with two clear options — attempt it, or finish for today without it. Declining carries no penalty; she simply skips the 3× opportunity for that day.
- **Story-mode "done" screen bug to fix in the real build:** the current logic derives "finished for today" purely from the question queue being empty, which fires immediately once the last item resolves — before the player ever sees that item's correct/incorrect result screen. The done screen (and, per the rule above, the bonus opt-in screen) must only appear *after* the player taps through the final result screen, not the instant the queue empties. Track "ready to show done/bonus-choice" as a separate flag set only inside the tap-to-continue handler, not derived directly from queue length during render.

**Child access — the unique link mechanism (how a device knows which child it is, with no login)**
- Each `children` row also gets an `access_token` (long, random, unguessable — this is the real identifier, not the PIN). The parent gets a one-time link built from it (e.g. `app.com/p/{access_token}`) from the setup wizard, shares it once with the child (WhatsApp or however), and the child adds it to their home screen as a PWA icon — from then on it's just an app icon, no URL to remember or type again.
- The PIN (when `access_mode = pin`) is a lightweight secondary gate shown after opening that link — mainly to stop a sibling grabbing the wrong phone, not real security. Because it only gets checked in the context of that specific child's own link, it doesn't need to be globally unique across the platform — a plain 4-digit code is fine.
- After a correct PIN entry, remember the device for a reasonable window (suggest 30 days) via a signed cookie/local session, so daily use is a single tap on the home-screen icon rather than retyping a PIN every morning. Re-prompt after the window expires or if local storage is cleared.
- If `access_mode = no_code`, opening the link goes straight to the child's home screen — no gate at all.

## Future ideas / parking lot (deliberately not v1 — recorded so they aren't lost)

### DECIDED (superseding the free-text+AI model going forward)

**Multiple-choice pivot** — implemented on `feature/multiple-choice-pivot` (migration 013). Free-text + Claude grading is being replaced going forward with fixed 3-option multiple choice, graded fully deterministically server-side — no AI call for this question type. This is additive, not a migration of existing data: legacy free-text rows (and any child still mid-flow on one) are untouched and keep working exactly as before.

- **Schema (`questions`):** `option1_he`/`option2_he`/`option3_he`, `option1_en`/`option2_en`/`option3_en` (the 3 choices, bilingual), `correct_index` (`0`-`2`), `age_band` (`'10-11'` | `'12-13'` | `'14-16'`). All nullable. `text_he`/`text_en` stay the shared prompt column for BOTH formats — only the "how is it answered/graded" part changes, so a row is multiple-choice iff `correct_index IS NOT NULL`, never a separate type column. `answer_key_he`/`answer_key_en`/`difficulty_tier` are untouched, used only by legacy free-text rows.
- **New category:** `english_vocabulary`, added everywhere `category` is constrained (questions, `children.enabled_categories`, and the two aggregation tables mirroring the same enum).
- **Mandatory age-based content selection:** `children.age` (integer, `10`-`16`) is now a REQUIRED field, collected in the add-child wizard (blocks submission without it) and editable in EditChildScreen. `age_band` is DERIVED from `age` at read time (`lib/ages.ts`), never stored on `children` — a stored copy would just be one more place for it to drift after an edit. The daily question pool (`getOrCreateTodaysGame`) filters by the child's derived `age_band` in addition to `enabled_categories`: a bank row matches if its own `age_band` is `NULL` (legacy/universal) or equals the child's band — never a row explicitly banded for a *different* age.
- **Grading:** the child taps one of 3 options; the client sends the chosen index; the server compares it to `correct_index` directly (`lib/grading/service.ts`'s `gradeMultipleChoiceSubmission`) and applies the reward through the same atomic `apply_grading_result` RPC as free-text grading (now parameterized with `graded_by`, so it can stamp `'mc_deterministic'` instead of `'claude_api'`). The free-text/Claude path (`gradeSubmission`) is untouched and still runs for any remaining free-text question — `/api/grade` decides which path a submission takes from the question's own `correct_index`, never from what the client's payload happens to contain.
- **Story-mode UI:** 3 tappable option buttons with letter badges (א/ב/ג, regardless of the child's locale). Tapping one immediately locks it in and submits — no separate confirm button. Same result screens/confetti/category gradients as the free-text flow; `english_vocabulary` gets its own amber/brown gradient alongside the existing per-category ones.
- **Existing children backfill:** the 15 pre-existing children had no `age` (brand-new required field) — backfilled to `12` (age_band `'12-13'`) directly in migration 013, marked TEMPORARY DEFAULT there, same pattern as the `category_levels` bypass in `actions.ts`. The real long-term flow is each parent confirming/editing the real age via EditChildScreen.
- **Seed data:** deliberately NOT part of this decision's initial implementation — the multiple-choice question bank content is a separate follow-up (question authoring + import), scoped and tracked independently.

**Simple parent-defined weekly-interest savings** — distinct from the market-index-linked simulation discussed separately (S&P500/Nasdaq tracking with a real payout tied to real market moves, which carries genuine legal/behavioral nuance — see that discussion for the full analysis). This is the simpler, safer sibling idea: the parent sets a fixed weekly growth percentage themselves (not tied to any external market data). Money the child chooses to move into "savings" grows by that parent-defined percentage each week, and the child gets a notification when it grows ("איזה יופי! מה שחסכת גדל השבוע"). Because the rate is entirely parent-controlled and never tied to an external, unpredictable data source, this stays fully deterministic — no market-volatility complexity, no legal ambiguity, no risk of the value ever *dropping*. Worth building as the first, simple version of the "savings/investing education" pillar, with the market-linked version (if ever built) as a more advanced, opt-in layer on top.

## Business rules

**Signup & consent**
- Parent signs up via Supabase Auth (email/password), provides WhatsApp number, and must explicitly check a consent box ("אני ההורה/האפוטרופוס החוקי, ואני מסכים ל...") linked to Terms + Privacy Policy before the account becomes usable. This is a hard gate, not a soft reminder.

**Daily question flow**
- Same as the artifact version we already validated: 5 questions/day, auto-picked deterministically from the child's enabled categories, text-answer with paste blocked, editable while pending, locked once graded.

**Grading — automated via Claude API (no parent action required)**
- **Future optimization (not v1 — revisit only after the core grading flow is proven stable):** for questions with a single, unambiguous numeric/short answer, a fast local pre-check (normalized exact match — trim whitespace, compare numbers) could run before calling the Claude API at all, falling back to Claude only when the quick check fails (different phrasing, spelled-out numbers, etc.). This would cut cost and response time for the easy majority of cases without losing Claude's flexibility for the ambiguous ones. Deliberately deferred until after the current grading bugs (double-submit, reward amount) are confirmed fixed — don't layer an optimization on top of an unverified core flow.
- Bonus-question reward: fixed at **3× `shekel_per_star`** (not a separately configurable field — keeps the reward model simple while still making the bonus question feel meaningfully bigger). A regular correct answer pays `shekel_per_star`; a correct bonus answer pays `shekel_per_star * 3`.
- On submit, the answer is sent server-side (not from the browser — protects the API key and prevents tampering) to the Claude API along with the question's `answer_key`. Claude returns a structured result: `{ is_correct: boolean, feedback_message: string }`. Status moves `unanswered` → `grading` (near-instant, typically 1-2 seconds) → `correct`/`incorrect`. There is no meaningful "waiting for parent" window anymore — the child gets a result essentially immediately.
- The grading prompt instructs Claude to accept reasonably-phrased equivalent answers (e.g. "1948" vs "בשנת 1948", minor spelling slips) rather than doing brittle exact-string matching, using the `answer_key` as ground truth rather than relying purely on its own general knowledge.
- On `correct`:
  1. Insert a `star` row into `reward_ledger` (amount = child's `shekel_per_star`).
  2. Update `child_stats` (total_stars, total_money_owed, streak logic as before).
  3. If a star-milestone was crossed (every 10) → flag `reward_milestone_pending` and create an in-app notification (email/WhatsApp come in later phases per the sequencing below).
  4. Show Claude's encouraging feedback message to the child in-app.
- On `incorrect`:
  1. **No star, no money.** The submission locks — no retry on the same question/day (matches what we decided).
  2. Show Claude's feedback message (encouraging tone) plus the correct answer, for learning value only — explicitly no reward attached.

**Parent override — safety net, not a gate**
- Since real money is paid out automatically and Claude can occasionally misjudge a borderline answer, the parent dashboard shows a "תקן ידנית" (manual correct) button on every graded submission (not just a queue of pending ones — grading already happened).
- This does **not** block or delay the reward — the child already got her result and, if correct, her star/money instantly. The override exists purely to let the parent flip a wrong AI call after the fact (e.g., retroactively award a star + money if Claude wrongly marked something incorrect, or remove one if Claude was too lenient). Every override is logged (`parent_override_at`, `parent_override_note`) for audit purposes and adjusts `reward_ledger`/`child_stats` accordingly.

**Weekly improvement bonus**
- Scheduled job runs weekly: compares `stars_this_week` vs `stars_last_week` per child.
- If improved → insert `weekly_bonus` row into `reward_ledger`, mark `bonus_awarded`, create an in-app notification ("הבת שלך השתפרה השבוע! בונוס של ₪X").

**Notifications — sequencing**
- **V1: in-app only.** The child's own dashboard (already built in the mockup — "הודעה מהורה" card) and the parent's own dashboard are the only surfaces. No outbound email/WhatsApp yet.
- **Phase 2: add email.** Same trigger events (star milestone, weekly bonus), sent via a transactional email service — simple, no external approval process needed.
- **Phase 3 (later): WhatsApp, one-way only.** Outbound template-message notifications via Meta WhatsApp Business Cloud API purely as an FYI channel to the parent (no reply-parsing, no webhook, no two-way matching) — this is much simpler than the two-way design we scoped earlier, since the parent already has a full in-app way to respond with a bonus/message.

**Parent-to-child bonus/encouragement — in-app**
- The parent dashboard has a "שליחת בונוס/הודעה" action per child with:
  1. Quick-pick chips built from that family's `reward_presets` (mix of money and privilege types shown together, e.g. ₪10 · גלידה · ערב סרט · חצי שעה זמן מסך נוסף).
  2. A free-text option for anything not in the presets (custom money amount or a custom privilege the parent types themselves).
  3. An optional short encouragement note attachable to any of the above.
- Selecting/submitting writes a `parent_reward` row to `reward_ledger` (money → updates `child_stats.total_money_owed`; privilege → no money impact, just recorded + shown) and appears on the child's dashboard as a "הודעה מהורה" card, exactly as already mocked up.

**Peer benchmarking (parent-facing only)**
- Dashboard shows: "הילד/ה שלך נמצא/ת באחוזון X מתוך ילדים בגילה בקטגוריית Y" — computed only from `peer_cohort_stats`, refreshed weekly, never exposing another family's identity or raw scores.
- Off by default until the parent explicitly opts in from settings.
- Never shown to the child directly.

**Reward determinism**
- No random/chance-based reward at any point. Every ₪ awarded traces to a specific rule (star, weekly bonus, or an explicit parent tip) — this is the core legal-safety property we're preserving from the research.
