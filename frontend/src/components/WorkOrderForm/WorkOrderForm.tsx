import { useState, FormEvent } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { workOrdersApi, uploadPhoto } from '../../api/workorders'
import { api } from '../../api/client'
import type { WorkOrder, Milestone, Contractor } from '@weebrook/shared/types'

interface Prefill {
  title?: string
  milestoneId?: string
  fromDecisionId?: string
}

interface Props {
  projectId: string
  milestones: Milestone[]
  existing?: WorkOrder
  prefill?: Prefill
  onClose: () => void
  onCreated: () => void
}

export default function WorkOrderForm({ projectId, milestones, existing, prefill, onClose, onCreated }: Props) {
  const [title, setTitle] = useState(existing?.title || prefill?.title || '')
  const [trade, setTrade] = useState(existing?.trade || 'general')
  const [instructions, setInstructions] = useState(existing?.instructions || '')
  const [contractorId, setContractorId] = useState(existing?.contractorId || '')
  const [milestoneId, setMilestoneId] = useState(existing?.milestoneId || prefill?.milestoneId || '')
  const [priority, setPriority] = useState(existing?.priority || 'normal')
  const [scheduledDate, setScheduledDate] = useState(
    existing?.scheduledDate ? new Date(existing.scheduledDate).toISOString().split('T')[0] : ''
  )
  const [dueDate, setDueDate] = useState(
    existing?.dueDate ? new Date(existing.dueDate).toISOString().split('T')[0] : ''
  )
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState<{ s3Key: string; caption: string }[]>([])
  const [error, setError] = useState('')

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: () => api.get<Contractor[]>('/contractors'),
  })

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const wo = await workOrdersApi.create(data)
      for (const p of photos) await workOrdersApi.addPhoto(wo.id, p.s3Key, p.caption)
      return wo
    },
    onSuccess: onCreated,
    onError: (err: any) => setError(err.message),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => workOrdersApi.update(existing!.id, data),
    onSuccess: onCreated,
    onError: (err: any) => setError(err.message),
  })

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const s3Key = await uploadPhoto(file)
      setPhotos([...photos, { s3Key, caption: '' }])
    } catch (err: any) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = {
      projectId,
      trade,
      title,
      instructions,
      contractorId: contractorId || null,
      milestoneId: milestoneId || null,
      priority,
      scheduledDate: scheduledDate || null,
      dueDate: dueDate || null,
      fromDecisionId: prefill?.fromDecisionId || null,
    }
    if (existing) updateMut.mutate(data)
    else createMut.mutate(data)
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label}>Title *
        <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <div style={styles.row}>
        <label style={styles.label}>Trade
          <select style={styles.input} value={trade} onChange={(e) => setTrade(e.target.value as any)}>
            {['plumbing','electrical','masonry','carpentry','finish','painting','landscaping','hvac','roofing','tiling','drywall','general'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label style={styles.label}>Priority
          <select style={styles.input} value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Contractor
          <select style={styles.input} value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
            <option value="">Unassigned</option>
            {contractors.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.trade})</option>
            ))}
          </select>
        </label>
        <label style={styles.label}>Phase
          <select style={styles.input} value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">None</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Scheduled date
          <input style={styles.input} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </label>
        <label style={styles.label}>Due date
          <input style={styles.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <label style={styles.label}>Instructions
        <textarea style={{ ...styles.input, height: 100 }} value={instructions}
          onChange={(e) => setInstructions(e.target.value)} placeholder="Describe the work in detail…" />
      </label>

      {!existing && (
        <div>
          <p style={styles.photoLabel}>Photos ({photos.length})</p>
          {photos.map((p, i) => (
            <div key={i} style={styles.photoRow}>
              <span style={styles.photoKey}>📷 {p.s3Key.split('/').pop()}</span>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="Caption (optional)"
                value={p.caption}
                onChange={(e) => setPhotos(photos.map((ph, j) => j === i ? { ...ph, caption: e.target.value } : ph))}
              />
              <button type="button" style={styles.removePhoto} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <label style={styles.uploadBtn}>
            {uploading ? 'Uploading…' : '+ Add photo'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
        <button type="submit" style={styles.submitBtn} disabled={isPending}>
          {isPending ? 'Saving…' : existing ? 'Save Changes' : 'Create Work Order'}
        </button>
      </div>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.5rem 0.7rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', resize: 'vertical' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' },
  photoLabel: { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 },
  photoRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' },
  photoKey: { fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 },
  removePhoto: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.9rem' },
  uploadBtn: { display: 'inline-block', padding: '0.35rem 0.8rem', border: '1px dashed #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280', marginTop: 4 },
  error: { color: '#dc2626', fontSize: '0.8rem' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 4 },
  cancelBtn: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', background: '#fff' },
  submitBtn: { padding: '0.5rem 1.1rem', background: '#1a5c38', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 },
}
