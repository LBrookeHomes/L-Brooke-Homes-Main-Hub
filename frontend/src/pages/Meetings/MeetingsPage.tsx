import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meetingsApi, type FollowUp, type UpcomingFollowUp } from '../../api/meetings'
import GCLayout from '../../components/GCLayout/GCLayout'
import { useIsMobile } from '../../hooks/useIsMobile'
import { t } from '../../theme'

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem', border: `1.5px solid ${t.line}`, fontSize: '0.875rem',
  background: '#fff', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', fontWeight: 900,
  color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const btnPrimary: React.CSSProperties = {
  background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '9px 14px',
  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const btnGhost: React.CSSProperties = {
  background: 'transparent', border: `2px solid ${t.line}`, color: t.ink, padding: '9px 14px',
  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const sectionLabel: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: t.muted, marginBottom: 8,
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function fmtDate(iso: string | null): string {
  if (!iso) return 'No due date'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function dueClass(iso: string | null): 'overdue' | 'today' | 'future' | 'none' {
  if (!iso) return 'none'
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  const now = todayStart()
  if (due < now) return 'overdue'
  if (due.getTime() === now.getTime()) return 'today'
  return 'future'
}
function dueColor(c: ReturnType<typeof dueClass>) {
  if (c === 'overdue') return t.red
  if (c === 'today') return t.amber
  return t.muted
}

export default function MeetingsPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [link, setLink] = useState('')
  const [text, setText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: meetingsApi.list })
  const { data: upcoming = [] } = useQuery({ queryKey: ['meetings', 'upcoming'], queryFn: meetingsApi.upcoming })
  const { data: selected } = useQuery({
    queryKey: ['meetings', selectedId],
    queryFn: () => meetingsApi.get(selectedId!),
    enabled: !!selectedId,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['meetings'] })
  }

  const analyzeMut = useMutation({
    mutationFn: () => meetingsApi.analyze({ link: link || undefined, text: text || undefined }),
    onSuccess: (m) => {
      setLink(''); setText('')
      setSelectedId(m.id)
      invalidateAll()
    },
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => meetingsApi.remove(id),
    onSuccess: (_r, id) => {
      if (selectedId === id) setSelectedId(null)
      invalidateAll()
    },
  })

  const digestMut = useMutation({
    mutationFn: () => meetingsApi.runDigest(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const followUpMut = useMutation({
    mutationFn: ({ mid, fid, patch }: { mid: string; fid: string; patch: Parameters<typeof meetingsApi.updateFollowUp>[2] }) =>
      meetingsApi.updateFollowUp(mid, fid, patch),
    onSuccess: () => invalidateAll(),
  })

  const canAnalyze = (!!link.trim() || !!text.trim()) && !analyzeMut.isPending

  return (
    <GCLayout>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Meetings</h1>
          <p style={{ fontSize: 13, color: t.muted }}>Paste a meeting — get a brief, decisions, and follow-ups you won't forget</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 20, alignItems: 'start' }}>
          {/* ── Main column ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            {/* New meeting */}
            <div style={{ background: t.card, border: `2px solid ${t.line}` }}>
              <div style={{ background: t.ink, padding: '10px 16px' }}>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>New Meeting</p>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={labelStyle}>Granola link
                  <input style={inputStyle} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://notes.granola.ai/…" />
                </label>
                <label style={labelStyle}>Or paste transcript
                  <textarea
                    style={{ ...inputStyle, minHeight: 120, resize: 'vertical', fontFamily: 'inherit' }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the meeting transcript or notes here…"
                  />
                </label>
                {analyzeMut.isError && (
                  <p style={{ fontSize: '0.82rem', color: t.red, fontFamily: 'monospace', margin: 0 }}>
                    {(analyzeMut.error as Error).message}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => analyzeMut.mutate()} disabled={!canAnalyze} style={{ ...btnPrimary, opacity: canAnalyze ? 1 : 0.5 }}>
                    {analyzeMut.isPending ? 'Analyzing…' : 'Analyze'}
                  </button>
                  {analyzeMut.isPending && (
                    <span style={{ fontSize: 12, color: t.muted, fontStyle: 'italic' }}>Reading meeting and writing summary…</span>
                  )}
                </div>
              </div>
            </div>

            {/* Meeting brief */}
            {selected && (
              <div style={{ background: t.card, border: `2px solid ${t.line}` }}>
                <div style={{ background: t.ink, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{selected.title}</p>
                  <button onClick={() => removeMut.mutate(selected.id)} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', padding: '3px 9px', cursor: 'pointer', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Delete</button>
                </div>
                <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {selected.summary && (
                    <div>
                      <p style={sectionLabel}>Summary</p>
                      <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: t.ink }}>{selected.summary}</p>
                    </div>
                  )}
                  {selected.decisions && (
                    <div>
                      <p style={sectionLabel}>Key Decisions &amp; Risks</p>
                      <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: t.ink }}>{selected.decisions}</p>
                    </div>
                  )}
                  <div>
                    <p style={sectionLabel}>Follow-Up Tasks ({selected.followUps.length})</p>
                    {selected.followUps.length === 0 ? (
                      <p style={{ fontSize: 13, color: t.muted, fontStyle: 'italic' }}>No follow-ups from this meeting.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selected.followUps.map((f) => (
                          <FollowUpItem
                            key={f.id}
                            f={f}
                            onPatch={(patch) => followUpMut.mutate({ mid: selected.id, fid: f.id, patch })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Previous meetings */}
            <div>
              <p style={sectionLabel}>Previous Meetings</p>
              {meetings.length === 0 ? (
                <div style={{ border: `2px dashed ${t.sand}`, padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: t.muted }}>No meetings yet. Paste one above to get started.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {meetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      style={{
                        textAlign: 'left', background: selectedId === m.id ? t.paper : '#fff',
                        border: `2px solid ${selectedId === m.id ? t.rust : t.line}`, padding: '10px 14px', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{m.title}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: t.muted, whiteSpace: 'nowrap' }}>
                        {m.followUpCount} follow-up{m.followUpCount === 1 ? '' : 's'} · {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Follow-ups due panel ─────────────────────── */}
          <div style={{ background: t.card, border: `2px solid ${t.line}`, position: isMobile ? 'static' : 'sticky', top: 20 }}>
            <div style={{ background: t.ink, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Follow-ups Due</p>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{upcoming.length}</span>
            </div>
            <div style={{ padding: '0.75rem' }}>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: 13, color: t.muted, fontStyle: 'italic', padding: '0.5rem' }}>Nothing outstanding. 🎉</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {upcoming.map((f) => (
                    <UpcomingItem
                      key={f.id}
                      f={f}
                      onOpen={() => setSelectedId(f.meeting.id)}
                      onDone={() => followUpMut.mutate({ mid: f.meeting.id, fid: f.id, patch: { status: 'done' } })}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => digestMut.mutate()}
                disabled={digestMut.isPending}
                style={{ ...btnGhost, width: '100%', marginTop: 10, padding: '7px 0', fontSize: 11 }}
              >
                {digestMut.isPending ? 'Sending…' : digestMut.isSuccess ? (digestMut.data?.sent ? 'Digest sent ✓' : (digestMut.data?.reason || 'Nothing due')) : 'Email me a digest'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </GCLayout>
  )
}

// ── Follow-up item in the meeting brief (Done / reschedule / edit) ───
function FollowUpItem({ f, onPatch }: { f: FollowUp; onPatch: (p: Parameters<typeof meetingsApi.updateFollowUp>[2]) => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(f.title)
  const [details, setDetails] = useState(f.details ?? '')
  const done = f.status === 'done'
  const c = dueClass(f.dueDate)

  return (
    <div style={{ border: `1.5px solid ${t.line}`, background: '#fff', padding: '10px 12px', opacity: done ? 0.55 : 1 }}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={inputStyle} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Cancel</button>
            <button onClick={() => { onPatch({ title, details }); setEditing(false) }} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>Save</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 14, textDecoration: done ? 'line-through' : 'none' }}>{f.title}</p>
            {f.details && <p style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>{f.details}</p>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: dueColor(c), textTransform: 'uppercase' }}>
                {c === 'overdue' ? '⚠ ' : ''}{fmtDate(f.dueDate)}
              </span>
              <input
                type="date"
                value={f.dueDate ? f.dueDate.slice(0, 10) : ''}
                onChange={(e) => onPatch({ dueDate: e.target.value || null })}
                style={{ border: `1px solid ${t.line}`, fontSize: 11, padding: '2px 4px', fontFamily: 'monospace', background: '#fff' }}
                title="Reschedule"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onPatch({ status: done ? 'open' : 'done' })}
              style={{ background: done ? 'transparent' : t.green, border: `1.5px solid ${t.green}`, color: done ? t.green : '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}
            >{done ? 'Reopen' : 'Done'}</button>
            {!done && (
              <button onClick={() => { setTitle(f.title); setDetails(f.details ?? ''); setEditing(true) }} style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Edit</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Compact item in the "Follow-ups due" side panel ──────────────────
function UpcomingItem({ f, onOpen, onDone }: { f: UpcomingFollowUp; onOpen: () => void; onDone: () => void }) {
  const c = dueClass(f.dueDate)
  const border = c === 'overdue' ? t.red : c === 'today' ? t.amber : t.line
  return (
    <div style={{ border: `1.5px solid ${border}`, borderLeft: `4px solid ${border}`, background: '#fff', padding: '8px 10px' }}>
      <button onClick={onOpen} style={{ display: 'block', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}>
        <p style={{ fontWeight: 800, fontSize: 13 }}>{f.title}</p>
        <p style={{ fontFamily: 'monospace', fontSize: 10, color: dueColor(c), textTransform: 'uppercase', marginTop: 3, fontWeight: 800 }}>
          {c === 'overdue' ? '⚠ Overdue · ' : c === 'today' ? 'Today · ' : ''}{fmtDate(f.dueDate)}
        </p>
        <p style={{ fontSize: 11, color: t.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.meeting.title}</p>
      </button>
      <button onClick={onDone} style={{ marginTop: 6, background: t.green, border: `1.5px solid ${t.green}`, color: '#fff', padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Done</button>
    </div>
  )
}
