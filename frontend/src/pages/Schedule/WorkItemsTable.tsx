import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi, STATUSES, type WorkItem, type Status } from '../../api/schedule'
import { t } from '../../theme'
import { statusChip } from './scheduleStyles'

interface Props {
  items: WorkItem[]
  onEdit: (item: WorkItem) => void
  isMobile: boolean
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function WorkItemsTable({ items, onEdit, isMobile }: Props) {
  const qc = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => scheduleApi.updateWorkItemStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', 'work-items'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => scheduleApi.deleteWorkItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', 'work-items'] })
      setDeleteConfirm(null)
    },
  })

  if (items.length === 0) {
    return (
      <div style={{ border: `2px dashed ${t.sand}`, padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: 8 }}>No work items</p>
        <p style={{ fontSize: '0.85rem', color: t.muted }}>Add a work item to start building the schedule.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => {
        const chip = statusChip(item.status)
        const confirming = deleteConfirm === item.id
        return (
          <div key={item.id} style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>{item.jobDetails}</span>
                  {item.firstStop && <span style={{ fontFamily: 'monospace', fontSize: 9, background: t.blue, color: '#fff', padding: '1px 5px', textTransform: 'uppercase' }}>1st Stop</span>}
                  {item.endOfDay && <span style={{ fontFamily: 'monospace', fontSize: 9, background: t.muted, color: '#fff', padding: '1px 5px', textTransform: 'uppercase' }}>EOD</span>}
                  {item.materialRequired && <span style={{ fontFamily: 'monospace', fontSize: 9, background: t.amber, color: '#fff', padding: '1px 5px', textTransform: 'uppercase' }}>Material</span>}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem', color: t.muted }}>
                  <span style={{ fontFamily: 'monospace' }}>{fmtDate(item.jobDate)}{item.day ? ` · ${item.day}` : ''}</span>
                  {(item.startTime || item.endTime) && (
                    <span style={{ fontFamily: 'monospace' }}>{item.startTime || '—'}–{item.endTime || '—'}</span>
                  )}
                  {item.plannedHours != null && <span style={{ fontFamily: 'monospace' }}>{item.plannedHours}h</span>}
                  {item.workerNames.length > 0 && <span>👷 {item.workerNames.join(', ')}</span>}
                  {item.locationNames.length > 0 && <span>📍 {item.locationNames.join(', ')}</span>}
                </div>
                {item.notes && <p style={{ fontSize: '0.78rem', color: t.muted, fontStyle: 'italic', marginTop: 6 }}>{item.notes}</p>}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                <select
                  value={item.status}
                  onChange={(e) => statusMut.mutate({ id: item.id, status: e.target.value as Status })}
                  style={{
                    fontFamily: 'monospace', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    padding: '4px 6px', cursor: 'pointer',
                    background: chip.bg, color: chip.color, border: `1.5px solid ${chip.border}`,
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => onEdit(item)}
                  style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.ink, padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                >Edit</button>
                {confirming ? (
                  <>
                    <button
                      onClick={() => deleteMut.mutate(item.id)}
                      disabled={deleteMut.isPending}
                      style={{ background: t.red, border: `1.5px solid ${t.red}`, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}
                    >{deleteMut.isPending ? '…' : 'Delete'}</button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                    >×</button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                  >{isMobile ? 'Del' : 'Delete'}</button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
