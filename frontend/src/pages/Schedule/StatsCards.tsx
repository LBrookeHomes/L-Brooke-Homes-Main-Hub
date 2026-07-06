import { STATUSES, type WorkItem } from '../../api/schedule'
import { t } from '../../theme'
import { statusChip } from './scheduleStyles'

interface Props {
  items: WorkItem[]
}

export default function StatsCards({ items }: Props) {
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = items.filter((i) => i.status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 20 }}>
      <div style={{ background: t.ink, color: '#fff', padding: '12px 14px', border: `2px solid ${t.line}` }}>
        <p style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{items.length}</p>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, opacity: 0.7 }}>Total</p>
      </div>
      {STATUSES.map((s) => {
        const chip = statusChip(s)
        return (
          <div key={s} style={{ background: chip.bg, padding: '12px 14px', border: `2px solid ${chip.border}` }}>
            <p style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 900, lineHeight: 1, color: chip.color }}>{counts[s]}</p>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, color: chip.color, fontWeight: 800 }}>{s}</p>
          </div>
        )
      })}
    </div>
  )
}
