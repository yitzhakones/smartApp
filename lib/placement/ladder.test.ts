import { describe, expect, it } from 'vitest'
import {
  LADDER_LENGTH,
  isLadderComplete,
  nextTier,
  resolveLevel,
} from './ladder'

describe('nextTier — adaptive question selection', () => {
  it('starts every ladder at the medium tier', () => {
    expect(nextTier([])).toBe('medium')
  })

  it('climbs to hard after a correct Q1', () => {
    expect(nextTier([true])).toBe('hard')
  })

  it('drops to easy after an incorrect Q1', () => {
    expect(nextTier([false])).toBe('easy')
  })

  it('returns null once the 2-question ladder is complete', () => {
    expect(nextTier([true, true])).toBeNull()
    expect(nextTier([false, false])).toBeNull()
  })
})

describe('isLadderComplete', () => {
  it('is false with fewer than two answers', () => {
    expect(isLadderComplete([])).toBe(false)
    expect(isLadderComplete([true])).toBe(false)
  })

  it('is true once both questions are answered', () => {
    expect(isLadderComplete([true, false])).toBe(true)
    expect(isLadderComplete([false, true])).toBe(true)
  })
})

describe('resolveLevel — the full 4-branch resolution table', () => {
  // Q1 = medium. correct → hard Q2; incorrect → easy Q2.
  it('correct → correct  ⇒ hard', () => {
    expect(resolveLevel([true, true])).toBe('hard')
  })

  it('correct → incorrect ⇒ medium', () => {
    expect(resolveLevel([true, false])).toBe('medium')
  })

  it('incorrect → correct ⇒ easy', () => {
    expect(resolveLevel([false, true])).toBe('easy')
  })

  it('incorrect → incorrect ⇒ easy (easy is the floor tier)', () => {
    expect(resolveLevel([false, false])).toBe('easy')
  })

  it('guards against resolving an unfinished ladder', () => {
    expect(() => resolveLevel([])).toThrow()
    expect(() => resolveLevel([true])).toThrow()
    expect(() => resolveLevel([true, true, true])).toThrow()
  })

  it('LADDER_LENGTH is 2', () => {
    expect(LADDER_LENGTH).toBe(2)
  })
})
