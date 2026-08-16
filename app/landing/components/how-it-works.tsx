import type { LandingStrings } from '../strings'
import { INK, LIME, FUCHSIA, AMBER, RUBIK, ASSISTANT } from '../theme'

// Same 4 accent colors as the mockup, one per step. The mockup picked the
// color via `[...].indexOf(s)` on every render; using the .map index directly
// is equivalent output, just without the redundant array scan per step.
const STEP_COLORS = [LIME, FUCHSIA, AMBER, '#5A5FE0']

export function HowItWorks({ t }: { t: LandingStrings }) {
  return (
    <div className="px-6 pb-14">
      <p style={{ color: INK, fontFamily: RUBIK }} className="text-3xl font-black mb-8">
        {t.howTitle}
      </p>
      <div className="flex flex-col gap-6">
        {t.steps.map((s, i) => (
          <div key={s.num} className="flex items-start gap-4">
            <p
              style={{ color: STEP_COLORS[i], fontFamily: RUBIK, minWidth: 48 }}
              className="text-3xl font-black shrink-0"
            >
              {s.num}
            </p>
            <div>
              <p style={{ color: INK, fontFamily: RUBIK }} className="text-xl font-black mb-1.5">
                {s.title}
              </p>
              <p style={{ color: '#3A3F52', fontFamily: ASSISTANT }} className="text-base leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
