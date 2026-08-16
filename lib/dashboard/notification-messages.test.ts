import { describe, expect, it } from 'vitest'
import { notificationMessage } from './notification-messages'

describe('notificationMessage', () => {
  it('genders a star_milestone message to the child', () => {
    expect(notificationMessage('star_milestone', 'נועה', 'female')).toBe(
      'נועה עברה אבן דרך בכוכבים! 🎉'
    )
    expect(notificationMessage('star_milestone', 'יובל', 'male')).toBe(
      'יובל עבר אבן דרך בכוכבים! 🎉'
    )
  })

  it('covers all three documented trigger types', () => {
    expect(notificationMessage('weekly_bonus', 'נועה', 'female')).toContain('בונוס')
    expect(notificationMessage('correct_answer', 'יובל', 'male')).toContain('נכון')
  })
})
