import { STATUSES, type Worker, type JobLocation, type Status } from '../../api/schedule'
import { t } from '../../theme'
import { inputStyle, labelStyle } from './scheduleStyles'

export interface Filters {
  workerId: string
  locationId: string
  status: Status | ''
  date: string
}

export const EMPTY_FILTERS: Filters = { workerId: '', locationId: '', status: '', date: '' }

interface Props {
  workers: Worker[]
  locations: JobLocation[]
  filters: Filters
  onChange: (f: Filters) => void
}

export default function FilterBar({ workers, locations, filters, onChange }: Props) {
  const active = filters.workerId || filters.locationId || filters.status || filters.date

  return (
    <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <label style={labelStyle}>
          Worker
          <select style={inputStyle} value={filters.workerId} onChange={(e) => onChange({ ...filters, workerId: e.target.value })}>
            <option value="">All workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Location
          <select style={inputStyle} value={filters.locationId} onChange={(e) => onChange({ ...filters, locationId: e.target.value })}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Status
          <select style={inputStyle} value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value as Status | '' })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Date
          <input style={inputStyle} type="date" value={filters.date} onChange={(e) => onChange({ ...filters, date: e.target.value })} />
        </label>
      </div>
      {active && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          style={{ marginTop: 10, background: 'transparent', border: 'none', color: t.rust, cursor: 'pointer', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', padding: 0 }}
        >
          × Clear filters
        </button>
      )}
    </div>
  )
}
