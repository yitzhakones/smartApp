'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccessMode, Category, Gender, Locale, Tables } from '@/types/database'
import type { TrendData } from '@/lib/dashboard/trend'
import type { ActivityItem } from '@/lib/dashboard/activity-service'
import type { NotificationItem } from '@/lib/dashboard/notifications-service'
import type { ParentAccount } from '@/lib/dashboard/account-service'
import { TabSwitcher } from './components/tab-switcher'
import { SummaryCard } from './components/summary-card'
import { TrendCard } from './components/trend-card'
import { BonusPanel } from './components/bonus-panel'
import { ActivityFeed } from './components/activity-feed'
import { SettingsMenu, type SettingsScreen } from './components/settings-menu'
import { EditChildScreen } from './components/edit-child-screen'
import { NotificationsScreen } from './components/notifications-screen'
import { AccountSettingsScreen } from './components/account-settings-screen'
import { PresetsScreen } from './components/presets-screen'
import { AddChildWizard } from './components/add-child-wizard'
import { NewChildBanner } from './components/new-child-banner'
import { markNotificationsRead, type UpdateChildInput } from './actions'
import { SHELL, INK, FUCHSIA, SOFT, ASSISTANT } from './theme'

// One dashboard, one login. This client shell owns the active-tab state, the
// per-child view-model (seeded from the server, then patched in place as
// mutations return authoritative values), and — for the settings area — the
// current screen plus three more pieces of LIFTED state (presets,
// notifications, account). Lifting presets here specifically is what makes
// PresetsScreen and BonusPanel share one source of truth: both read the same
// array, so an edit made in settings shows up in the bonus panel the instant
// the parent navigates back — no page reload, no separate copy to go stale.

export interface DashboardChild {
  id: string
  name: string
  gender: Gender
  locale: Locale
  age: number
  enabledCategories: Category[]
  shekelPerStar: number
  weeklyImprovementBonus: number
  accessMode: AccessMode
  accessPin: string | null
  /** app.com/p/{access_token} — the child's one-time shareable link. */
  shareUrl: string
  stars: number
  money: number
  streak: number
  trend: TrendData
  activity: ActivityItem[]
}

type Preset = Pick<Tables<'reward_presets'>, 'id' | 'kind' | 'label' | 'amount_nis'>
type Screen = 'dashboard' | SettingsScreen | 'add-child'

export function DashboardClient({
  initialChildren,
  initialPresets,
  initialNotifications,
  initialAccount,
  justCreatedChildId,
}: {
  initialChildren: DashboardChild[]
  initialPresets: Preset[]
  initialNotifications: NotificationItem[]
  initialAccount: ParentAccount
  /** Set right after createChild's redirect (?newChild={id}) — shows the
   *  share-link banner once and selects that child's tab. Read into state
   *  once on mount only; later prop changes (e.g. once the URL is stripped
   *  below) don't re-trigger it, which is exactly the one-shot "flash
   *  message" behavior wanted here. */
  justCreatedChildId: string | null
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialChildren)
  const [activeId, setActiveId] = useState(justCreatedChildId ?? initialChildren[0]?.id ?? '')
  const [bannerChildId, setBannerChildId] = useState(justCreatedChildId)
  const [screen, setScreen] = useState<Screen>('dashboard')
  // Where "cancel"/step-0-back in AddChildWizard should return to — it's
  // reachable from two different places (the empty-dashboard state and
  // SettingsMenu), and each needs to land back where it was opened from, not
  // always the same screen.
  const [addChildReturnTo, setAddChildReturnTo] = useState<'dashboard' | 'settings'>('dashboard')
  const [presets, setPresets] = useState(initialPresets)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [account, setAccount] = useState(initialAccount)

  useEffect(() => {
    // Strip ?newChild= so a later reload of this same URL doesn't re-show the
    // banner — bannerChildId already captured the value into local state above.
    if (justCreatedChildId) router.replace('/dashboard')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = items.find((c) => c.id === activeId)

  function patchActive(patch: Partial<DashboardChild>) {
    setItems((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c)))
  }

  async function handleMarkAllRead() {
    const res = await markNotificationsRead()
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: res.readAt })))
    }
  }

  function handleChildSaved(patch: UpdateChildInput) {
    patchActive({
      name: patch.displayName,
      gender: patch.gender,
      locale: patch.locale,
      age: patch.age,
      enabledCategories: patch.enabledCategories,
      shekelPerStar: patch.shekelPerStar,
      weeklyImprovementBonus: patch.weeklyImprovementBonus,
      accessMode: patch.accessMode,
      accessPin: patch.accessPin,
    })
  }

  function handleAccountSaved(patch: { locale: Locale; whatsappNumber: string | null; email: boolean }) {
    setAccount((prev) => ({
      locale: patch.locale,
      whatsappNumber: patch.whatsappNumber,
      notificationPrefs: { ...prev.notificationPrefs, email: patch.email },
    }))
  }

  // Checked before the empty-children guard below: the wizard doesn't depend
  // on any existing child, and the empty state's own "הוסף ילד/ה" button needs
  // this to actually navigate somewhere.
  if (screen === 'add-child') {
    return <AddChildWizard onBack={() => setScreen(addChildReturnTo)} />
  }

  if (items.length === 0) {
    return (
      <div dir="rtl" style={SHELL} className="flex flex-col items-center justify-center gap-3 px-8">
        <p style={{ color: INK }} className="text-xl font-black text-center">
          עדיין אין ילדים בחשבון
        </p>
        <p style={{ color: SOFT, fontFamily: ASSISTANT }} className="text-sm text-center mb-2">
          לאחר הוספת ילד/ה, הלוח יציג כאן את ההתקדמות, התגמולים והפעילות.
        </p>
        <button
          onClick={() => {
            setAddChildReturnTo('dashboard')
            setScreen('add-child')
          }}
          className="px-8 py-3.5 rounded-full font-black text-base"
          style={{ background: FUCHSIA, color: 'white' }}
        >
          הוסף ילד/ה
        </button>
      </div>
    )
  }

  // active is always defined past this point: items is non-empty (checked
  // above) and activeId always starts as / is set to one of items' own ids.
  const currentChild = active!

  if (screen === 'settings') {
    return (
      <SettingsMenu
        onBack={() => setScreen('dashboard')}
        onNavigate={setScreen}
        onAddChild={() => {
          setAddChildReturnTo('settings')
          setScreen('add-child')
        }}
      />
    )
  }
  if (screen === 'edit-child') {
    const editable: UpdateChildInput = {
      childId: currentChild.id,
      displayName: currentChild.name,
      gender: currentChild.gender,
      locale: currentChild.locale,
      age: currentChild.age,
      enabledCategories: currentChild.enabledCategories,
      shekelPerStar: currentChild.shekelPerStar,
      weeklyImprovementBonus: currentChild.weeklyImprovementBonus,
      accessMode: currentChild.accessMode,
      accessPin: currentChild.accessPin,
    }
    return (
      <EditChildScreen
        child={editable}
        shareUrl={currentChild.shareUrl}
        onBack={() => setScreen('settings')}
        onSaved={handleChildSaved}
      />
    )
  }
  if (screen === 'notifications') {
    return (
      <NotificationsScreen
        notifications={notifications}
        onBack={() => setScreen('settings')}
        onMarkAllRead={handleMarkAllRead}
      />
    )
  }
  if (screen === 'account') {
    return (
      <AccountSettingsScreen account={account} onBack={() => setScreen('settings')} onSaved={handleAccountSaved} />
    )
  }
  if (screen === 'presets') {
    return <PresetsScreen presets={presets} setPresets={setPresets} onBack={() => setScreen('settings')} />
  }

  return (
    <div dir="rtl" style={SHELL}>
      <TabSwitcher
        items={items}
        activeId={activeId}
        onSelect={setActiveId}
        onOpenSettings={() => setScreen('settings')}
        hasUnreadNotifications={notifications.some((n) => !n.readAt)}
      />

      <div className="px-4 pb-24 flex flex-col gap-3 pt-2">
        {bannerChildId &&
          (() => {
            const newChild = items.find((c) => c.id === bannerChildId)
            return newChild ? (
              <NewChildBanner
                childName={newChild.name}
                shareUrl={newChild.shareUrl}
                onDismiss={() => setBannerChildId(null)}
              />
            ) : null
          })()}
        <SummaryCard child={currentChild} onBalanceChange={(money) => patchActive({ money })} />
        <TrendCard data={currentChild.trend} />
        <BonusPanel child={currentChild} presets={presets} onBalanceChange={(money) => patchActive({ money })} />
        <ActivityFeed childId={currentChild.id} items={currentChild.activity} onStatsChange={patchActive} />
        {/* Anonymous-comparison benchmark card: separate follow-up. */}
      </div>
    </div>
  )
}
