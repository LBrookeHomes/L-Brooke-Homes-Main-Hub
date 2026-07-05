import { useState, FormEvent } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { projectsApi, ProjectWithMeta } from '../../api/projects'
import { api } from '../../api/client'
import type { Client } from '@weebrook/shared/types'
import Modal from '../../components/Modal'
import { t } from '../../theme'

const ROOM_OPTIONS = [
  { id: 'kitchen',  label: 'Kitchen',          icon: '🍳' },
  { id: 'bathroom', label: 'Bathroom',         icon: '🚿' },
  { id: 'bedroom',  label: 'Bedroom',          icon: '🛏' },
  { id: 'living',   label: 'Living Room',      icon: '🛋' },
  { id: 'exterior', label: 'Exterior / Siding',icon: '🏠' },
  { id: 'deck',     label: 'Deck / Patio',     icon: '🪵' },
  { id: 'garage',   label: 'Garage',           icon: '🚗' },
]

interface Props {
  onClose: () => void
  onCreated: (project: ProjectWithMeta) => void
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [templateType, setTemplateType] = useState<'bath-kitchen' | 'custom' | ''>('bath-kitchen')
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [error, setError] = useState('')

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients'),
  })

  const createMut = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: onCreated,
    onError: (err: any) => setError(err.message),
  })

  function handleStep1(e: FormEvent) {
    e.preventDefault()
    if (!clientId) { setError('Select a client'); return }
    setError('')
    if (templateType === 'custom') {
      setStep(2)
    } else {
      submitProject()
    }
  }

  function submitProject(rooms?: string[]) {
    createMut.mutate({
      name, address, clientId,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
      templateType: templateType || undefined,
      rooms,
    })
  }

  function toggleRoom(id: string) {
    setSelectedRooms((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.55rem 0.75rem',
    border: `1.5px solid ${t.line}`,
    fontSize: '0.9rem',
    background: '#fff',
    outline: 'none',
    width: '100%',
  }
  const labelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    fontSize: '0.78rem', fontWeight: 800, color: t.muted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  return (
    <Modal title={step === 1 ? 'New Project' : 'Select Rooms'} onClose={onClose}>
      {step === 1 ? (
        <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <label style={labelStyle}>Project name
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label style={labelStyle}>Address
            <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          <label style={labelStyle}>Client
            <select style={inputStyle} value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Template
            <select style={inputStyle} value={templateType} onChange={(e) => setTemplateType(e.target.value as any)}>
              <option value="bath-kitchen">Bath + Kitchen Renovation</option>
              <option value="custom">Custom — pick rooms</option>
              <option value="">Blank (no template)</option>
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={labelStyle}>Start date
              <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label style={labelStyle}>Target completion
              <input style={inputStyle} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </label>
          </div>
          {error && <p style={{ color: t.red, fontSize: '0.82rem' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '0.55rem 1rem', border: `2px solid ${t.line}`, cursor: 'pointer', background: 'transparent', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase' }}>Cancel</button>
            <button type="submit" style={{ padding: '0.55rem 1.1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase' }} disabled={createMut.isPending}>
              {templateType === 'custom' ? 'Next: Pick rooms →' : (createMut.isPending ? 'Creating…' : 'Create Project')}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <p style={{ fontSize: '0.85rem', color: t.muted }}>Select the rooms in this project. A milestone + decision scaffold will be created for each.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {ROOM_OPTIONS.map((room) => {
              const active = selectedRooms.includes(room.id)
              return (
                <button
                  key={room.id}
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    border: active ? `2px solid ${t.rust}` : `2px solid ${t.line}`,
                    background: active ? '#f2d2ca' : '#fff',
                    cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left',
                  }}
                  onClick={() => toggleRoom(room.id)}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{room.icon}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{room.label}</span>
                  {active && <span style={{ color: t.rust, fontWeight: 800, fontSize: '0.9rem' }}>✓</span>}
                </button>
              )
            })}
          </div>
          {selectedRooms.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: t.muted, textAlign: 'center', fontFamily: 'monospace' }}>Select at least one room to continue.</p>
          )}
          {error && <p style={{ color: t.red, fontSize: '0.82rem' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 4 }}>
            <button type="button" onClick={() => setStep(1)} style={{ padding: '0.55rem 1rem', border: `2px solid ${t.line}`, cursor: 'pointer', background: 'transparent', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase' }}>← Back</button>
            <button
              type="button"
              style={{ padding: '0.55rem 1.1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase' }}
              disabled={selectedRooms.length === 0 || createMut.isPending}
              onClick={() => submitProject(selectedRooms)}
            >
              {createMut.isPending ? 'Creating…' : `Create Project (${selectedRooms.length} room${selectedRooms.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
