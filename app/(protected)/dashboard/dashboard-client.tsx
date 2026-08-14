'use client'

import { useState } from 'react'
import type { Gender, Locale, Tables } from '@/types/database'
import type { TrendData } from '@/lib/dashboard/trend'
import { TabSwitcher } from './components/tab-switcher'
import { SummaryCard } from './components/summary-card'
import { TrendCard } from './components/trend-card'
import { BonusPanel } from './components/bonus-panel'
import { SHELL, INK, SOFT, ASSISTANT } from './theme'

// One dashboard, one login. This client shell owns the active-tab state and the
// per-child view-model (seeded from the server, then patched in place as
// mutations return authoritative values — e.g. the balance after a withdrawal
// or a money bonus), so switching tabs or recording either never needs a full
// reload.
//
// Renders the tab switcher, summary card, trend chart, and bonus panel. The
// activity feed and benchmark card slot into the same per-child column next.

export interface DashboardChild {
  id: string
  name: string
  gender: Gender
  locale: Locale
  stars: number
  money: number
  streak: number
  trend: TrendData
}

type Preset = Pick<Tables<'reward_presets'>, 'id' | 'kind' | 'label' | 'amount_nis'>

export function DashboardClient({
  initialChildren,
  presets,
}: {
  initialChildren: DashboardChild[]
  presets: Preset[]
}) {
  const [items, setItems] = useState(initialChildren)
  const [activeId, setActiveId] = useState(initialChildren[0]?.id ?? '')
  const active = items.find((c) => c.id === activeId)

  function patchActive(patch: Partial<DashboardChild>) {
    setItems((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c)))
  }

  if (items.length === 0) {
    return (
      <div dir="rtl" style={SHELL} className="flex flex-col items-center justify-center gap-3 px-8">
        <p style={{ color: INK }} className="text-xl font-black text-center">
          עדיין אין ילדים בחשבון
        </p>
        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-sm text-center">
          לאחר הוספת ילד/ה, הלוח יציג כאן את ההתקדמות, התגמולים והפעילות.
        </p>
      </div>
    )
  }

  return (
    <div dir="rtl" style={SHELL}>
      <TabSwitcher items={items} activeId={activeId} onSelect={setActiveId} />

      {active && (
        <div className="px-4 pb-24 flex flex-col gap-3 pt-2">
          <SummaryCard child={active} onBalanceChange={(money) => patchActive({ money })} />
          <TrendCard data={active.trend} />
          <BonusPanel child={active} presets={presets} onBalanceChange={(money) => patchActive({ money })} />
          {/* Stage 4+: activity feed + override, benchmark card. */}
        </div>
      )}
    </div>
  )
}
