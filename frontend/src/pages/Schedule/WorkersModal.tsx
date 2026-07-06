import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Modal from '../../components/Modal'
import { scheduleApi, type Worker } from '../../api/schedule'
import { t } from '../../theme'
import { inputStyle, labelStyle, btnPrimary } from './scheduleStyles'

interface Props {
  workers: Worker[]
  onClose: () => void
}

export default function WorkersModal({ workers, onClose }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string }) => scheduleApi.createWorker(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', 'workers'] })
      setName(''); setPhone(''); setEmail('')
    },
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => scheduleApi.deleteWorker(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', 'workers'] })
      setRemoveConfirm(null)
    },
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMut.mutate({ name: name.trim(), phone: phone || undefined, email: email || undefined })
  }

  return (
    <Modal title="Crew / Workers" onClose={onClose} maxWidth={520}>
      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={labelStyle}>Name *
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Worker name" />
          </label>
          <label style={labelStyle}>Phone
            <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </label>
        </div>
        <label style={labelStyle}>Email
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={createMut.isPending} style={{ ...btnPrimary, opacity: createMut.isPending ? 0.7 : 1 }}>
            {createMut.isPending ? 'Adding…' : '+ Add Worker'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {workers.length === 0 && <p style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>No workers yet.</p>}
        {workers.map((w) => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: `1.5px solid ${t.line}`, background: '#fff' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{w.name}</span>
              <div style={{ display: 'flex', gap: 12, fontFamily: 'monospace', fontSize: 11, color: t.muted }}>
                {w.phone && <span>{w.phone}</span>}
                {w.email && <span>{w.email}</span>}
              </div>
            </div>
            {removeConfirm === w.id ? (
              <>
                <button onClick={() => removeMut.mutate(w.id)} disabled={removeMut.isPending} style={{ background: t.red, border: `1.5px solid ${t.red}`, color: '#fff', padding: '3px 9px', cursor: 'pointer', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>Remove</button>
                <button onClick={() => setRemoveConfirm(null)} style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '3px 7px', cursor: 'pointer', fontSize: 10, fontWeight: 800 }}>×</button>
              </>
            ) : (
              <button onClick={() => setRemoveConfirm(w.id)} style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '3px 9px', cursor: 'pointer', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
