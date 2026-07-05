import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { notificationsApi } from '../../api/notifications'
import { useAuthStore } from '../../store/auth'
import { useIsMobile } from '../../hooks/useIsMobile'
import { registerPush } from '../../api/push'
import NotificationInbox from '../NotificationInbox/NotificationInbox'
import { t } from '../../theme'

const SIDEBAR_W = 200
const TOPBAR_H = 48

interface Props {
  children: React.ReactNode
}

interface NavItem {
  to: string
  label: string
  end?: boolean
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',   end: true,  icon: '⊞' },
  { to: '/contractors', label: 'Contractors', end: false, icon: '◈' },
]

export default function GCLayout({ children }: Props) {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [showInbox, setShowInbox] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { registerPush().catch(console.warn) }, [])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    staleTime: 60_000,
  })

  const logoutMut = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => { setUser(null); navigate('/login') },
  })

  const notifCount = Math.min(notifications.length, 99)

  const navLinks = (
    <>
      {NAV_ITEMS.map(({ to, label, end, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setDrawerOpen(false)}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 16px',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '0.78rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
            background: isActive ? 'rgba(182,72,31,0.18)' : 'transparent',
            borderLeft: isActive ? `3px solid ${t.rust}` : '3px solid transparent',
          })}
        >
          <span style={{ fontSize: '0.9rem', lineHeight: 1, opacity: 0.8 }}>{icon}</span>
          {label}
        </NavLink>
      ))}

      <button
        onClick={() => { setShowInbox(true); setDrawerOpen(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 16px', width: '100%',
          background: 'transparent', border: 'none',
          fontWeight: 800, fontSize: '0.78rem',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          borderLeft: '3px solid transparent',
        }}
      >
        <span style={{ fontSize: '0.9rem', lineHeight: 1, opacity: 0.8 }}>◉</span>
        Notifications
        {notifCount > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: t.rust, color: '#fff',
            fontFamily: 'monospace', fontSize: 9, fontWeight: 900,
            minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid rgba(255,255,255,0.2)`,
          }}>
            {notifCount}
          </span>
        )}
      </button>
    </>
  )

  const userFooter = (
    <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, padding: '12px 16px' }}>
      {user?.name && (
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </p>
      )}
      <button
        onClick={() => logoutMut.mutate()}
        style={{
          width: '100%', padding: '6px 0',
          background: 'transparent', border: `1.5px solid rgba(255,255,255,0.2)`,
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
      >Sign Out</button>
    </div>
  )

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: t.paper }}>
        {/* Fixed top bar */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
          height: TOPBAR_H,
          background: t.ink,
          borderBottom: `3px solid ${t.rust}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px',
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 10px', fontSize: '1.3rem', lineHeight: 1 }}
          >≡</button>
          <span style={{ fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', color: '#fff', letterSpacing: '0.01em' }}>Weebrook</span>
          <button
            onClick={() => setShowInbox(true)}
            aria-label="Notifications"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 10px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
          >
            ◉
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: t.rust, color: '#fff',
                fontFamily: 'monospace', fontSize: 8, fontWeight: 900,
                minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {notifCount}
              </span>
            )}
          </button>
        </header>

        {/* Backdrop */}
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          />
        )}

        {/* Slide-out drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: SIDEBAR_W,
          background: t.ink,
          borderRight: `3px solid ${t.rust}`,
          display: 'flex', flexDirection: 'column',
          zIndex: 50,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        }}>
          <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
            <p style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.01em', color: '#fff', margin: 0 }}>Weebrook</p>
            <p style={{ fontFamily: 'monospace', fontSize: 9, color: t.rust, textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 3, fontWeight: 700 }}>Plan Intelligence</p>
          </div>
          <nav style={{ flex: 1, padding: '10px 0' }}>{navLinks}</nav>
          {userFooter}
        </aside>

        {/* Main content — offset below top bar */}
        <div style={{ paddingTop: TOPBAR_H, minHeight: '100vh' }}>
          {children}
        </div>

        {showInbox && <NotificationInbox onClose={() => setShowInbox(false)} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        background: t.ink,
        borderRight: `3px solid ${t.rust}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 20,
      }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
          <p style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.01em', color: '#fff', margin: 0 }}>Weebrook</p>
          <p style={{ fontFamily: 'monospace', fontSize: 9, color: t.rust, textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 3, fontWeight: 700 }}>Plan Intelligence</p>
        </div>
        <nav style={{ flex: 1, padding: '10px 0' }}>{navLinks}</nav>
        {userFooter}
      </aside>

      <div style={{ marginLeft: SIDEBAR_W, flex: 1, minWidth: 0, background: t.paper }}>
        {children}
      </div>

      {showInbox && <NotificationInbox onClose={() => setShowInbox(false)} />}
    </div>
  )
}
