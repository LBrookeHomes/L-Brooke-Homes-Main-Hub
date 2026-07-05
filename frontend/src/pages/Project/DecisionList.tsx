import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi } from '../../api/decisions'
import { clientsApi } from '../../api/projects'
import type { Decision, Milestone } from '@weebrook/shared/types'
import DecisionCard from '../../components/DecisionCard/DecisionCard'
import DecisionThread from '../../components/DecisionThread/DecisionThread'
import Modal from '../../components/Modal'
import NewDecisionForm from './NewDecisionForm'
import WorkOrderForm from '../../components/WorkOrderForm/WorkOrderForm'
import EditDecisionForm from './EditDecisionForm'
import { t } from '../../theme'

const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low']
const STATUS_ORDER = ['pending', 'staged', 'decided', 'locked']

type StatusFilter = 'active' | 'pending' | 'with_client' | 'responded' | 'locked' | 'all'
type TypeFilter = 'all' | 'choices' | 'discussions'

const STATUS_FILTERS: { key: StatusFilter; label: string; match: (d: Decision) => boolean }[] = [
  { key: 'active',      label: 'Active',      match: (d) => ['pending', 'staged', 'decided'].includes(d.status) },
  { key: 'pending',     label: 'Pending',     match: (d) => d.status === 'pending' },
  { key: 'with_client', label: 'With Client', match: (d) => ['staged', 'decided'].includes(d.status) },
  { key: 'responded',   label: 'Responded',   match: (d) => d.status === 'decided' },
  { key: 'locked',      label: 'Locked',      match: (d) => d.status === 'locked' },
  { key: 'all',         label: 'All',         match: () => true },
]

interface Props {
  decisions: Decision[]
  projectId: string
  milestones: Milestone[]
  client: { id: string; portalToken: string | null }
}

export default function DecisionList({ decisions, projectId, milestones, client }: Props) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Decision | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)
  const [createWOFor, setCreateWOFor] = useState<Decision | null>(null)
  const [copied, setCopied] = useState(false)

  const generateLinkMut = useMutation({
    mutationFn: () => clientsApi.sendPortalLink(client.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  })

  async function handleCopyPortalLink() {
    let token = client.portalToken
    if (!token) {
      await generateLinkMut.mutateAsync()
      const updated = await qc.fetchQuery({ queryKey: ['project', projectId], staleTime: 0 }) as any
      token = updated?.client?.portalToken ?? null
    }
    if (!token) return
    const link = `${window.location.origin}/portal/login?token=${token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stageMut = useMutation({
    mutationFn: (id: string) => decisionsApi.stage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions', projectId] }),
  })
  const unstageMut = useMutation({
    mutationFn: (id: string) => decisionsApi.unstage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions', projectId] }),
  })
  const lockMut = useMutation({
    mutationFn: ({ id, optionId }: { id: string; optionId?: string }) =>
      decisionsApi.lock(id, optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions', projectId] })
      qc.invalidateQueries({ queryKey: ['attention', projectId] })
      setSelected(null)
    },
  })

  const sorted = [...decisions].sort((a, b) => {
    const pa = PRIORITY_ORDER.indexOf(a.priority)
    const pb = PRIORITY_ORDER.indexOf(b.priority)
    if (pa !== pb) return pa - pb
    return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  })

  const statusMatcher = STATUS_FILTERS.find((f) => f.key === statusFilter)!.match
  const visible = sorted.filter((d) => {
    if (!statusMatcher(d)) return false
    if (typeFilter === 'choices') return d.type === 'structured'
    if (typeFilter === 'discussions') return d.type === 'freeform'
    return true
  })

  const counts = Object.fromEntries(
    STATUS_FILTERS.map((f) => [f.key, decisions.filter(f.match).length])
  ) as Record<StatusFilter, number>

  const pillOn: React.CSSProperties = { background: t.rust, border: `1.5px solid ${t.rust}`, color: '#fff', padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
  const pillOff: React.CSSProperties = { background: '#fff', border: `1.5px solid ${t.line}`, color: t.ink, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
  const pillAlert: React.CSSProperties = { background: '#f6e1bd', border: `1.5px solid ${t.amber}`, color: '#76510d', padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key
              const count = counts[f.key]
              const highlight = f.key === 'responded' && count > 0 && statusFilter !== 'responded'
              return (
                <button
                  key={f.key}
                  style={active ? pillOn : highlight ? pillAlert : pillOff}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                  {count > 0 && (
                    <span style={{
                      marginLeft: 5, fontFamily: 'monospace', fontSize: 10,
                      background: active ? 'rgba(255,255,255,0.25)' : t.sand,
                      color: active ? '#fff' : t.ink,
                      padding: '1px 5px', border: 'none',
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {(['all', 'choices', 'discussions'] as TypeFilter[]).map((typ) => (
              <button
                key={typ}
                style={typeFilter === typ ? pillOn : { ...pillOff, padding: '3px 8px', fontSize: 11 }}
                onClick={() => setTypeFilter(typ)}
              >
                {typ === 'all' ? 'All types' : typ === 'choices' ? 'Choices' : 'Discussions'}
              </button>
            ))}
          </div>
        </div>
        <button
          style={{ background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', flexShrink: 0 }}
          onClick={() => setShowNew(true)}
        >+ Add Decision</button>
      </div>

      {copied && (
        <div style={{ background: t.ink, color: '#fff', fontSize: '0.8rem', fontWeight: 700, padding: '0.5rem 1rem', borderLeft: `4px solid ${t.rust}`, marginBottom: '0.75rem' }}>
          Portal link copied to clipboard
        </div>
      )}

      {visible.length === 0 && (
        <p style={{ color: t.muted, fontSize: '0.85rem', textAlign: 'center', padding: '2rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          No decisions in this view.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {visible.map((d) => (
          <DecisionCard
            key={d.id}
            decision={d}
            onOpen={() => setSelected(d)}
            onStage={() => stageMut.mutate(d.id)}
            onUnstage={() => unstageMut.mutate(d.id)}
            onLock={(optionId) => lockMut.mutate({ id: d.id, optionId })}
            onEdit={() => setEditingDecision(d)}
            onCreateWorkOrder={() => setCreateWOFor(d)}
            onCopyPortalLink={['staged', 'decided'].includes(d.status) ? handleCopyPortalLink : undefined}
            copyLinkPending={generateLinkMut.isPending}
          />
        ))}
      </div>

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} maxWidth={600}>
          {selected.type === 'structured'
            ? <DecisionCard decision={selected} expanded onStage={() => stageMut.mutate(selected.id)}
                onUnstage={() => unstageMut.mutate(selected.id)}
                onLock={(optId) => lockMut.mutate({ id: selected.id, optionId: optId })} onOpen={() => {}} />
            : <DecisionThread decision={selected} projectId={projectId} />
          }
        </Modal>
      )}

      {editingDecision && (
        <Modal title="Edit Decision" onClose={() => setEditingDecision(null)}>
          <EditDecisionForm
            decision={editingDecision}
            onClose={() => setEditingDecision(null)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['decisions', projectId] })
              setEditingDecision(null)
            }}
          />
        </Modal>
      )}

      {showNew && (
        <Modal title="Add Decision" onClose={() => setShowNew(false)}>
          <NewDecisionForm
            projectId={projectId}
            milestones={milestones}
            onClose={() => setShowNew(false)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ['decisions', projectId] })
              setShowNew(false)
            }}
          />
        </Modal>
      )}

      {createWOFor && (
        <Modal title={`Create work order — ${createWOFor.title}`} onClose={() => setCreateWOFor(null)}>
          <WorkOrderForm
            projectId={projectId}
            milestones={milestones}
            prefill={{
              title: createWOFor.title,
              milestoneId: createWOFor.milestoneId ?? undefined,
              fromDecisionId: createWOFor.id,
            }}
            onClose={() => setCreateWOFor(null)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ['workorders', projectId] })
              qc.invalidateQueries({ queryKey: ['decisions', projectId] })
              setCreateWOFor(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
