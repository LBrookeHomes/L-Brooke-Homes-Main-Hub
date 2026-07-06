import { useState } from 'react'
import { type WorkItem } from '../../api/schedule'
import { t } from '../../theme'
import { statusChip, btnGhost } from './scheduleStyles'

interface Props {
  items: WorkItem[]
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // week starts Monday
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WeeklyPreview({ items }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [copied, setCopied] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const byDate = new Map<string, WorkItem[]>()
  for (const it of items) {
    if (!it.jobDate) continue
    const key = it.jobDate.slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(it)
  }

  function buildText(): string {
    const range = `Week of ${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    const blocks = days.map((d) => {
      const dayItems = (byDate.get(ymd(d)) ?? []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      const heading = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
      if (dayItems.length === 0) return `${heading}\n  —`
      const lines = dayItems.map((i) => {
        const time = i.startTime ? `${i.startTime} ` : ''
        const who = i.workerNames.length ? ` [${i.workerNames.join(', ')}]` : ''
        const loc = i.locationNames.length ? ` @ ${i.locationNames.join(', ')}` : ''
        return `  • ${time}${i.jobDetails}${loc}${who}`
      })
      return `${heading}\n${lines.join('\n')}`
    })
    return `${range}\n\n${blocks.join('\n\n')}`
  }

  async function copy() {
    await navigator.clipboard.writeText(buildText())
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const navBtn: React.CSSProperties = {
    background: 'transparent', border: `1.5px solid ${t.line}`, color: t.ink,
    padding: '4px 12px', cursor: 'pointer', fontWeight: 900, fontSize: 14,
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={navBtn} onClick={() => shiftWeek(-1)}>‹</button>
          <span style={{ fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Week of {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <button style={navBtn} onClick={() => shiftWeek(1)}>›</button>
        </div>
        <button style={{ ...btnGhost, padding: '6px 12px' }} onClick={copy}>{copied ? 'Copied!' : 'Copy Week'}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {days.map((d) => {
          const dayItems = (byDate.get(ymd(d)) ?? []).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
          const isToday = ymd(d) === ymd(new Date())
          return (
            <div key={ymd(d)} style={{ background: '#fff', border: `2px solid ${isToday ? t.rust : t.line}` }}>
              <div style={{ background: isToday ? t.rust : t.sand, padding: '5px 12px' }}>
                <span style={{ fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: isToday ? '#fff' : t.ink }}>
                  {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={{ padding: '8px 12px' }}>
                {dayItems.length === 0 ? (
                  <span style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>No jobs</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {dayItems.map((i) => {
                      const chip = statusChip(i.status)
                      return (
                        <div key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 13 }}>
                          {i.startTime && <span style={{ fontFamily: 'monospace', fontSize: 11, color: t.muted }}>{i.startTime}</span>}
                          <span style={{ fontWeight: 700 }}>{i.jobDetails}</span>
                          {i.locationNames.length > 0 && <span style={{ fontSize: 12, color: t.muted }}>@ {i.locationNames.join(', ')}</span>}
                          {i.workerNames.length > 0 && <span style={{ fontSize: 11, color: t.muted, fontStyle: 'italic' }}>{i.workerNames.join(', ')}</span>}
                          <span style={{ fontFamily: 'monospace', fontSize: 9, background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, padding: '1px 5px', textTransform: 'uppercase' }}>{i.status}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
