import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '../../api/notifications'
import type { Notification } from '@weebrook/shared/types'
import { t } from '../../theme'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  onClose: () => void
}

const EVENT_LABEL: Record<string, string> = {
  decision_staged:    'Decision sent to client',
  decision_responded: 'Client responded',
  decision_message:   'Client message',
  wo_started:         'Job started',
  wo_completed:       'Job completed',
  wo_needs_revision:  'Revision requested',
}

const TYPE_CHIP: Record<string, { label: string; color: string; border: string }> = {
  push:  { label: 'Push',  color: t.blue,  border: t.blue },
  email: { label: 'Email', color: t.green, border: t.green },
  sms:   { label: 'SMS',   color: t.amber, border: t.amber },
}

export default function NotificationInbox({ onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    staleTime: 30_000,
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <>
      {/* backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(23,20,18,0.35)' }} />

      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
          width: 380, maxWidth: '95vw',
          background: t.paper, borderLeft: `2px solid ${t.line}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* header */}
        <div style={{ background: t.ink, borderBottom: `3px solid ${t.rust}`, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>Notifications</p>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
              {notifications.length} recent
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1.5px solid rgba(255,255,255,0.3)`, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}
          >×</button>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <p style={{ textAlign: 'center', color: t.muted, padding: '2rem', fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase' }}>Loading…</p>
          )}
          {!isLoading && notifications.length === 0 && (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: 8 }}>Inbox Empty</p>
              <p style={{ fontSize: '0.82rem', color: t.muted }}>No notifications yet. They appear here when clients respond or contractors update work orders.</p>
            </div>
          )}
          {notifications.map((n: Notification) => (
            <NotifRow key={n.id} n={n} />
          ))}
        </div>
      </div>
    </>
  )
}

function NotifRow({ n }: { n: Notification }) {
  const chip = TYPE_CHIP[n.type] ?? TYPE_CHIP.push
  const meta = n.metadata as Record<string, unknown>
  const eventKey = meta?.event as string | undefined
  const eventLabel = eventKey ? (EVENT_LABEL[eventKey] ?? eventKey) : null

  return (
    <div style={{ borderBottom: `1px solid ${t.sand}`, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          {eventLabel && (
            <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.rust, marginBottom: 3 }}>{eventLabel}</p>
          )}
          {n.subject && (
            <p style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>{n.subject}</p>
          )}
          <p style={{ fontSize: '0.8rem', color: t.muted, lineHeight: 1.5 }}>{n.body}</p>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '1px 5px', color: chip.color, textTransform: 'uppercase', flexShrink: 0 }}>
          {chip.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: t.muted, textTransform: 'uppercase' }}>
          {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
        </span>
        {n.status === 'failed' && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.red}`, padding: '1px 5px', color: t.red, textTransform: 'uppercase' }}>Failed</span>
        )}
      </div>
    </div>
  )
}
