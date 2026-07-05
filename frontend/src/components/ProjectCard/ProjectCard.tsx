import { ProjectWithMeta } from '../../api/projects'
import { format } from 'date-fns'
import { t } from '../../theme'

const STATUS_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  planning: { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  active:   { bg: '#dfe9d4', color: t.green,  border: t.green },
  on_hold:  { bg: '#f2d2ca', color: t.red,    border: t.red },
  complete: { bg: '#e8e4dc', color: t.muted,  border: t.muted },
  cancelled:{ bg: '#e8e4dc', color: t.muted,  border: t.muted },
}

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toLocaleString()
}

interface Props {
  project: ProjectWithMeta
  onClick: () => void
}

export default function ProjectCard({ project, onClick }: Props) {
  const completedMilestones = project.milestones.filter((m) => m.status === 'complete').length
  const totalMilestones = project.milestones.length
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0

  const budget = project.budget
  const budgetPct = budget && budget.allowance > 0 ? Math.min((budget.committed / budget.allowance) * 100, 100) : 0
  const overBudget = !!(budget && budget.committed > budget.allowance)

  const chip = STATUS_CHIP[project.status] ?? STATUS_CHIP.complete

  return (
    <div
      style={{ background: t.card, border: `2px solid ${t.line}`, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 7 }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h4 style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>{project.name}</h4>
        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 6px', textTransform: 'uppercase', background: chip.bg, color: chip.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      <p style={{ fontSize: '0.78rem', color: t.muted }}>{project.address}</p>
      <p style={{ fontSize: '0.78rem', color: t.ink, fontWeight: 700 }}>{project.client.name}</p>

      {totalMilestones > 0 && (
        <div>
          <div style={{ height: 9, border: `1px solid ${t.line}`, background: t.sand, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: t.green, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.68rem', color: t.muted, display: 'block', marginTop: 3, fontFamily: 'monospace' }}>
            {completedMilestones}/{totalMilestones} PHASES
          </span>
        </div>
      )}

      {budget && budget.allowance > 0 && (
        <div>
          <div style={{ height: 9, border: `1px solid ${t.line}`, background: t.sand, overflow: 'hidden', marginTop: 2 }}>
            <div style={{ height: '100%', width: `${budgetPct}%`, background: overBudget ? t.red : t.blue, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: overBudget ? t.red : t.ink, fontFamily: 'monospace' }}>
              {fmt(budget.committed)}{overBudget ? ' OVER' : ' committed'}
            </span>
            <span style={{ fontSize: '0.68rem', color: t.muted, fontFamily: 'monospace' }}>{fmt(budget.allowance)} budget</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: '#fff' }}>
          {project._count.decisions} decisions
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: '#fff' }}>
          {project._count.workOrders} WOs
        </span>
        {project.targetDate && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: '#fff' }}>
            Due {format(new Date(project.targetDate), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  )
}
