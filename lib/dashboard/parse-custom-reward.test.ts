import { describe, expect, it } from 'vitest'
import { parseCustomReward } from './parse-custom-reward'

describe('parseCustomReward', () => {
  it('returns null for blank input', () => {
    expect(parseCustomReward('')).toBeNull()
    expect(parseCustomReward('   ')).toBeNull()
  })

  it('parses a bare number as a money amount', () => {
    expect(parseCustomReward('15')).toEqual({ kind: 'money', label: '₪15', amountNis: 15 })
  })

  it('parses a ₪-prefixed or ₪-suffixed number as a money amount', () => {
    expect(parseCustomReward('₪15')).toEqual({ kind: 'money', label: '₪15', amountNis: 15 })
    expect(parseCustomReward('15₪')).toEqual({ kind: 'money', label: '₪15', amountNis: 15 })
  })

  it('allows up to 2 decimal places', () => {
    expect(parseCustomReward('7.5')).toEqual({ kind: 'money', label: '₪7.5', amountNis: 7.5 })
  })

  it('treats a zero or negative amount as a privilege, not money (never a valid reward amount)', () => {
    expect(parseCustomReward('0')).toEqual({ kind: 'privilege', label: '0', amountNis: null })
  })

  it('treats any non-numeric text as a privilege label, verbatim', () => {
    expect(parseCustomReward('פיצה למשפחה')).toEqual({
      kind: 'privilege',
      label: 'פיצה למשפחה',
      amountNis: null,
    })
  })

  it('treats text mixing digits and words as a privilege, not money', () => {
    expect(parseCustomReward('2 שעות מסך')).toEqual({
      kind: 'privilege',
      label: '2 שעות מסך',
      amountNis: null,
    })
  })
})
