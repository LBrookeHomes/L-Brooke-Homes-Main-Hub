import { type Worker, type WorkItem } from '../../api/schedule'
import { t } from '../../theme'
import { statusChip } from './scheduleStyles'

interface Props {
  workers: Worker[]
  items: WorkItem[]
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Unscheduled'
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function WorkerLog({ workers, items }: Props) {
  if (workers.length === 0) {
    return <p style={{ fontSize: 13, color: t.muted, fontStyle: 'italic' }}>No workers yet.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {workers.map((worker) => {
        const workerItems = items
          .filter((i) => i.workerIds.includes(worker.id))
          .sort((a, b) => (b.jobDate || '').localeCompare(a.jobDate || ''))
        const totalHours = workerItems.reduce((sum, i) => sum + (i.plannedHours || 0), 0)
        const completed = workerItems.filter((i) => i.status === 'Completed').length

        return (
          <div key={worker.id} style={{ background: t.card, border: `2px solid ${t.line}` }}>
            <div style={{ background: t.ink, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{worker.name}</span>
              <div style={{ display: 'flex', gap: 14, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                <span>{workerItems.length} jobs</span>
                <span>{completed} done</span>
                <span>{totalHours}h planned</span>
              </div>
            </div>
            <div style={{ padding: workerItems.length ? '4px 0' : '12px 14px' }}>
              {workerItems.length === 0 ? (
                <span style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>No assigned jobs.</span>
              ) : (
                workerItems.map((i) => {
                  const chip = statusChip(i.status)
                  return (
                    <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 14px', borderTop: `1px solid ${t.sand}`, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: t.muted, minWidth: 110 }}>{fmtDate(i.jobDate)}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 120 }}>{i.jobDetails}</span>
                      {i.plannedHours != null && <span style={{ fontFamily: 'monospace', fontSize: 11, color: t.muted }}>{i.plannedHours}h</span>}
                      <span style={{ fontFamily: 'monospace', fontSize: 9, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, padding: '1px 5px', textTransform: 'uppercase' }}>{i.status}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
