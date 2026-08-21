import { describe, expect, it } from 'vitest'
import { deriveAgeBand, isValidChildAge, MAX_CHILD_AGE, MIN_CHILD_AGE } from './ages'

describe('isValidChildAge', () => {
  it('accepts every integer in the 10-16 range', () => {
    for (let age = MIN_CHILD_AGE; age <= MAX_CHILD_AGE; age++) {
      expect(isValidChildAge(age)).toBe(true)
    }
  })

  it('rejects out-of-range, non-integer, and non-number values', () => {
    expect(isValidChildAge(9)).toBe(false)
    expect(isValidChildAge(17)).toBe(false)
    expect(isValidChildAge(12.5)).toBe(false)
    expect(isValidChildAge('12')).toBe(false)
    expect(isValidChildAge(undefined)).toBe(false)
    expect(isValidChildAge(null)).toBe(false)
  })
})

describe('deriveAgeBand', () => {
  it('maps 10-11 to the youngest band', () => {
    expect(deriveAgeBand(10)).toBe('10-11')
    expect(deriveAgeBand(11)).toBe('10-11')
  })

  it('maps 12-13 to the middle band', () => {
    expect(deriveAgeBand(12)).toBe('12-13')
    expect(deriveAgeBand(13)).toBe('12-13')
  })

  it('maps 14-16 to the oldest band', () => {
    expect(deriveAgeBand(14)).toBe('14-16')
    expect(deriveAgeBand(15)).toBe('14-16')
    expect(deriveAgeBand(16)).toBe('14-16')
  })

  it('throws outside the supported range', () => {
    expect(() => deriveAgeBand(9)).toThrow()
    expect(() => deriveAgeBand(17)).toThrow()
  })
})
