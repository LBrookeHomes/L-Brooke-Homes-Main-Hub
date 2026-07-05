import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workOrdersApi } from '../../api/workorders'
import { documentsApi } from '../../api/documents'
import type { WorkOrder, Milestone, Document } from '@weebrook/shared/types'
import Modal from '../../components/Modal'
import WorkOrderForm from '../../components/WorkOrderForm/WorkOrderForm'
import { format } from 'date-fns'
import { t } from '../../theme'

const STATUS_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  draft:          { bg: '#e8e4dc', color: t.muted,  border: t.muted },
  sent:           { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  in_progress:    { bg: '#dde6ee', color: t.blue,   border: t.blue },
  completed:      { bg: '#dfe9d4', color: t.green,  border: t.green },
  needs_revision: { bg: '#f2d2ca', color: t.red,    border: t.red },
}

interface Props {
  workOrders: WorkOrder[]
  projectId: string
  milestones: Milestone[]
  documents: Document[]
}

export default function WorkOrderList({ workOrders, projectId, milestones, documents }: Props) {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<WorkOrder | null>(null)

  const sendMut = useMutation({
    mutationFn: (id: string) => workOrdersApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workorders', projectId] }),
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.82rem', color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          {workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}
        </span>
        <button
          style={{ background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onClick={() => setShowNew(true)}
        >+ New Work Order</button>
      </div>

      {workOrders.length === 0 && <p style={{ color: t.muted, textAlign: 'center', padding: '2rem', fontFamily: 'monospace', fontSize: '0.82rem', textTransform: 'uppercase' }}>No work orders yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {workOrders.map((wo) => (
          <WorkOrderRow
            key={wo.id}
            wo={wo}
            projectDocuments={documents}
            onEdit={() => setSelected(wo)}
            onSend={() => sendMut.mutate(wo.id)}
            sendPending={sendMut.isPending}
            onAttachChange={() => qc.invalidateQueries({ queryKey: ['workorders', projectId] })}
          />
        ))}
      </div>

      {showNew && (
        <Modal title="New Work Order" onClose={() => setShowNew(false)} maxWidth={600}>
          <WorkOrderForm
            projectId={projectId}
            milestones={milestones}
            onClose={() => setShowNew(false)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ['workorders', projectId] })
              setShowNew(false)
            }}
          />
        </Modal>
      )}

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} maxWidth={600}>
          <WorkOrderForm
            projectId={projectId}
            milestones={milestones}
            existing={selected}
            onClose={() => setSelected(null)}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ['workorders', projectId] })
              setSelected(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

interface RowProps {
  wo: any
  projectDocuments: Document[]
  onEdit: () => void
  onSend: () => void
  sendPending: boolean
  onAttachChange: () => void
}

function WorkOrderRow({ wo, projectDocuments, onEdit, onSend, sendPending, onAttachChange }: RowProps) {
  const [showDocs, setShowDocs] = useState(false)
  const attachedIds = new Set((wo.documents || []).map((wd: any) => wd.documentId || wd.document?.id))

  async function toggleDoc(doc: Document) {
    if (attachedIds.has(doc.id)) {
      await documentsApi.detach(doc.id, wo.id)
    } else {
      await documentsApi.attach(doc.id, wo.id)
    }
    onAttachChange()
  }

  const availableDocs = projectDocuments.filter((d) => d.status !== 'needed')
  const chip = STATUS_CHIP[wo.status] ?? STATUS_CHIP.draft

  return (
    <div style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '0.85rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: t.muted, letterSpacing: '0.08em', fontFamily: 'monospace' }}>
          {wo.trade}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 6px', textTransform: 'uppercase', background: chip.bg, color: chip.color }}>
          {wo.status.replace('_', ' ')}
        </span>
        {wo.priority === 'urgent' && (
          <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.red}`, padding: '2px 6px', textTransform: 'uppercase', background: '#f2d2ca', color: t.red }}>
            Urgent
          </span>
        )}
      </div>
      <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, cursor: 'pointer' }} onClick={onEdit}>{wo.title}</p>
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: t.muted, flexWrap: 'wrap', marginBottom: 8 }}>
        {wo.contractor && <span>→ {wo.contractor.name}</span>}
        {wo.scheduledDate && <span>Scheduled: {format(new Date(wo.scheduledDate), 'MMM d')}</span>}
        {wo.completedDate && <span style={{ color: t.green, fontWeight: 700 }}>✓ Completed {format(new Date(wo.completedDate), 'MMM d')}</span>}
        {wo.photos?.length > 0 && <span>{wo.photos.length} photo{wo.photos.length !== 1 ? 's' : ''}</span>}
        {attachedIds.size > 0 && <span>{attachedIds.size} doc{attachedIds.size !== 1 ? 's' : ''} attached</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {wo.status === 'draft' && wo.contractor && (
          <button
            style={{ padding: '4px 9px', background: t.amber, border: `2px solid ${t.amber}`, color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
            onClick={onSend} disabled={sendPending}
          >Send SMS</button>
        )}
        <button
          style={{ padding: '4px 9px', border: `1.5px solid ${t.line}`, background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.ink }}
          onClick={() => setShowDocs((v) => !v)}
        >
          {showDocs ? 'Hide docs' : `Docs${attachedIds.size > 0 ? ` (${attachedIds.size})` : ''}`}
        </button>
        <button
          style={{ padding: '4px 9px', border: `1.5px solid ${t.line}`, background: 'transparent', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.ink }}
          onClick={onEdit}
        >Edit</button>
      </div>

      {showDocs && (
        <div style={{ marginTop: '0.75rem', borderTop: `1px solid ${t.sand}`, paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {availableDocs.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: t.muted, fontStyle: 'italic' }}>No received/on-file documents.</p>
          )}
          {availableDocs.map((doc) => {
            const attached = attachedIds.has(doc.id)
            return (
              <label key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                <input type="checkbox" checked={attached} onChange={() => toggleDoc(doc)} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1 }}>{doc.name}</span>
                <span style={{ fontSize: '0.68rem', color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase' }}>{doc.kind}</span>
                {doc.link && <a href={doc.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: t.blue }}>↗</a>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
