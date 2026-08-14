// =============================================================================
// lib/dashboard/trend.ts — pure trend-chart aggregation for the parent dashboard.
//
// No pre-built aggregation table exists yet (weekly_rollups / peer_cohort_stats /
// analytics_fact_performance are all populated by the weekly cron, still
// pending). For v1 volumes (a handful of correct answers per child per day),
// computing directly from raw `correct` submissions on every dashboard load is
// simple and fast enough — this module takes that raw list and buckets it.
// Once the cron ships and real history accumulates, this should move to reading
// pre-aggregated rows (weekly_rollups for "week", a materialized monthly/yearly
// view or analytics_fact_performance for the rest) rather than re-scanning raw
// submissions on every request.
//
// Design: each range ("week"/"month"/"year") is a TRAILING window ending today
// (last 7 days / last 4 weeks / last 12 months) rather than a fixed calendar
// bucket. This keeps one invariant true across all three ranges — and across
// every day of the year — that the UI relies on: the LAST bar in the chart is
// always "now", and "previous" is always the equivalent window immediately
// before it. A fixed calendar week/month/year would only line up with that
// convention on some days (e.g. Saturdays), not universally.
//
// Pure and side-effect-free (no Supabase import) so it's unit-testable without a
// database — see trend.test.ts. lib/dashboard/trend-service.ts wraps this with
// the actual data fetch.
// =============================================================================

import type { Category } from '@/types/database'
import { CATEGORY_LABEL_HE } from '@/lib/categories'

export interface CorrectSubmission {
  gradedAt: string // ISO timestamp
  category: Category
}

export interface TrendCategoryChange {
  key: Category
  label: string
  /** null when the previous period had zero activity — no baseline to compare against. */
  changePct: number | null
}

export interface TrendRangeData {
  labels: string[]
  values: number[]
  current: number
  previous: number
  categories: TrendCategoryChange[]
}

export interface TrendData {
  week: TrendRangeData
  month: TrendRangeData
  year: TrendRangeData
}

const WEEKDAY_LABELS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] // index = UTC day-of-week, 0=Sun
const MONTH_LABELS_HE = [
  'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ',
  'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ',
]

// -----------------------------------------------------------------------------
// Calendar-date helpers, all anchored to Asia/Jerusalem (matching "today" as
// computed elsewhere, e.g. scripts/reset-child.mjs) and arithmetic done via
// Date.UTC so it never depends on the server process's own timezone.
// -----------------------------------------------------------------------------
interface CalDate {
  y: number
  m: number // 1-12
  d: number
}

function calDateFromIso(iso: string): CalDate {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

function calKey(c: CalDate): string {
  return `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`
}

function weekdayOf(c: CalDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay()
}

function addDays(c: CalDate, delta: number): CalDate {
  const dt = new Date(Date.UTC(c.y, c.m - 1, c.d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Subtract `n` months from a calendar date; day-of-month is not preserved (callers use 1 or the month's last day). */
function subMonths(c: CalDate, n: number): { y: number; m: number } {
  const zeroBased = c.y * 12 + (c.m - 1) - n
  const y = Math.floor(zeroBased / 12)
  const m = ((zeroBased % 12) + 12) % 12 + 1
  return { y, m }
}

// -----------------------------------------------------------------------------
// Day-bucket index: one pass over the raw rows, then every range reads from it.
// -----------------------------------------------------------------------------
interface DayBucket {
  total: number
  byCategory: Partial<Record<Category, number>>
}

function indexByDay(rows: CorrectSubmission[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>()
  for (const row of rows) {
    if (!row.gradedAt) continue
    const key = calKey(calDateFromIso(row.gradedAt))
    const bucket = map.get(key) ?? { total: 0, byCategory: {} }
    bucket.total += 1
    bucket.byCategory[row.category] = (bucket.byCategory[row.category] ?? 0) + 1
    map.set(key, bucket)
  }
  return map
}

/** Sums all days in [start, end] inclusive. Bounded by callers to ≤366 days. */
function sumRange(
  dayMap: Map<string, DayBucket>,
  start: CalDate,
  end: CalDate
): { total: number; byCategory: Partial<Record<Category, number>> } {
  let total = 0
  const byCategory: Partial<Record<Category, number>> = {}
  const endKey = calKey(end)
  let cursor = start
  while (calKey(cursor) <= endKey) {
    const bucket = dayMap.get(calKey(cursor))
    if (bucket) {
      total += bucket.total
      for (const [cat, n] of Object.entries(bucket.byCategory)) {
        byCategory[cat as Category] = (byCategory[cat as Category] ?? 0) + (n ?? 0)
      }
    }
    cursor = addDays(cursor, 1)
  }
  return { total, byCategory }
}

function categoryChanges(
  enabledCategories: Category[],
  current: Partial<Record<Category, number>>,
  previous: Partial<Record<Category, number>>
): TrendCategoryChange[] {
  return enabledCategories.map((key) => {
    const cur = current[key] ?? 0
    const prev = previous[key] ?? 0
    const changePct = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100)
    return { key, label: CATEGORY_LABEL_HE[key], changePct }
  })
}

function buildWeek(
  dayMap: Map<string, DayBucket>,
  today: CalDate,
  enabledCategories: Category[]
): TrendRangeData {
  const values: number[] = []
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i)
    values.push(dayMap.get(calKey(d))?.total ?? 0)
    labels.push(WEEKDAY_LABELS_HE[weekdayOf(d)])
  }
  const start = addDays(today, -6)
  const { total: current, byCategory: currentBy } = sumRange(dayMap, start, today)
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(prevEnd, -6)
  const { total: previous, byCategory: prevBy } = sumRange(dayMap, prevStart, prevEnd)
  return { labels, values, current, previous, categories: categoryChanges(enabledCategories, currentBy, prevBy) }
}

function buildMonth(
  dayMap: Map<string, DayBucket>,
  today: CalDate,
  enabledCategories: Category[]
): TrendRangeData {
  // Trailing 4 weeks, oldest → most recent (index 3 = the 7 days ending today).
  const values: number[] = []
  for (let w = 3; w >= 0; w--) {
    const end = addDays(today, -7 * w)
    const start = addDays(end, -6)
    values.push(sumRange(dayMap, start, end).total)
  }
  const periodStart = addDays(today, -27)
  const { total: current, byCategory: currentBy } = sumRange(dayMap, periodStart, today)
  const prevEnd = addDays(periodStart, -1)
  const prevStart = addDays(prevEnd, -27)
  const { total: previous, byCategory: prevBy } = sumRange(dayMap, prevStart, prevEnd)
  return {
    labels: ['שבוע 1', 'שבוע 2', 'שבוע 3', 'שבוע 4'],
    values,
    current,
    previous,
    categories: categoryChanges(enabledCategories, currentBy, prevBy),
  }
}

function buildYear(
  dayMap: Map<string, DayBucket>,
  today: CalDate,
  enabledCategories: Category[]
): TrendRangeData {
  // Trailing 12 calendar months, oldest → most recent (index 11 = this month).
  const values: number[] = []
  const labels: string[] = []
  for (let i = 11; i >= 0; i--) {
    const { y, m } = subMonths(today, i)
    values.push(sumRange(dayMap, { y, m, d: 1 }, { y, m, d: daysInMonth(y, m) }).total)
    labels.push(MONTH_LABELS_HE[m - 1])
  }
  const { y: startY, m: startM } = subMonths(today, 11)
  const periodStart: CalDate = { y: startY, m: startM, d: 1 }
  const periodEnd: CalDate = { y: today.y, m: today.m, d: daysInMonth(today.y, today.m) }
  const { total: current, byCategory: currentBy } = sumRange(dayMap, periodStart, periodEnd)

  const { y: prevStartY, m: prevStartM } = subMonths(today, 23)
  const { y: prevEndY, m: prevEndM } = subMonths(today, 12)
  const prevStart: CalDate = { y: prevStartY, m: prevStartM, d: 1 }
  const prevEnd: CalDate = { y: prevEndY, m: prevEndM, d: daysInMonth(prevEndY, prevEndM) }
  const { total: previous, byCategory: prevBy } = sumRange(dayMap, prevStart, prevEnd)

  return { labels, values, current, previous, categories: categoryChanges(enabledCategories, currentBy, prevBy) }
}

/**
 * Buckets a child's correct submissions into week/month/year trend data.
 * `now` is injectable for tests; defaults to the real current time.
 */
export function computeTrendData(
  rows: CorrectSubmission[],
  enabledCategories: Category[],
  now: Date = new Date()
): TrendData {
  const dayMap = indexByDay(rows)
  const today = calDateFromIso(now.toISOString())
  return {
    week: buildWeek(dayMap, today, enabledCategories),
    month: buildMonth(dayMap, today, enabledCategories),
    year: buildYear(dayMap, today, enabledCategories),
  }
}
