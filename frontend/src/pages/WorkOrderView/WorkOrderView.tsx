import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { PUBLIC_BASE } from '../../api/client'
import { t } from '../../theme'

interface WorkOrderPublic {
  id: string
  title: string
  instructions: string
  trade: string
  status: string
  priority: string
  scheduledDate?: string
  dueDate?: string
  project: { name: string; address: string }
  milestone?: { name: string }
  contractor?: { name: string; trade: string }
  photos: { id: string; s3Key: string; caption?: string; url: string }[]
  documents: { document: { id: string; name: string; kind: string; link: string | null } }[]
}

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft:          { label: 'Draft',         bg: t.paper,   color: t.muted,  border: t.muted },
  sent:           { label: 'Sent',          bg: '#dde6ee', color: t.blue,   border: t.blue },
  in_progress:    { label: 'In Progress',   bg: '#f6e1bd', color: '#76510d', border: t.amber },
  completed:      { label: 'Completed',     bg: '#dfe9d4', color: t.green,  border: t.green },
  needs_revision: { label: 'Needs Revision',bg: '#f5dbd9', color: t.red,    border: t.red },
}

export default function WorkOrderView() {
  const { token } = useParams<{ token: string }>()
  const [wo, setWo] = useState<WorkOrderPublic | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; caption: string }[]>([])
  const [completing, setCompleting] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${PUBLIC_BASE}/work-orders/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setWo(d) })
      .catch(() => setError('Could not load work order.'))
  }, [token])

  async function handleStart() {
    await fetch(`${PUBLIC_BASE}/work-orders/${token}/start`, { method: 'POST' })
    setWo((prev) => prev ? { ...prev, status: 'in_progress' } : prev)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const urlRes = await fetch(`${PUBLIC_BASE}/work-orders/${token}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      const { uploadUrl, s3Key } = await urlRes.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      await fetch(`${PUBLIC_BASE}/work-orders/${token}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key }),
      })
      const localUrl = URL.createObjectURL(file)
      setUploadedPhotos((prev) => [...prev, { url: localUrl, caption: '' }])
    } catch {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      await fetch(`${PUBLIC_BASE}/work-orders/${token}/complete`, { method: 'POST' })
      setDone(true)
    } catch {
      alert('Could not submit. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '2rem', maxWidth: 380, width: '90%' }}>
        <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.red, marginBottom: 8 }}>Link Error</p>
        <h2 style={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: 8 }}>Link Expired</h2>
        <p style={{ color: t.ink, marginBottom: 8, fontSize: '0.9rem' }}>{error}</p>
        <p style={{ color: t.muted, fontSize: '0.82rem' }}>Contact your GC for updated instructions.</p>
      </div>
    </div>
  )

  if (!wo) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <p style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.8rem', color: t.muted }}>Loading…</p>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '2.5rem 2rem', maxWidth: 400, width: '90%', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: t.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, margin: '0 auto 1.25rem', border: `2px solid ${t.line}` }}>
          ✓
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: 8 }}>Work Order</p>
        <h2 style={{ fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', marginBottom: 8 }}>Job Submitted</h2>
        <p style={{ color: t.muted, fontSize: '0.875rem', marginBottom: '1rem' }}>Your GC has been notified. Thanks for using Weebrook.</p>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: t.ink }}>{wo.project.address}</p>
        <p style={{ fontSize: '0.8rem', color: t.muted, fontFamily: 'monospace' }}>{wo.title}</p>
      </div>
    </div>
  )

  const isComplete = wo.status === 'completed'
  const canStart = wo.status === 'sent'
  const allPhotos = [...wo.photos, ...uploadedPhotos.map((p, i) => ({ id: `new-${i}`, url: p.url, caption: p.caption }))]
  const statusChip = STATUS_CHIP[wo.status] ?? STATUS_CHIP.sent

  return (
    <div style={{ minHeight: '100vh', background: t.paper }}>
      {/* Header */}
      <header style={{ background: t.ink, borderBottom: `4px solid ${t.rust}`, padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff', margin: 0 }}>Weebrook</p>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 1 }}>Work Order</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1.5px solid rgba(255,255,255,0.4)`, padding: '2px 7px', color: '#fff' }}>
            {wo.trade.toUpperCase()}
          </span>
          {wo.priority === 'urgent' && (
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1.5px solid ${t.rust}`, padding: '2px 7px', background: t.rust, color: '#fff' }}>
              URGENT
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', border: `1.5px solid ${statusChip.border}`, padding: '2px 7px', background: statusChip.bg, color: statusChip.color }}>
            {statusChip.label}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        {/* Title block */}
        <h1 style={{ fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '-0.01em' }}>{wo.title}</h1>
        <p style={{ fontWeight: 700, color: t.ink, marginBottom: 2, fontSize: '0.9rem' }}>{wo.project.address}</p>
        <p style={{ color: t.muted, fontSize: '0.8rem', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '1.25rem' }}>{wo.project.name}</p>

        {/* Meta panel */}
        {(wo.contractor || wo.milestone || wo.scheduledDate || wo.dueDate) && (
          <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {wo.contractor && <MetaRow label="Assigned to" value={wo.contractor.name} />}
            {wo.milestone && <MetaRow label="Phase" value={wo.milestone.name} />}
            {wo.scheduledDate && <MetaRow label="Scheduled" value={format(new Date(wo.scheduledDate), 'EEEE, MMM d, yyyy')} />}
            {wo.dueDate && <MetaRow label="Due" value={format(new Date(wo.dueDate), 'EEEE, MMM d, yyyy')} />}
          </div>
        )}

        {/* Instructions */}
        {wo.instructions && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted, marginBottom: 8 }}>Instructions</p>
            <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '1rem 1.1rem' }}>
              {wo.instructions.split('\n').map((line, i) => (
                <p key={i} style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 4 }}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {wo.documents?.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted, marginBottom: 8 }}>
              Documents <span style={{ color: t.rust }}>({wo.documents.length})</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {wo.documents.map(({ document: doc }) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: t.card, border: `2px solid ${t.line}`, padding: '0.6rem 0.85rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '1px 5px', color: t.muted, textTransform: 'uppercase', flexShrink: 0 }}>DOC</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: '0.875rem' }}>{doc.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: t.muted, textTransform: 'uppercase' }}>{doc.kind}</span>
                  {doc.link
                    ? <a href={doc.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, color: t.blue, textDecoration: 'none', textTransform: 'uppercase' }}>Open ↗</a>
                    : <span style={{ fontFamily: 'monospace', fontSize: 10, color: t.sand, textTransform: 'uppercase' }}>No link</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {allPhotos.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted, marginBottom: 8 }}>
              Photos <span style={{ color: t.rust }}>({allPhotos.length})</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {allPhotos.map((p) => (
                <div key={p.id}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.caption || 'Work photo'} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', border: `2px solid ${t.line}` }} />
                  </a>
                  {p.caption && <p style={{ fontSize: '0.72rem', color: t.muted, textAlign: 'center', marginTop: 3 }}>{p.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action panel */}
        {!isComplete && (
          <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted, marginBottom: '0.9rem' }}>Update Status</p>

            {canStart && (
              <button
                style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: `2px solid ${t.blue}`, color: t.blue, fontSize: '0.875rem', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}
                onClick={handleStart}
              >
                I've started this job
              </button>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontWeight: 900, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Add Completion Photos</p>
              <p style={{ fontSize: '0.78rem', color: t.muted, marginBottom: '0.75rem' }}>Upload photos of your work before marking complete.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
              <button
                style={{ width: '100%', padding: '0.75rem', background: 'transparent', border: `2px dashed ${t.line}`, color: t.ink, fontSize: '0.875rem', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : uploadedPhotos.length > 0
                  ? `${uploadedPhotos.length} Photo${uploadedPhotos.length !== 1 ? 's' : ''} Added — Add More`
                  : 'Take or Upload a Photo'}
              </button>
            </div>

            <button
              style={{ width: '100%', padding: '0.9rem', background: t.rust, color: '#fff', border: `2px solid ${t.line}`, fontSize: '1rem', fontWeight: 900, cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.7 : 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              onClick={handleComplete}
              disabled={completing}
            >
              {completing ? 'Submitting…' : 'Mark Job Complete'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: t.muted, marginTop: '0.5rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>Your GC will be notified immediately.</p>
          </div>
        )}

        {isComplete && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#dfe9d4', border: `2px solid ${t.green}`, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <span style={{ width: 28, height: 28, background: t.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>✓</span>
            <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.875rem', color: t.green }}>Job Marked Complete</span>
          </div>
        )}

        <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: `1px solid ${t.sand}` }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: t.muted, marginBottom: 3, textTransform: 'uppercase' }}>Questions? Contact your GC directly.</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: t.muted, textTransform: 'uppercase' }}>This link expires 30 days from when the work order was sent.</p>
        </div>
      </main>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.muted, minWidth: 90 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
