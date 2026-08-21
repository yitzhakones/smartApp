import type { AgeBand } from '@/types/database'

// Multiple-choice pivot (migration 013). age_band is always DERIVED from a
// child's `age`, never stored on children — a stored copy would just be one
// more place for it to silently disagree after an age edit. questions.age_band
// IS a stored column (there's no `age` on a question to derive it from); this
// is what the daily question pool is filtered against (lib/daily/service.ts).
export const MIN_CHILD_AGE = 10
export const MAX_CHILD_AGE = 16

export function isValidChildAge(age: unknown): age is number {
  return (
    typeof age === 'number' &&
    Number.isInteger(age) &&
    age >= MIN_CHILD_AGE &&
    age <= MAX_CHILD_AGE
  )
}

/** age 10-16 -> '10-11' | '12-13' | '14-16'. Throws on an out-of-range age —
 *  callers must validate with isValidChildAge first (the DB CHECK constraint
 *  guarantees this for anything already persisted). */
export function deriveAgeBand(age: number): AgeBand {
  if (age < MIN_CHILD_AGE || age > MAX_CHILD_AGE) {
    throw new Error(`age ${age} is out of the supported ${MIN_CHILD_AGE}-${MAX_CHILD_AGE} range`)
  }
  if (age <= 11) return '10-11'
  if (age <= 13) return '12-13'
  return '14-16'
}
