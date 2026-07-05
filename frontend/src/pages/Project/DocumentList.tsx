import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../../api/documents'
import type { Document, DocumentKind, DocumentStatus, Milestone } from '@weebrook/shared/types'
import { t } from '../../theme'

const KIND_LABELS: Record<DocumentKind, string> = {
  plans: 'Construction Plans',
  permits: 'Permits',
  contracts: 'Contracts',
  soils: 'Soils Report',
  grading: 'Grading Plan',
  plot: 'Plot Plan',
  photos: 'Photos',
  other: 'Other',
}

const STATUS_STYLES: Record<DocumentStatus, { label: string; color: string; bg: string; border: string }> = {
  needed:   { label: 'Needed',   color: '#76510d', bg: '#f6e1bd', border: t.amber },
  received: { label: 'Received', color: t.blue,   bg: '#dde6ee', border: t.blue },
  on_file:  { label: 'On File',  color: t.green,  bg: '#dfe9d4', border: t.green },
}

interface Props {
  documents: Document[]
  projectId: string
  milestones: Milestone[]
}

export default function DocumentList({ documents, projectId, milestones }: Props) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Document | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  })

  const grouped = Object.entries(KIND_LABELS).map(([kind, label]) => ({
    kind: kind as DocumentKind,
    label,
    docs: documents.filter((d) => d.kind === kind),
  })).filter((g) => g.docs.length > 0)

  return (
    <div>
      <div style={styles.toolbar}>
        <span style={styles.count}>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        <button style={styles.addBtn} onClick={() => { setEditing(null); setShowForm(true) }}>+ Add Document</button>
      </div>

      {documents.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No documents yet.</p>
          <p style={styles.emptyHint}>Add construction plans, permits, contracts, and other project files.</p>
        </div>
      )}

      {grouped.map(({ kind, label, docs }) => (
        <div key={kind} style={styles.group}>
          <h3 style={styles.groupTitle}>{label}</h3>
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onEdit={() => { setEditing(doc); setShowForm(true) }}
              onDelete={() => deleteMut.mutate(doc.id)}
            />
          ))}
        </div>
      ))}

      {showForm && (
        <DocFormModal
          projectId={projectId}
          milestones={milestones}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['documents', projectId] })
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function DocRow({ doc, onEdit, onDelete }: { doc: Document; onEdit: () => void; onDelete: () => void }) {
  const s = STATUS_STYLES[doc.status]
  return (
    <div style={styles.row}>
      <div style={styles.rowMain}>
        <span style={styles.docName}>{doc.name}</span>
        <span style={{ ...styles.badge, color: s.color, background: s.bg, border: `1.5px solid ${s.border}` }}>{s.label}</span>
      </div>
      <div style={styles.rowRight}>
        {doc.link && (
          <a href={doc.link} target="_blank" rel="noopener noreferrer" style={styles.link}>View ↗</a>
        )}
        {!doc.link && <span style={styles.noLink}>No link</span>}
        <button style={styles.editBtn} onClick={onEdit}>Edit</button>
        <button style={styles.deleteBtn} onClick={onDelete}>✕</button>
      </div>
    </div>
  )
}

interface FormProps {
  projectId: string
  milestones: Milestone[]
  existing: Document | null
  onClose: () => void
  onSaved: () => void
}

function DocFormModal({ projectId, milestones, existing, onClose, onSaved }: FormProps) {
  const [name, setName] = useState(existing?.name || '')
  const [kind, setKind] = useState<DocumentKind>(existing?.kind || 'other')
  const [status, setStatus] = useState<DocumentStatus>(existing?.status || 'needed')
  const [link, setLink] = useState(existing?.link || '')
  const [milestoneId, setMilestoneId] = useState(existing?.milestoneId || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (existing) {
        await documentsApi.update(existing.id, { name, kind, status, link: link || undefined, milestoneId: milestoneId || undefined })
      } else {
        await documentsApi.create({ projectId, name, kind, status, link: link || undefined, milestoneId: milestoneId || undefined })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{existing ? 'Edit Document' : 'Add Document'}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.formBody}>
          <label style={styles.label}>Name *
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Construction Drawings Rev 3" />
          </label>

          <div style={styles.formRow}>
            <label style={styles.label}>Type
              <select style={styles.input} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
                {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label style={styles.label}>Status
              <select style={styles.input} value={status} onChange={(e) => setStatus(e.target.value as DocumentStatus)}>
                <option value="needed">Needed</option>
                <option value="received">Received</option>
                <option value="on_file">On File</option>
              </select>
            </label>
          </div>

          <label style={styles.label}>Phase (optional)
            <select style={styles.input} value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
              <option value="">No phase</option>
              {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          <label style={styles.label}>Link / URL
            <input style={styles.input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          </label>
        </div>

        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' },
  count: { fontSize: '0.78rem', color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase' },
  addBtn: { background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '5px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' },
  group: { marginBottom: '1.25rem' },
  groupTitle: { fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: '0.4rem', fontFamily: 'monospace' },
  row: { background: '#fff', border: `2px solid ${t.line}`, padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' },
  rowMain: { display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 },
  docName: { fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { fontFamily: 'monospace', fontSize: 10, padding: '2px 6px', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 },
  rowRight: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 },
  link: { fontSize: '0.78rem', color: t.blue, fontWeight: 700 },
  noLink: { fontSize: '0.75rem', color: t.sand },
  editBtn: { padding: '3px 8px', border: `1.5px solid ${t.line}`, background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: t.ink },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: t.red, fontSize: '0.85rem', padding: '0.2rem 0.3rem' },
  empty: { background: '#fff', border: `2px solid ${t.line}`, padding: '2.5rem', textAlign: 'center' },
  emptyText: { fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 },
  emptyHint: { color: t.muted, fontSize: '0.875rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: t.paper, border: `2px solid ${t.line}`, width: '100%', maxWidth: 480, overflow: 'hidden' },
  modalHeader: { padding: '10px 13px', background: t.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#fff', lineHeight: 1 },
  formBody: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', fontWeight: 900, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { padding: '0.5rem 0.7rem', border: `1.5px solid ${t.line}`, fontSize: '0.9rem', background: '#fff', outline: 'none' },
  modalActions: { padding: '1rem 1.25rem', borderTop: `1px solid ${t.sand}`, display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' },
  cancelBtn: { padding: '0.5rem 1rem', border: `2px solid ${t.line}`, cursor: 'pointer', background: 'transparent', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.78rem' },
  saveBtn: { padding: '0.5rem 1.1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.78rem' },
}
