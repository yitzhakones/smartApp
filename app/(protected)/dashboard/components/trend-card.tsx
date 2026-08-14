'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { TrendData, TrendRangeData } from '@/lib/dashboard/trend'
import { Card } from './card'
import { INK, SOFT, ASSISTANT } from '../theme'

type Range = 'week' | 'month' | 'year'

// Direct port of the mockup's TrendCard: the range toggle and rendering are
// unchanged, only the data source is real (lib/dashboard/trend.ts, computed
// server-side from the child's actual correct submissions — see the module
// comment there for why "current"/"previous" are trailing windows, not fixed
// calendar buckets). One addition beyond the mock: a category's percentage can
// be `null` (no prior-period activity to compare against), rendered as a
// neutral "אין נתונים" chip alongside the mock's existing flat/up/down states.
export function TrendCard({ data }: { data: TrendData }) {
  const [range, setRange] = useState<Range>('week')
  const rangeData: TrendRangeData = data[range]
  const max = Math.max(1, ...rangeData.values) // avoid /0 when every bucket is empty
  const delta = rangeData.current - rangeData.previous
  const pct = rangeData.previous ? Math.round((delta / rangeData.previous) * 100) : 0
  const improved = delta > 0

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={17} color={improved ? '#1FAE7A' : '#E24B4B'} />
          <p style={{ color: INK }} className="font-black text-base">
            גרף שיפור
          </p>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: '#FBF7EE' }}>
          {(
            [
              ['week', 'שבוע'],
              ['month', 'חודש'],
              ['year', 'שנה'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-3 py-1 rounded-full text-xs font-black"
              style={{ background: range === key ? INK : 'transparent', color: range === key ? 'white' : SOFT }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ color: INK }} className="text-3xl font-black">
          {rangeData.current}
        </span>
        <span style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs font-bold">
          כוכבים בתקופה הנוכחית
        </span>
        {rangeData.previous > 0 && (
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: improved ? '#1FAE7A22' : '#E24B4B22', color: improved ? '#1FAE7A' : '#E24B4B' }}
          >
            {improved ? '▲' : '▼'} {Math.abs(pct)}%
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-1.5" style={{ height: 110 }}>
        {rangeData.values.map((v, i) => {
          const isCurrent = i === rangeData.values.length - 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <p style={{ color: isCurrent ? INK : 'transparent', fontFamily: ASSISTANT }} className="text-[10px] font-black">
                {v}
              </p>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max((v / max) * 78, 6)}px`,
                  background: isCurrent ? 'linear-gradient(180deg, #FF3DBB, #D6127A)' : '#e9e6da',
                  borderRadius: 6,
                }}
              />
              <p style={{ color: isCurrent ? INK : SOFT, fontFamily: ASSISTANT }} className="text-[10px] font-bold">
                {rangeData.labels[i]}
              </p>
            </div>
          )
        })}
      </div>

      <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-xs mt-3">
        {rangeData.previous === 0
          ? 'עוד אין מספיק נתונים מהתקופה הקודמת להשוואה'
          : delta === 0
            ? 'ללא שינוי לעומת התקופה הקודמת'
            : `${improved ? '+' : ''}${delta} כוכבים לעומת התקופה הקודמת`}
      </p>

      {rangeData.categories.length > 0 && (
        <div style={{ borderTop: '1px solid #eeece2' }} className="mt-3 pt-3">
          <p style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-black mb-2">
            שיפור לפי נושא · {range === 'week' ? 'השבוע' : range === 'month' ? 'החודש' : 'השנה'}
          </p>
          <div className="flex flex-col gap-2">
            {rangeData.categories.map((c) => {
              const noData = c.changePct === null
              const flat = c.changePct === 0
              const up = !noData && !flat && (c.changePct as number) > 0
              return (
                <div key={c.key} className="flex items-center justify-between">
                  <span style={{ color: INK, fontFamily: ASSISTANT }} className="text-xs font-bold">
                    {c.label}
                  </span>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: noData || flat ? '#e9e6da' : up ? '#1FAE7A22' : '#E24B4B22',
                      color: noData ? SOFT : flat ? SOFT : up ? '#1FAE7A' : '#E24B4B',
                    }}
                  >
                    {noData ? 'אין נתונים' : flat ? 'ללא שינוי' : `${up ? '▲' : '▼'} ${Math.abs(c.changePct as number)}%`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
