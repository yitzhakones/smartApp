import { describe, expect, it } from 'vitest'
import type { Category } from '@/types/database'
import {
  applyAnswer,
  createSession,
  isComplete,
  nextStep,
  resolveLevels,
  withPending,
  type PlacementSession,
} from './session'

/**
 * Drive a session to completion using a predetermined correctness sequence per
 * category (Q1, Q2). Stands in for the real select-question + grade round-trip so
 * the ladder walk can be exercised without any DB or grader.
 */
function drive(
  session: PlacementSession,
  answers: Partial<Record<Category, [boolean, boolean]>>
): PlacementSession {
  let s = session
  let counter = 0
  for (let step = nextStep(s); step; step = nextStep(s)) {
    const seq = answers[step.category]
    if (!seq) throw new Error(`no scripted answers for ${step.category}`)
    // Index of the answer we're about to give = answers already recorded.
    const idx = s.progress[step.category].length
    s = withPending(s, {
      category: step.category,
      tier: step.tier,
      questionId: `q${counter++}`,
    })
    s = applyAnswer(s, seq[idx])
  }
  return s
}

describe('createSession', () => {
  it('seeds empty progress for every enabled category', () => {
    const s = createSession('child-1', 'he', ['math', 'science'])
    expect(s.progress).toEqual({ math: [], science: [] })
    expect(s.pending).toBeNull()
    expect(s.askedQuestionIds).toEqual([])
  })

  it('refuses to start with no enabled categories', () => {
    expect(() => createSession('child-1', 'he', [])).toThrow()
  })
})

describe('nextStep — walk order', () => {
  it('opens the first category at the medium tier', () => {
    const s = createSession('child-1', 'en', ['math', 'science'])
    expect(nextStep(s)).toEqual({ category: 'math', tier: 'medium' })
  })

  it('finishes a category before moving to the next', () => {
    let s = createSession('child-1', 'en', ['math', 'science'])
    // Answer math Q1 correctly → math Q2 should be next (hard), not science.
    s = withPending(s, { category: 'math', tier: 'medium', questionId: 'q1' })
    s = applyAnswer(s, true)
    expect(nextStep(s)).toEqual({ category: 'math', tier: 'hard' })
  })
})

describe('resolveLevels — per-category independence', () => {
  it('resolves each category from its own ladder, independently', () => {
    const categories: Category[] = ['math', 'science', 'israeli_history']
    const session = createSession('child-42', 'he', categories)

    const finished = drive(session, {
      math: [true, true], // correct → correct  ⇒ hard
      science: [false, true], // incorrect → correct ⇒ easy
      israeli_history: [true, false], // correct → incorrect ⇒ medium
    })

    expect(isComplete(finished)).toBe(true)
    expect(resolveLevels(finished)).toEqual({
      math: 'hard',
      science: 'easy',
      israeli_history: 'medium',
    })
  })

  it('a child can be hard in one category and easy (floor) in another', () => {
    const session = createSession('child-7', 'en', ['math', 'general_knowledge'])
    const finished = drive(session, {
      math: [true, true], // ⇒ hard
      general_knowledge: [false, false], // ⇒ easy (floor)
    })
    expect(resolveLevels(finished)).toEqual({
      math: 'hard',
      general_knowledge: 'easy',
    })
  })

  it('asks exactly two non-repeating questions per category', () => {
    const categories: Category[] = ['math', 'science', 'israeli_history']
    const finished = drive(createSession('c', 'he', categories), {
      math: [true, false],
      science: [false, true],
      israeli_history: [false, false],
    })
    expect(finished.askedQuestionIds).toHaveLength(categories.length * 2)
    expect(new Set(finished.askedQuestionIds).size).toBe(categories.length * 2)
  })
})

describe('isComplete', () => {
  it('is false until every ladder has both answers', () => {
    let s = createSession('child-1', 'he', ['math', 'science'])
    expect(isComplete(s)).toBe(false)
    s = drive(s, { math: [true, true], science: [true, true] })
    expect(isComplete(s)).toBe(true)
  })
})
