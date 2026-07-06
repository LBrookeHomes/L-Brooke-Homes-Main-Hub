import { useState } from 'react'
import { type WorkItem } from '../../api/schedule'
import { t } from '../../theme'
import { statusChip } from './scheduleStyles'

interface Props {
  items: WorkItem[]
  onSelect: (item: WorkItem) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TeamScheduleCalendar({ items, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayYmd = ymd(new Date())

  const byDate = new Map<string, WorkItem[]>()
  for (const it of items) {
    if (!it.jobDate) continue
    const key = it.jobDate.slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(it)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const navBtn: React.CSSProperties = {
    background: 'transparent', border: `1.5px solid ${t.line}`, color: t.ink,
    padding: '4px 12px', cursor: 'pointer', fontWeight: 900, fontSize: 14,
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button style={navBtn} onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <span style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button style={navBtn} onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 10, fontWeight: 900, color: t.muted, textTransform: 'uppercase', padding: '4px 0' }}>{w}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} />
          const key = ymd(new Date(year, month, day))
          const dayItems = byDate.get(key) ?? []
          const isToday = key === todayYmd
          return (
            <div key={key} style={{ minHeight: 84, background: '#fff', border: `2px solid ${isToday ? t.rust : t.line}`, padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: isToday ? t.rust : t.muted }}>{day}</span>
              {dayItems.slice(0, 4).map((it) => {
                const chip = statusChip(it.status)
                return (
                  <button
                    key={it.id}
                    onClick={() => onSelect(it)}
                    title={it.jobDetails}
                    style={{ textAlign: 'left', background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, padding: '2px 4px', cursor: 'pointer', fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {it.startTime ? `${it.startTime} ` : ''}{it.jobDetails}
                  </button>
                )
              })}
              {dayItems.length > 4 && (
                <span style={{ fontSize: 9, color: t.muted, fontFamily: 'monospace' }}>+{dayItems.length - 4} more</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
