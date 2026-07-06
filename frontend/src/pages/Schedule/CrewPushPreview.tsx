import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { scheduleApi, type Worker, type WorkItem } from '../../api/schedule'
import { t } from '../../theme'
import { inputStyle, labelStyle, btnPrimary, btnGhost } from './scheduleStyles'

interface Props {
  workers: Worker[]
  items: WorkItem[]
}

function sameDay(iso: string | null, ymd: string): boolean {
  if (!iso) return false
  return iso.slice(0, 10) === ymd
}

function buildMessage(worker: Worker, items: WorkItem[], ymd: string): string {
  const dayItems = items
    .filter((i) => i.workerIds.includes(worker.id) && sameDay(i.jobDate, ymd))
    .sort((a, b) => {
      if (a.firstStop && !b.firstStop) return -1
      if (!a.firstStop && b.firstStop) return 1
      return (a.startTime || '').localeCompare(b.startTime || '')
    })

  const date = new Date(ymd + 'T00:00:00')
  const header = `Schedule for ${date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`
  if (dayItems.length === 0) return `${header}\n\nNo jobs scheduled.`

  const lines = dayItems.map((i) => {
    const time = i.startTime ? `${i.startTime}${i.endTime ? `–${i.endTime}` : ''} ` : ''
    const loc = i.locationNames.length ? ` @ ${i.locationNames.join(', ')}` : ''
    const flag = i.firstStop ? ' (1st stop)' : i.endOfDay ? ' (end of day)' : ''
    return `• ${time}${i.jobDetails}${loc}${flag}`
  })
  return `Hi ${worker.name},\n${header}:\n\n${lines.join('\n')}`
}

export default function CrewPushPreview({ workers, items }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)

  const sendMut = useMutation({
    mutationFn: ({ workerId, message }: { workerId: string; message: string }) =>
      scheduleApi.sendCrewPush(workerId, message),
    onSuccess: (_r, vars) => {
      setSentId(vars.workerId)
      setTimeout(() => setSentId(null), 2500)
    },
  })

  const messages = useMemo(
    () => workers.map((w) => ({ worker: w, message: buildMessage(w, items, date) })),
    [workers, items, date]
  )

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div>
      <label style={{ ...labelStyle, maxWidth: 200, marginBottom: 16 }}>
        Schedule date
        <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      {workers.length === 0 && (
        <p style={{ fontSize: 13, color: t.muted, fontStyle: 'italic' }}>No workers yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(({ worker, message }) => (
          <div key={worker.id} style={{ background: t.card, border: `2px solid ${t.line}` }}>
            <div style={{ background: t.ink, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {worker.name}
                {!worker.phone && <span style={{ color: t.amber, fontFamily: 'monospace', fontSize: 10, marginLeft: 8 }}>NO PHONE</span>}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => copy(worker.id, message)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11, borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
                  {copiedId === worker.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => sendMut.mutate({ workerId: worker.id, message })}
                  disabled={!worker.phone || sendMut.isPending}
                  style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11, opacity: !worker.phone ? 0.5 : 1 }}
                >
                  {sentId === worker.id ? 'Sent ✓' : sendMut.isPending && sendMut.variables?.workerId === worker.id ? 'Sending…' : 'Send SMS'}
                </button>
              </div>
            </div>
            <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: t.ink, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message}</pre>
          </div>
        ))}
      </div>
      {sendMut.isError && (
        <p style={{ fontSize: 12, color: t.red, fontFamily: 'monospace', marginTop: 8 }}>{(sendMut.error as Error).message}</p>
      )}
    </div>
  )
}
