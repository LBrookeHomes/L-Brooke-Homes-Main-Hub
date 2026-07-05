import { useState, FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { decisionsApi } from '../../api/decisions'
import type { Decision, DecisionPriority } from '@weebrook/shared/types'
import { t } from '../../theme'

interface Props {
  decision: Decision
  onClose: () => void
  onSaved: () => void
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  border: `1.5px solid ${t.line}`,
  fontSize: '0.9rem',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: '0.75rem', fontWeight: 900, color: t.muted,
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace',
}

export default function EditDecisionForm({ decision, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(decision.title)
  const [description, setDescription] = useState(decision.description ?? '')
  const [room, setRoom] = useState(decision.room ?? '')
  const [priority, setPriority] = useState<DecisionPriority>(decision.priority)
  const [allowance, setAllowance] = useState(decision.allowance != null ? String(decision.allowance) : '')
  const [dueDate, setDueDate] = useState(decision.dueDate ? decision.dueDate.slice(0, 10) : '')

  const updateMut = useMutation({
    mutationFn: (data: Partial<Decision>) => decisionsApi.update(decision.id, data),
    onSuccess: onSaved,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    updateMut.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      room: room.trim() || undefined,
      priority,
      allowance: allowance ? parseFloat(allowance) : undefined,
      dueDate: dueDate || undefined,
    } as any)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={labelStyle}>Title *
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label style={labelStyle}>Room / Area
        <input style={inputStyle} value={room} placeholder="e.g. Kitchen, Primary Bath" onChange={(e) => setRoom(e.target.value)} />
      </label>
      <label style={labelStyle}>Description
        <textarea style={{ ...inputStyle, height: 72, resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' }}>
        <label style={labelStyle}>Priority
          <select style={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value as DecisionPriority)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label style={labelStyle}>Due Date
          <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <label style={labelStyle}>Allowance (budget)
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '0.6rem', color: t.muted, fontSize: '0.9rem', pointerEvents: 'none', fontFamily: 'sans-serif' }}>$</span>
          <input
            style={{ ...inputStyle, paddingLeft: '1.5rem' }}
            type="number" min="0" step="100" placeholder="0"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
          />
        </div>
      </label>

      {updateMut.isError && (
        <p style={{ fontSize: '0.82rem', color: t.red, fontFamily: 'monospace' }}>Save failed. Please try again.</p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 4 }}>
        <button
          type="button" onClick={onClose}
          style={{ padding: '0.5rem 1rem', border: `2px solid ${t.line}`, background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >Cancel</button>
        <button
          type="submit" disabled={updateMut.isPending}
          style={{ padding: '0.5rem 1.1rem', background: t.rust, color: '#fff', border: `2px solid ${t.rust}`, cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: updateMut.isPending ? 0.7 : 1 }}
        >
          {updateMut.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
