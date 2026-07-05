import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../../api/projects'
import { decisionsApi } from '../../api/decisions'
import { useIsMobile } from '../../hooks/useIsMobile'
import { t } from '../../theme'
import type { ProjectWithMeta, AttentionQueue } from '../../api/projects'
import type { Decision } from '@weebrook/shared/types'

export interface ProjectContext {
  project: ProjectWithMeta
  attention: AttentionQueue | undefined
  decisions: Decision[]
  attentionCount: number
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })
  const { data: attention } = useQuery({
    queryKey: ['attention', id],
    queryFn: () => projectsApi.attention(id!),
    enabled: !!id,
  })
  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', id],
    queryFn: () => decisionsApi.list(id!),
    enabled: !!id,
  })

  const attentionCount = attention
    ? new Set([
        ...attention.blockingDecisions.map((d: any) => d.id),
        ...attention.overdueDecisions.map((d: any) => d.id),
        ...attention.unstaged.map((d: any) => d.id),
      ]).size + attention.overdueMilestones.length + attention.upcomingMilestones.length
    : 0

  const totalAllowance = decisions.reduce((s, d: any) => s + (d.allowance ?? 0), 0)
  const committed = decisions
    .filter((d: any) => ['decided', 'locked'].includes(d.status) && d.chosenPrice != null)
    .reduce((s, d: any) => s + (d.chosenPrice ?? 0), 0)
  const hasBudget = totalAllowance > 0
  const overBudget = committed > totalAllowance && hasBudget
  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  if (isLoading || !project) {
    return (
      <div style={{ minHeight: '100vh', background: t.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    )
  }

  const navItems = [
    { path: '',             label: 'Attention',   end: true,  badge: attentionCount > 0 ? attentionCount : null },
    { path: 'decisions',    label: 'Selections',  end: false, badge: null },
    { path: 'workorders',   label: 'Work Orders', end: false, badge: null },
    { path: 'documents',    label: 'Documents',   end: false, badge: null },
    { path: 'timeline',     label: 'Timeline',    end: false, badge: null },
    { path: 'contractors',  label: 'Contractors', end: false, badge: null },
  ]

  const ctx: ProjectContext = { project, attention, decisions, attentionCount }

  return (
    <div style={{ minHeight: '100vh', background: t.paper }}>
      {/* Project header */}
      <header style={{
        background: t.ink, color: '#fff',
        borderBottom: isMobile ? 'none' : `4px solid ${t.rust}`,
        padding: isMobile ? '12px 14px' : '13px 20px',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <button
          style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', flexShrink: 0 }}
          onClick={() => navigate('/')}
        >← Dashboard</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontWeight: 900, fontSize: isMobile ? '1rem' : '1.1rem', textTransform: 'uppercase', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</h1>
          <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.address} · {project.client.name}</p>
        </div>
        {hasBudget && !isMobile && (
          <div style={{ background: overBudget ? t.red : 'rgba(255,255,255,0.1)', border: `1.5px solid ${overBudget ? t.red : 'rgba(255,255,255,0.25)'}`, padding: '5px 12px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, display: 'block', fontFamily: 'monospace' }}>Budget</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(committed)} / {fmt(totalAllowance)}</span>
            {overBudget && <span style={{ fontSize: '0.6rem', fontWeight: 900, display: 'block', textTransform: 'uppercase', fontFamily: 'monospace' }}>OVER</span>}
          </div>
        )}
      </header>

      {/* Mobile: vertical list nav */}
      {isMobile ? (
        <nav style={{ background: t.ink, borderBottom: `4px solid ${t.rust}` }}>
          {navItems.map(({ path, label, end, badge }) => (
            <NavLink
              key={path}
              to={`/projects/${id}${path ? '/' + path : ''}`}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.82rem',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(182,72,31,0.18)' : 'transparent',
                borderLeft: isActive ? `4px solid ${t.rust}` : '4px solid transparent',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              })}
            >
              <span>{label}</span>
              {badge != null && (
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, background: t.rust, color: '#fff', padding: '2px 7px' }}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
          {hasBudget && (
            <div style={{ padding: '10px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>Budget</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, fontFamily: 'monospace', color: overBudget ? t.rust : 'rgba(255,255,255,0.8)' }}>
                {fmt(committed)} / {fmt(totalAllowance)}
                {overBudget && <span style={{ fontSize: '0.6rem', marginLeft: 6, color: t.rust }}>OVER</span>}
              </span>
            </div>
          )}
        </nav>
      ) : (
        /* Desktop: horizontal tab bar */
        <nav style={{ background: t.ink, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 4px', display: 'flex', overflowX: 'auto' }}>
            {navItems.map(({ path, label, end, badge }) => (
              <NavLink
                key={path}
                to={`/projects/${id}${path ? '/' + path : ''}`}
                end={end}
                style={({ isActive }: { isActive: boolean }) => ({
                  padding: '8px 14px',
                  background: isActive ? t.rust : 'transparent',
                  color: '#fff',
                  fontWeight: 800,
                  textTransform: 'uppercase' as const,
                  fontSize: 12,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap' as const,
                  letterSpacing: '0.05em',
                })}
              >
                {label}
                {badge != null && (
                  <span style={{ fontFamily: 'monospace', fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 5px' }}>
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <main style={{ maxWidth: 1260, margin: '0 auto', padding: isMobile ? '16px 14px 80px' : '22px 18px 80px' }}>
        <Outlet context={ctx} />
      </main>
    </div>
  )
}
