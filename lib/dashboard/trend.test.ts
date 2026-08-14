import { describe, expect, it } from 'vitest'
import { computeTrendData, type CorrectSubmission } from './trend'

// Fixed reference "now": Friday, March 15 2024, noon UTC (safely mid-day in
// Israel time year-round regardless of DST, so it never straddles a date
// boundary between UTC and Asia/Jerusalem).
const NOW = new Date('2024-03-15T12:00:00Z')

describe('computeTrendData — no activity', () => {
  it('returns all-zero buckets and a null category change with no submissions', () => {
    const data = computeTrendData([], ['math'], NOW)
    expect(data.week.values).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(data.week.current).toBe(0)
    expect(data.week.previous).toBe(0)
    expect(data.week.categories).toEqual([{ key: 'math', label: 'מתמטיקה', changePct: null }])
  })

  it('returns an empty categories array when no categories are enabled', () => {
    const data = computeTrendData([], [], NOW)
    expect(data.week.categories).toEqual([])
    expect(data.month.categories).toEqual([])
    expect(data.year.categories).toEqual([])
  })
})

describe('computeTrendData — week (trailing 7 days, ending today)', () => {
  it('labels bars oldest → today, rotated to the actual weekday (today = Friday)', () => {
    const data = computeTrendData([], [], NOW)
    expect(data.week.labels).toEqual(['ש', 'א', 'ב', 'ג', 'ד', 'ה', 'ו'])
  })

  it('counts today-6 as current and today-7 as previous (the exact window boundary)', () => {
    const rows: CorrectSubmission[] = [
      { gradedAt: '2024-03-09T12:00:00Z', category: 'math' }, // today - 6 → first bar, in current
      { gradedAt: '2024-03-08T12:00:00Z', category: 'math' }, // today - 7 → in previous, not current
    ]
    const data = computeTrendData(rows, ['math'], NOW)
    expect(data.week.values[0]).toBe(1)
    expect(data.week.current).toBe(1)
    expect(data.week.previous).toBe(1)
  })

  it('computes a category % change between the current and previous week', () => {
    const rows: CorrectSubmission[] = [
      { gradedAt: '2024-03-15T12:00:00Z', category: 'math' },
      { gradedAt: '2024-03-15T12:00:00Z', category: 'math' }, // 2 correct this week
      { gradedAt: '2024-03-08T12:00:00Z', category: 'math' }, // 1 correct last week
    ]
    const data = computeTrendData(rows, ['math', 'science'], NOW)
    expect(data.week.categories).toEqual([
      { key: 'math', label: 'מתמטיקה', changePct: 100 },
      { key: 'science', label: 'מדעים', changePct: null },
    ])
  })
})

describe('computeTrendData — month (trailing 4 weeks)', () => {
  it('keeps a 27-day-old submission in the current window and a 28-day-old one in the previous window', () => {
    const rows: CorrectSubmission[] = [
      { gradedAt: '2024-02-17T12:00:00Z', category: 'math' }, // today - 27 → in current
      { gradedAt: '2024-02-16T12:00:00Z', category: 'math' }, // today - 28 → in previous
    ]
    const data = computeTrendData(rows, ['math'], NOW)
    expect(data.month.current).toBe(1)
    expect(data.month.previous).toBe(1)
  })
})

describe('computeTrendData — year (trailing 12 months)', () => {
  it('keeps the 11-months-ago month in the current window and the 12-months-ago month in the previous window', () => {
    const rows: CorrectSubmission[] = [
      { gradedAt: '2023-04-15T12:00:00Z', category: 'math' }, // today - 11 months → in current
      { gradedAt: '2023-03-15T12:00:00Z', category: 'math' }, // today - 12 months → in previous
    ]
    const data = computeTrendData(rows, ['math'], NOW)
    expect(data.year.current).toBe(1)
    expect(data.year.previous).toBe(1)
  })

  it('labels bars with real, correctly-rotated month names ending at the current month', () => {
    const data = computeTrendData([], [], NOW)
    expect(data.year.labels[11]).toBe('מרץ') // March = today's month, last bar
    expect(data.year.labels[0]).toBe('אפר') // 11 months before March = April
  })
})
