import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { Milestone, MilestonePhase } from '@weebrook/shared/types'
import { format, differenceInDays, parseISO, isAfter } from 'date-fns'
import { t } from '../../theme'

const PHASE_LABELS: Record<MilestonePhase, string> = {
  onboarding: 'Onboarding',
  preconstruction: 'Pre-Construction',
  construction: 'Construction',
  closeout: 'Closeout',
}

const PHASE_ORDER: MilestonePhase[] = ['onboarding', 'preconstruction', 'construction', 'closeout']

const PHASE_COLORS: Record<MilestonePhase, string> = {
  onboarding: '#7c3aed',
  preconstruction: t.amber,
  construction: t.blue,
  closeout: t.green,
}

const STATUS_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  pending:     { bg: '#e8e4dc', color: t.muted, border: t.muted },
  in_progress: { bg: '#dde6ee', color: t.blue, border: t.blue },
  complete:    { bg: '#dfe9d4', color: t.green, border: t.green },
  blocked:     { bg: '#f2d2ca', color: t.red, border: t.red },
}

interface Props {
  milestones: Milestone[]
  projectId: string
}

export default function MilestoneTimeline({ milestones, projectId }: Props) {
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/milestones/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  const now = new Date()

  const grouped = PHASE_ORDER.reduce<Record<MilestonePhase, Milestone[]>>(
    (acc, phase) => {
      acc[phase] = milestones.filter((m) => m.phase === phase).sort((a, b) => a.order - b.order)
      return acc
    },
    { onboarding: [], preconstruction: [], construction: [], closeout: [] }
  )

  const activePhasesInOrder = PHASE_ORDER.filter((p) => grouped[p].length > 0)

  let globalIdx = 0

  return (
    <div>
      {activePhasesInOrder.map((phase) => (
        <div key={phase} style={{ marginBottom: '1.25rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: PHASE_COLORS[phase], borderLeft: `3px solid ${PHASE_COLORS[phase]}`,
            paddingLeft: '0.6rem', marginBottom: '0.5rem',
          }}>
            {PHASE_LABELS[phase]}
            <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: '0.7rem', opacity: 0.7, textTransform: 'none', letterSpacing: 0, fontFamily: 'monospace' }}>
              {grouped[phase].length} milestone{grouped[phase].length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '0.75rem' }}>
            {grouped[phase].map((m) => {
              const idx = globalIdx++
              const isOverdue = m.endDate && isAfter(now, parseISO(m.endDate as unknown as string)) && m.status !== 'complete'
              const duration =
                m.startDate && m.endDate
                  ? differenceInDays(parseISO(m.endDate as unknown as string), parseISO(m.startDate as unknown as string))
                  : null
              const chip = STATUS_CHIP[m.status] ?? STATUS_CHIP.pending

              return (
                <div key={m.id} style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 24, height: 24, background: PHASE_COLORS[phase], color: '#fff',
                    fontWeight: 900, fontSize: '0.65rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.name}</span>
                      {isOverdue && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.red}`, padding: '2px 6px', textTransform: 'uppercase', background: '#f2d2ca', color: t.red }}>
                          Overdue
                        </span>
                      )}
                      <select
                        style={{ marginLeft: 'auto', fontSize: '0.78rem', padding: '3px 6px', border: `1.5px solid ${chip.border}`, background: chip.bg, color: chip.color, cursor: 'pointer', fontWeight: 700 }}
                        value={m.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateMut.mutate({ id: m.id, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="complete">Complete</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: t.muted, flexWrap: 'wrap', fontFamily: 'monospace' }}>
                      {m.startDate && <span>Start: {format(parseISO(m.startDate as unknown as string), 'MMM d, yyyy')}</span>}
                      {m.endDate && <span>End: {format(parseISO(m.endDate as unknown as string), 'MMM d, yyyy')}</span>}
                      {duration !== null && <span>{duration} days</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
