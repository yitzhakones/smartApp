// Small display-formatting helpers, kept separate from the client components
// that use them so they stay easy to unit test without rendering anything.

const ISRAEL_TZ = 'Asia/Jerusalem'

function israelDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ISRAEL_TZ }).format(new Date(iso))
}

function addDaysToKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(dt)
}

/**
 * "היום, 16:02" / "אתמול, 17:40" / "13.3, 09:15" — Israel-local, matching the
 * mockup's activity-feed timestamps. `now` is injectable for tests.
 */
export function formatActivityWhen(iso: string, now: Date = new Date()): string {
  const time = new Intl.DateTimeFormat('he-IL', {
    timeZone: ISRAEL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

  const dayKey = israelDateKey(iso)
  const todayKey = israelDateKey(now.toISOString())
  const yesterdayKey = addDaysToKey(todayKey, -1)

  if (dayKey === todayKey) return `היום, ${time}`
  if (dayKey === yesterdayKey) return `אתמול, ${time}`

  const [, m, d] = dayKey.split('-')
  return `${Number(d)}.${Number(m)}, ${time}`
}
