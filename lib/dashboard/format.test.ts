import { describe, expect, it } from 'vitest'
import { formatActivityWhen } from './format'

// Israel is UTC+2 in March 2024 (DST starts March 29), so 08:00Z = 10:00 Israel.
const NOW = new Date('2024-03-15T08:00:00Z')

describe('formatActivityWhen', () => {
  it('labels a same-day timestamp "היום"', () => {
    expect(formatActivityWhen('2024-03-15T08:00:00Z', NOW)).toBe('היום, 10:00')
  })

  it('labels yesterday "אתמול"', () => {
    expect(formatActivityWhen('2024-03-14T08:00:00Z', NOW)).toBe('אתמול, 10:00')
  })

  it('falls back to a D.M date for anything older', () => {
    expect(formatActivityWhen('2024-03-13T08:00:00Z', NOW)).toBe('13.3, 10:00')
  })
})
