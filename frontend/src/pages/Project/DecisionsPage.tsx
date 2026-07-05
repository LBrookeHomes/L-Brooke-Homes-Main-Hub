import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProjectContext } from './ProjectPage'
import type { Decision } from '@weebrook/shared/types'
import DecisionList from './DecisionList'
import { t } from '../../theme'

type ViewMode = 'cards' | 'matrix'

const PRIORITY_COLOR: Record<string, string> = {
  critical: t.red,
  high: t.amber,
  normal: t.muted,
  low: t.muted,
}

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending: { label: 'Pending',   bg: '#e8e4dc', color: t.muted,   border: t.muted },
  staged:  { label: 'With Client', bg: '#dde6ee', color: t.blue,   border: t.blue },
  decided: { label: 'Responded', bg: '#f6e1bd', color: '#76510d', border: t.amber },
  locked:  { label: 'Locked',    bg: '#dfe9d4', color: t.green,   border: t.green },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function DecisionsPage() {
  const { id } = useParams<{ id: string }>()
  const { project, decisions } = useOutletContext<ProjectContext>()
  const [view, setView] = useState<ViewMode>('cards')

  const totalAllowance = decisions.reduce((s, d: any) => s + (d.allowance ?? 0), 0)
  const committed = decisions
    .filter((d: any) => ['decided', 'locked'].includes(d.status) && d.chosenPrice != null)
    .reduce((s, d: any) => s + (d.chosenPrice ?? 0), 0)
  const hasBudget = totalAllowance > 0
  const over = committed > totalAllowance && hasBudget
  const fmtAbs = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

  // milestone lookup for room fallback
  const milestoneMap = Object.fromEntries(project.milestones.map((m) => [m.id, m.name]))

  const pillOn: React.CSSProperties = { background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const pillOff: React.CSSProperties = { background: 'transparent', border: `2px solid ${t.line}`, color: t.ink, padding: '5px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Selections</h2>
          <p style={{ fontSize: 13, color: t.muted }}>{decisions.length} decision{decisions.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <button style={view === 'cards' ? pillOn : pillOff} onClick={() => setView('cards')}>Cards</button>
          <button style={view === 'matrix' ? pillOn : { ...pillOff, borderLeft: 'none' }} onClick={() => setView('matrix')}>Matrix</button>
        </div>
      </div>

      {hasBudget && (
        <div style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '0.9rem 1.1rem', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
            <div>
              <span style={{ fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 2, fontFamily: 'monospace' }}>Selections budget</span>
              <span style={{ fontSize: '0.75rem', display: 'block', color: over ? t.red : t.muted, fontFamily: 'monospace' }}>
                {over ? `${fmtAbs(committed - totalAllowance)} over budget` : `${fmtAbs(totalAllowance - committed)} remaining`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <span style={{ fontSize: '0.72rem', color: t.muted, fontFamily: 'monospace' }}>
                {decisions.filter((d: any) => d.status === 'locked' && d.chosenPrice != null).length}/
                {decisions.filter((d: any) => d.allowance != null).length} locked
              </span>
              <span style={{ fontWeight: 900, fontSize: '0.9rem', color: over ? t.red : t.ink, fontFamily: 'monospace' }}>
                {fmtAbs(committed)} <span style={{ fontWeight: 400, color: t.muted }}>/ {fmtAbs(totalAllowance)}</span>
              </span>
            </div>
          </div>
          <div style={{ height: 9, border: `1px solid ${t.line}`, background: t.sand, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((committed / totalAllowance) * 100, 100)}%`, background: over ? t.red : t.green, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {view === 'cards' && (
        <DecisionList
          decisions={decisions}
          projectId={id!}
          milestones={project.milestones}
          client={project.client}
        />
      )}

      {view === 'matrix' && (
        <SelectionMatrix decisions={decisions} milestoneMap={milestoneMap} />
      )}
    </div>
  )
}

function SelectionMatrix({ decisions, milestoneMap }: { decisions: Decision[]; milestoneMap: Record<string, string> }) {
  const sorted = [...decisions].sort((a, b) => {
    const room = (a.room || milestoneMap[a.milestoneId ?? ''] || '').localeCompare(b.room || milestoneMap[b.milestoneId ?? ''] || '')
    if (room !== 0) return room
    const pri = ['critical', 'high', 'normal', 'low']
    return pri.indexOf(a.priority) - pri.indexOf(b.priority)
  })

  const th: React.CSSProperties = {
    background: t.ink, color: '#fff', padding: '8px 10px',
    textAlign: 'left', fontSize: 11, fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    border: `1px solid ${t.line}`, whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = {
    padding: '8px 10px', fontSize: 12, border: `1px solid ${t.sand}`,
    verticalAlign: 'top', background: '#fff',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: `2px solid ${t.line}` }}>
        <thead>
          <tr>
            <th style={th}>Room</th>
            <th style={th}>Item</th>
            <th style={th}>Type</th>
            <th style={th}>Priority</th>
            <th style={th}>Allowance</th>
            <th style={th}>Committed</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const chip = STATUS_CHIP[d.status] ?? STATUS_CHIP.pending
            const roomLabel = d.room || milestoneMap[d.milestoneId ?? ''] || '—'
            const overAllowance = d.allowance != null && d.chosenPrice != null && d.chosenPrice > d.allowance
            const rowBg = i % 2 === 0 ? '#fff' : t.card
            return (
              <tr key={d.id} style={{ background: rowBg }}>
                <td style={{ ...td, background: rowBg, fontFamily: 'monospace', fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {roomLabel}
                </td>
                <td style={{ ...td, background: rowBg, fontWeight: 700, maxWidth: 260 }}>
                  {d.title}
                  {d.description && <div style={{ fontWeight: 400, color: t.muted, fontSize: 11, marginTop: 2 }}>{d.description}</div>}
                </td>
                <td style={{ ...td, background: rowBg }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 5px', textTransform: 'uppercase', background: t.paper, color: t.muted }}>
                    {d.type === 'freeform' ? 'disc' : 'choice'}
                  </span>
                </td>
                <td style={{ ...td, background: rowBg }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: PRIORITY_COLOR[d.priority] }}>
                    {d.priority}
                  </span>
                </td>
                <td style={{ ...td, background: rowBg, fontFamily: 'monospace', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {d.allowance != null ? fmt(d.allowance) : <span style={{ color: t.sand }}>—</span>}
                </td>
                <td style={{ ...td, background: rowBg, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: overAllowance ? t.red : d.chosenPrice != null ? t.green : t.muted }}>
                  {d.chosenPrice != null ? fmt(d.chosenPrice) : <span style={{ color: t.sand }}>—</span>}
                  {overAllowance && <span style={{ fontSize: 10, marginLeft: 4, color: t.red }}>▲</span>}
                </td>
                <td style={{ ...td, background: rowBg }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 6px', textTransform: 'uppercase', background: chip.bg, color: chip.color, whiteSpace: 'nowrap' }}>
                    {chip.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <p style={{ textAlign: 'center', color: t.muted, padding: '2rem', fontFamily: 'monospace', fontSize: '0.82rem', textTransform: 'uppercase' }}>No decisions yet.</p>
      )}
    </div>
  )
}
