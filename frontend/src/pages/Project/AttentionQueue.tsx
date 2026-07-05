import type { AttentionQueue as AQ } from '../../api/projects'
import { format } from 'date-fns'
import { t } from '../../theme'

const PRIORITY_COLOR: Record<string, string> = {
  critical: t.red,
  high: t.amber,
  normal: t.muted,
  low: t.muted,
}

interface Props {
  attention: AQ | undefined
  projectId: string
}

export default function AttentionQueue({ attention }: Props) {
  if (!attention) return <p style={{ color: t.muted, fontSize: '0.85rem' }}>Loading…</p>

  const allItems = [
    ...attention.blockingDecisions.map((d: any) => ({ ...d, tag: 'Blocking', tagColor: t.red })),
    ...attention.overdueDecisions.filter((d: any) => !attention.blockingDecisions.find((b: any) => b.id === d.id))
      .map((d: any) => ({ ...d, tag: 'Overdue', tagColor: t.red })),
    ...attention.unstaged.filter(
      (d: any) => !attention.blockingDecisions.find((b: any) => b.id === d.id) &&
                  !attention.overdueDecisions.find((o: any) => o.id === d.id)
    ).map((d: any) => ({ ...d, tag: 'Not staged', tagColor: t.amber })),
    ...attention.overdueMilestones.map((m: any) => ({ ...m, tag: 'Phase overdue', tagColor: t.red, _type: 'milestone' })),
    ...attention.upcomingMilestones.map((m: any) => ({ ...m, tag: 'Starting soon', tagColor: t.amber, _type: 'milestone' })),
  ]

  if (allItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: '1.5rem', color: t.green, marginBottom: '0.5rem' }}>✓</div>
        <p style={{ color: t.muted, fontSize: '0.9rem' }}>Nothing needs your attention right now.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {allItems.map((item: any) => (
        <div key={item.id} style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90, alignItems: 'flex-end' }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${item.tagColor}`,
              padding: '2px 6px', textTransform: 'uppercase', background: item.tagColor + '1a', color: item.tagColor,
              whiteSpace: 'nowrap',
            }}>
              {item.tag}
            </span>
            {item.priority && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: PRIORITY_COLOR[item.priority], fontFamily: 'monospace' }}>
                {item.priority}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{item.title || item.name}</p>
            {item.milestone?.name && <p style={{ fontSize: '0.78rem', color: t.muted }}>Phase: {item.milestone.name}</p>}
            {item.dueDate && <p style={{ fontSize: '0.78rem', color: t.muted }}>Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}</p>}
            {item.endDate && <p style={{ fontSize: '0.78rem', color: t.muted }}>Was due: {format(new Date(item.endDate), 'MMM d, yyyy')}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
