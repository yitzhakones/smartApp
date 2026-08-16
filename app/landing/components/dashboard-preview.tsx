import { Flame } from 'lucide-react'
import type { LandingStrings } from '../strings'
import { INK, PAPER, FUCHSIA, AMBER, SOFT, RUBIK, ASSISTANT } from '../theme'

// Illustrative sample data, matching the mockup exactly — this is a marketing
// preview, not a live dashboard, so there's no Supabase query behind any of
// these numbers/bars.
const TREND_BARS = [3, 4, 3, 5, 2, 4, 7]

export function DashboardPreview({ t }: { t: LandingStrings }) {
  return (
    <div className="px-6 pb-10">
      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-black mb-2 text-center">
        {t.dashTag}
      </p>

      <div className="rounded-3xl p-5 mb-3" style={{ background: INK }}>
        <p style={{ color: '#9BA3C7', fontFamily: ASSISTANT }} className="text-xs font-bold mb-1">
          {t.dashTotal}
        </p>
        <p style={{ color: '#C6FF3D', fontFamily: RUBIK }} className="text-5xl font-black mb-3">
          ₪178
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: FUCHSIA, fontFamily: RUBIK }} className="text-lg font-black">
            142
          </span>
          <span style={{ color: '#9BA3C7', fontFamily: ASSISTANT }} className="text-xs">
            {t.dashStars}
          </span>
          <span style={{ color: '#9BA3C7' }}>·</span>
          <Flame size={12} color={AMBER} fill={AMBER} />
          <span style={{ color: '#9BA3C7', fontFamily: ASSISTANT }} className="text-xs">
            6 {t.streak}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div
            style={{ height: '100%', width: '20%', background: `linear-gradient(90deg, ${FUCHSIA}, ${AMBER})` }}
          />
        </div>
        <p style={{ color: '#9BA3C7', fontFamily: ASSISTANT }} className="text-[11px] mt-1.5">
          {t.dashProgress}
        </p>
      </div>

      <div className="rounded-3xl p-5" style={{ background: 'white', border: '1px solid #e4e2d8' }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ color: INK, fontFamily: RUBIK }} className="font-black text-sm">
            {t.trendTitle}
          </p>
          <div className="flex gap-1 rounded-full p-1" style={{ background: PAPER }}>
            {t.ranges.map((r, i) => (
              <span
                key={r}
                className="px-2.5 py-1 rounded-full text-[11px] font-black"
                style={{ background: i === 0 ? INK : 'transparent', color: i === 0 ? 'white' : SOFT }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span style={{ color: INK, fontFamily: RUBIK }} className="text-3xl font-black">
            7
          </span>
          <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold">
            {t.dashPeriod}
          </span>
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: '#1FAE7A22', color: '#1FAE7A' }}
          >
            ▲ 75%
          </span>
        </div>
        <div className="flex items-end justify-between gap-1.5 mb-3" style={{ height: 90 }}>
          {TREND_BARS.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded"
              style={{ height: `${v * 12}px`, background: i === TREND_BARS.length - 1 ? FUCHSIA : '#e4e2d8' }}
            />
          ))}
        </div>
        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-[11px] mb-3">
          {t.dashTrend}
        </p>
        <div style={{ borderTop: '1px solid #f0eee4' }} className="pt-3 flex flex-col gap-2">
          <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-black mb-1">
            {t.byTopic}
          </p>
          {t.topics.map((tp) => (
            <div key={tp.label} className="flex items-center justify-between">
              <span style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-bold">
                {tp.label}
              </span>
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: tp.color + '22', color: tp.color }}
              >
                {tp.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
