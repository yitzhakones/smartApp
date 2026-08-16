'use client'

import { Flame, TrendingUp } from 'lucide-react'
import type { NotificationItem } from '@/lib/dashboard/notifications-service'
import { notificationMessage } from '@/lib/dashboard/notification-messages'
import { formatActivityWhen } from '@/lib/dashboard/format'
import { Card } from './card'
import { ScreenHeader } from './screen-header'
import { SHELL, INK, SOFT, FUCHSIA, ASSISTANT, SETTINGS_TEXT } from '../theme'

export function NotificationsScreen({
  notifications,
  onBack,
  onMarkAllRead,
}: {
  notifications: NotificationItem[]
  onBack: () => void
  onMarkAllRead: () => void
}) {
  const hasUnread = notifications.some((n) => !n.readAt)

  return (
    <div dir="rtl" style={SHELL}>
      <ScreenHeader title="התראות" onBack={onBack} />
      <div className="px-4 flex justify-end mb-2">
        <button
          onClick={onMarkAllRead}
          disabled={!hasUnread}
          className={`font-bold ${SETTINGS_TEXT.body} disabled:opacity-40`}
          style={{ color: FUCHSIA }}
        >
          סמן הכל כנקרא
        </button>
      </div>
      <div className="px-4 flex flex-col gap-2 pb-24">
        {notifications.length === 0 ? (
          <Card>
            <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`text-center ${SETTINGS_TEXT.body}`}>
              אין התראות עדיין
            </p>
          </Card>
        ) : (
          notifications.map((n) => {
            const isMilestone = n.triggerType === 'star_milestone'
            return (
              <Card key={n.id} style={{ opacity: n.readAt ? 0.55 : 1 }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isMilestone ? '#8FCB1F22' : '#D6127A18' }}
                  >
                    {isMilestone ? <Flame size={20} color="#5a8a10" /> : <TrendingUp size={20} color={FUCHSIA} />}
                  </div>
                  <div className="flex-1">
                    <p style={{ color: INK, fontFamily: ASSISTANT }} className={`font-bold ${SETTINGS_TEXT.body}`}>
                      {notificationMessage(n.triggerType, n.childName, n.childGender)}
                    </p>
                    <p style={{ color: SOFT, fontFamily: ASSISTANT }} className={`mt-0.5 ${SETTINGS_TEXT.caption}`}>
                      {formatActivityWhen(n.createdAt)}
                    </p>
                  </div>
                  {!n.readAt && <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: FUCHSIA }} />}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
