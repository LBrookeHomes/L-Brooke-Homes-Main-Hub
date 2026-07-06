import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  scheduleApi,
  STATUSES,
  type Worker,
  type JobLocation,
  type WorkItem,
  type WorkItemInput,
  type Status,
} from '../../api/schedule'
import { t } from '../../theme'
import { inputStyle, labelStyle, btnPrimary, btnGhost } from './scheduleStyles'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  workers: Worker[]
  locations: JobLocation[]
  existing?: WorkItem
  onDone: () => void
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export default function WorkItemForm({ workers, locations, existing, onDone }: Props) {
  const qc = useQueryClient()
  const isEdit = !!existing

  const [jobDetails, setJobDetails] = useState(existing?.jobDetails ?? '')
  const [status, setStatus] = useState<Status>(existing?.status ?? 'Planning')
  const [timeline, setTimeline] = useState(existing?.timeline ?? '')
  const [jobDate, setJobDate] = useState(toDateInput(existing?.jobDate ?? null))
  const [day, setDay] = useState(existing?.day ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [materialRequired, setMaterialRequired] = useState(existing?.materialRequired ?? false)
  const [startTime, setStartTime] = useState(existing?.startTime ?? '')
  const [endTime, setEndTime] = useState(existing?.endTime ?? '')
  const [plannedHours, setPlannedHours] = useState(
    existing?.plannedHours != null ? String(existing.plannedHours) : ''
  )
  const [paymentStatus, setPaymentStatus] = useState(existing?.paymentStatus ?? '')
  const [purchasingItems, setPurchasingItems] = useState(existing?.purchasingItems ?? '')
  const [firstStop, setFirstStop] = useState(existing?.firstStop ?? false)
  const [endOfDay, setEndOfDay] = useState(existing?.endOfDay ?? false)
  const [workerIds, setWorkerIds] = useState<string[]>(existing?.workerIds ?? [])
  const [locationIds, setLocationIds] = useState<string[]>(existing?.locationIds ?? [])
  const [newLocation, setNewLocation] = useState('')

  const createLocationMut = useMutation({
    mutationFn: (name: string) => scheduleApi.createLocation(name),
    onSuccess: (loc) => {
      qc.invalidateQueries({ queryKey: ['schedule', 'locations'] })
      setLocationIds((prev) => [...prev, loc.id])
      setNewLocation('')
    },
  })

  const saveMut = useMutation({
    mutationFn: (data: WorkItemInput) =>
      isEdit
        ? scheduleApi.updateWorkItemFull(existing!.id, data)
        : scheduleApi.createWorkItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', 'work-items'] })
      onDone()
    },
  })

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobDetails.trim()) return
    const payload: WorkItemInput = {
      jobDetails: jobDetails.trim(),
      status,
      timeline: timeline || null,
      jobDate: jobDate || null,
      day: day || null,
      notes: notes || null,
      materialRequired,
      startTime: startTime || null,
      endTime: endTime || null,
      plannedHours: plannedHours ? Number(plannedHours) : null,
      paymentStatus: paymentStatus || null,
      purchasingItems: purchasingItems || null,
      firstStop,
      endOfDay,
      workerIds,
      locationIds,
    }
    saveMut.mutate(payload)
  }

  const chipStyle = (on: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    background: on ? t.rust : '#fff',
    border: `1.5px solid ${on ? t.rust : t.line}`,
    color: on ? '#fff' : t.ink,
  })

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <label style={labelStyle}>
        Job Details *
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
          value={jobDetails}
          onChange={(e) => setJobDetails(e.target.value)}
          required
          placeholder="What needs to happen"
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <label style={labelStyle}>
          Status
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Timeline
          <input style={inputStyle} value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 2 days" />
        </label>
        <label style={labelStyle}>
          Job Date
          <input style={inputStyle} type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
        </label>
        <label style={labelStyle}>
          Day
          <select style={inputStyle} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">—</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Start Time
          <input style={inputStyle} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label style={labelStyle}>
          End Time
          <input style={inputStyle} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label style={labelStyle}>
          Planned Hours
          <input style={inputStyle} type="number" step="0.5" min="0" value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} />
        </label>
        <label style={labelStyle}>
          Payment Status
          <input style={inputStyle} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} placeholder="e.g. Unpaid" />
        </label>
      </div>

      {/* Workers multi-select */}
      <div>
        <p style={{ ...labelStyle, marginBottom: 6 }}>Workers</p>
        {workers.length === 0 ? (
          <p style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>No workers yet — add some from the crew menu.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {workers.map((w) => (
              <button
                type="button"
                key={w.id}
                onClick={() => setWorkerIds(toggle(workerIds, w.id))}
                style={chipStyle(workerIds.includes(w.id))}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locations multi-select + inline create */}
      <div>
        <p style={{ ...labelStyle, marginBottom: 6 }}>Locations</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {locations.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => setLocationIds(toggle(locationIds, l.id))}
              style={chipStyle(locationIds.includes(l.id))}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Add a new location…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (newLocation.trim()) createLocationMut.mutate(newLocation.trim())
              }
            }}
          />
          <button
            type="button"
            onClick={() => newLocation.trim() && createLocationMut.mutate(newLocation.trim())}
            disabled={createLocationMut.isPending || !newLocation.trim()}
            style={{ ...btnGhost, padding: '6px 12px' }}
          >
            + Add
          </button>
        </div>
      </div>

      <label style={labelStyle}>
        Purchasing / Items
        <input style={inputStyle} value={purchasingItems} onChange={(e) => setPurchasingItems(e.target.value)} placeholder="Materials to buy" />
      </label>

      <label style={labelStyle}>
        Notes
        <textarea
          style={{ ...inputStyle, minHeight: 50, resize: 'vertical', fontFamily: 'inherit' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {/* Boolean flags */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        {([
          ['Material required', materialRequired, setMaterialRequired],
          ['First stop', firstStop, setFirstStop],
          ['End of day', endOfDay, setEndOfDay],
        ] as const).map(([lbl, val, setter]) => (
          <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: t.ink, textTransform: 'uppercase', letterSpacing: '0.03em', cursor: 'pointer' }}>
            <input type="checkbox" checked={val} onChange={(e) => setter(e.target.checked)} />
            {lbl}
          </label>
        ))}
      </div>

      {saveMut.isError && (
        <p style={{ fontSize: '0.82rem', color: t.red, fontFamily: 'monospace' }}>
          {(saveMut.error as Error).message || 'Save failed. Please try again.'}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={onDone} style={{ ...btnGhost, padding: '0.5rem 1rem' }}>Cancel</button>
        <button type="submit" disabled={saveMut.isPending} style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }}>
          {saveMut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Work Item'}
        </button>
      </div>
    </form>
  )
}
