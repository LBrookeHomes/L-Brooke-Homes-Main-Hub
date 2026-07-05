import { useState, FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { decisionsApi } from '../../api/decisions'
import type { Milestone, DecisionType, DecisionPriority } from '@weebrook/shared/types'

interface Props {
  projectId: string
  milestones: Milestone[]
  onClose: () => void
  onCreated: () => void
}

interface OptionDraft {
  label: string
  description: string
  price: string
  vendorUrl: string
}

export default function NewDecisionForm({ projectId, milestones, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [room, setRoom] = useState('')
  const [type, setType] = useState<DecisionType>('structured')
  const [priority, setPriority] = useState<DecisionPriority>('normal')
  const [milestoneId, setMilestoneId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [allowance, setAllowance] = useState('')
  const [options, setOptions] = useState<OptionDraft[]>([
    { label: '', description: '', price: '', vendorUrl: '' },
    { label: '', description: '', price: '', vendorUrl: '' },
  ])

  const createMut = useMutation({
    mutationFn: decisionsApi.create,
    onSuccess: onCreated,
  })

  function updateOption(i: number, field: keyof OptionDraft, value: string) {
    setOptions(options.map((o, j) => j === i ? { ...o, [field]: value } : o))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validOptions = type === 'structured'
      ? options
          .filter((o) => o.label.trim())
          .map((o) => ({
            label: o.label,
            description: o.description || undefined,
            price: o.price ? parseFloat(o.price) : undefined,
            vendorUrl: o.vendorUrl || undefined,
          }))
      : []
    createMut.mutate({
      projectId,
      milestoneId: milestoneId || undefined,
      title,
      description: description || undefined,
      room: room || undefined,
      type,
      priority,
      dueDate: dueDate || undefined,
      allowance: allowance ? parseFloat(allowance) : undefined,
      options: validOptions.length ? validOptions : undefined,
    } as any)
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label}>Title *
        <input style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label style={styles.label}>Room / Area
        <input style={styles.input} value={room} placeholder="e.g. Kitchen, Primary Bath, Exterior" onChange={(e) => setRoom(e.target.value)} />
      </label>
      <label style={styles.label}>Description
        <textarea style={{ ...styles.input, height: 60 }} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div style={styles.row}>
        <label style={styles.label}>Type
          <select style={styles.input} value={type} onChange={(e) => setType(e.target.value as DecisionType)}>
            <option value="structured">Structured (option cards)</option>
            <option value="freeform">Free-form (thread)</option>
          </select>
        </label>
        <label style={styles.label}>Priority
          <select style={styles.input} value={priority} onChange={(e) => setPriority(e.target.value as DecisionPriority)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>Phase
          <select style={styles.input} value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
            <option value="">No phase</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label style={styles.label}>Due date
          <input style={styles.input} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <label style={styles.label}>Allowance (budget)
        <div style={styles.dollarWrap}>
          <span style={styles.dollarSign}>$</span>
          <input
            style={{ ...styles.input, paddingLeft: '1.5rem' }}
            type="number"
            min="0"
            step="100"
            placeholder="0"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
          />
        </div>
      </label>

      {type === 'structured' && (
        <div>
          <p style={styles.optionsLabel}>Options</p>
          {options.map((opt, i) => (
            <div key={i} style={styles.optionBlock}>
              <div style={styles.optionTopRow}>
                <input
                  style={{ ...styles.input, flex: 2 }}
                  placeholder={`Option ${i + 1} label *`}
                  value={opt.label}
                  onChange={(e) => updateOption(i, 'label', e.target.value)}
                />
                <div style={styles.dollarWrap}>
                  <span style={styles.dollarSign}>$</span>
                  <input
                    style={{ ...styles.input, paddingLeft: '1.5rem', width: 90 }}
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Price"
                    value={opt.price}
                    onChange={(e) => updateOption(i, 'price', e.target.value)}
                  />
                </div>
              </div>
              <div style={styles.optionBottomRow}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="Description (optional)"
                  value={opt.description}
                  onChange={(e) => updateOption(i, 'description', e.target.value)}
                />
                <input
                  style={{ ...styles.input, flex: 1 }}
                  placeholder="Vendor URL (optional)"
                  value={opt.vendorUrl}
                  onChange={(e) => updateOption(i, 'vendorUrl', e.target.value)}
                />
              </div>
            </div>
          ))}
          {options.length < 4 && (
            <button type="button" style={styles.addOption}
              onClick={() => setOptions([...options, { label: '', description: '', price: '', vendorUrl: '' }])}>
              + Add option
            </button>
          )}
        </div>
      )}

      <div style={styles.actions}>
        <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
        <button type="submit" style={styles.submitBtn} disabled={createMut.isPending}>
          {createMut.isPending ? 'Creating…' : 'Create Decision'}
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
  dollarWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  dollarSign: { position: 'absolute', left: '0.6rem', color: '#9ca3af', fontSize: '0.9rem', pointerEvents: 'none' },
  optionsLabel: { fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8 },
  optionBlock: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: '0.65rem 0.75rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  optionTopRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  optionBottomRow: { display: 'flex', gap: '0.5rem' },
  addOption: { background: 'none', border: '1px dashed #d1d5db', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280', marginTop: 4 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 4 },
  cancelBtn: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: 7, cursor: 'pointer', background: '#fff' },
  submitBtn: { padding: '0.5rem 1.1rem', background: '#1a5c38', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 },
}
