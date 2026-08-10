# Supabase — schema & migrations

Source of truth for the data model: `platform-data-model-and-rules.md`.

## Applying migrations

No Supabase CLI is wired up yet. To apply `001_initial.sql`:

- **Quickest:** open the Supabase **SQL Editor** → paste the contents of
  `migrations/001_initial.sql` → run. It is idempotent-safe to read but will
  error if the tables already exist (it's a fresh, first migration).
- **Or via CLI** (once installed): `supabase db push`.

After applying, drop the project URL + keys into `.env.local` (see `.env.example`).

## Security model (important)

Two actor types, deliberately handled differently:

| Actor | Auth | How they reach data |
|-------|------|--------------------|
| **Parent** | Supabase Auth user | Direct queries, guarded by **RLS on `auth.uid()`** |
| **Child** | *No auth session* | Only through the **Next.js server + service-role key**, which **bypasses RLS**, keyed by the child's `access_token` |

Everything a child does (opening the access-token link, playing, answer
grading), every Claude grading call, and every cron job runs **server-side with
the service role**. RLS therefore only has to:

1. Scope each parent to their own subtree (`is_my_child()` helper).
2. Allow authenticated reads of the shared `questions` bank and the aggregated
   `peer_cohort_stats`.
3. Deny everyone on `analytics_fact_performance` (RLS on, **no policies** =
   default-deny) — service-role only.

### Notes / deliberate choices

- **Answer keys**: `questions` is readable by any authenticated parent, so
  `answer_key_*` columns are technically visible to them (RLS is row-level, not
  column-level). Acceptable in v1 — parents are trusted and can already override
  grades. If we later need to hide them, expose a text-only view and revoke
  direct `SELECT`.
- **Parent writes to child-scoped tables** (overrides, sending a bonus, stats,
  ledger) intentionally have **no RLS write policy** — they must go through
  server-side service-role transactions so the ledger and `child_stats` stay
  consistent atomically.
- **Consent gate** (`parents.consent_accepted_at`) is enforced at the app layer,
  not in RLS, to avoid locking a parent out before they can accept.
- **k-anonymity** (suppress cohorts with `child_count < 5`) is enforced by the
  weekly job that populates `peer_cohort_stats`, and by any reader of
  `analytics_fact_performance` — not by a DB constraint.

## Still to come (later steps)

- Seed content for the `questions` bank (bilingual he/en) — a content task.
- Cron jobs (Vercel Cron): weekly improvement bonus, recalibration, rollups,
  peer/warehouse refresh.
- Generated TypeScript types from the schema (`types/database.ts`).
