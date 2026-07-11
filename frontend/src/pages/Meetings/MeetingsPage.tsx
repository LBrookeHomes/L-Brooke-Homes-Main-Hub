import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meetingsApi, STAGES, STAGE_LABELS, type FollowUp, type Stage } from '../../api/meetings'
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
const btnSmall: React.CSSProperties = {
  background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px',
  cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
}
const sectionLabel: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: t.muted, marginBottom: 8,
}
const stageHeader: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: t.rust, marginBottom: 6, marginTop: 4,
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'No due date'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function dueClass(iso: string | null): 'overdue' | 'today' | 'future' | 'none' {
  if (!iso) return 'none'
  const due = new Date(iso); due.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  if (due < now) return 'overdue'
  if (due.getTime() === now.getTime()) return 'today'
  return 'future'
}
function dueColor(c: ReturnType<typeof dueClass>) {
  if (c === 'overdue') return t.red
  if (c === 'today') return t.amber
  return t.muted
}
function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Tags are free-text (AI-inferred trade/decision labels), so colors are
// assigned deterministically from a fixed palette rather than a lookup
// table — same bordered-chip look as the trade/status pills elsewhere in
// the hub (see ContractorsRoster's tradeChip).
const TAG_PALETTE = [t.blue, t.green, t.amber, t.rust, t.muted] as const
function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_PALETTE[hash % TAG_PALETTE.length]
}

type FollowUpPatch = Parameters<typeof meetingsApi.updateFollowUp>[2]

export default function MeetingsPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [link, setLink] = useState('')
  const [text, setText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: meetingsApi.list })
  const { data: selected } = useQuery({
    queryKey: ['meetings', selectedId],
    queryFn: () => meetingsApi.get(selectedId!),
    enabled: !!selectedId,
  })

  const invalidateAll = () => qc.invalidateQueries({ queryKey: ['meetings'] })

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
    mutationFn: ({ mid, fid, patch }: { mid: string; fid: string; patch: FollowUpPatch }) =>
      meetingsApi.updateFollowUp(mid, fid, patch),
    onSuccess: () => invalidateAll(),
  })

  const deleteFollowUpMut = useMutation({
    mutationFn: ({ mid, fid }: { mid: string; fid: string }) => meetingsApi.removeFollowUp(mid, fid),
    onSuccess: () => invalidateAll(),
  })

  const canAnalyze = (!!link.trim() || !!text.trim()) && !analyzeMut.isPending

  const digestLabel = digestMut.isPending
    ? 'Sending…'
    : digestMut.isSuccess
      ? (digestMut.data?.sent ? 'Digest sent ✓' : (digestMut.data?.reason || 'Nothing due'))
      : 'Email me a digest'

  return (
    <GCLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Meetings</h1>
            <p style={{ fontSize: 13, color: t.muted }}>Paste a meeting — see who needs to do what, and where it falls in the build</p>
          </div>
          <button onClick={() => digestMut.mutate()} disabled={digestMut.isPending} style={{ ...btnGhost, padding: '7px 14px', fontSize: 11, whiteSpace: 'nowrap' }}>
            {digestLabel}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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
              <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* One-line header: date + attendees */}
                <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
                  {fmtDate(selected.meetingDate ?? selected.createdAt)}
                  {selected.attendees && <> · Attendees: {selected.attendees}</>}
                </p>

                {/* Confirmed this meeting — quiet, low-emphasis strip */}
                {selected.confirmed.length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.muted, marginBottom: 4 }}>
                      Confirmed this meeting
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {selected.confirmed.map((c, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5 }}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <FollowUpsByStage
                  followUps={selected.followUps}
                  onPatch={(fid, patch) => followUpMut.mutate({ mid: selected.id, fid, patch })}
                  onDelete={(fid) => deleteFollowUpMut.mutate({ mid: selected.id, fid })}
                />
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
      </div>
    </GCLayout>
  )
}

// ── Follow-ups grouped by build stage, with a global archived/paused toggle ─
function FollowUpsByStage({
  followUps,
  onPatch,
  onDelete,
}: {
  followUps: FollowUp[]
  onPatch: (fid: string, patch: FollowUpPatch) => void
  onDelete: (fid: string) => void
}) {
  const [showHidden, setShowHidden] = useState(false)
  const hiddenCount = followUps.filter((f) => f.status === 'archived' || f.status === 'paused').length
  const visible = showHidden ? followUps : followUps.filter((f) => f.status === 'open' || f.status === 'done')

  const groups = STAGES.map((stage) => ({
    stage,
    items: visible.filter((f) => f.stage === stage),
  })).filter((g) => g.items.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <p style={sectionLabel}>Follow-Ups</p>
        <p style={{ fontSize: 11, color: t.muted, margin: 0 }}>
          <span style={{ color: t.blue, fontWeight: 900 }}>🔧</span> Rob &nbsp;
          <span style={{ color: t.rust, fontWeight: 900 }}>🏠</span> Client
        </p>
      </div>

      {groups.length === 0 ? (
        <p style={{ fontSize: 13, color: t.muted, fontStyle: 'italic' }}>No follow-ups to show.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map(({ stage, items }) => (
            <div key={stage}>
              <p style={stageHeader}>{STAGE_LABELS[stage]}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((f) => (
                  <FollowUpItem key={f.id} f={f} onPatch={(patch) => onPatch(f.id, patch)} onDelete={() => onDelete(f.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <button onClick={() => setShowHidden((v) => !v)} style={{ ...btnSmall, padding: '4px 8px', marginTop: 10 }}>
          {showHidden ? 'Hide' : 'Show'} archived &amp; paused ({hiddenCount})
        </button>
      )}
    </div>
  )
}

const PAUSE_PRESETS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
]

// ── A single follow-up card: owner icon, stage reassign, Done/Edit/Archive/Pause/Delete ──
function FollowUpItem({ f, onPatch, onDelete }: { f: FollowUp; onPatch: (p: FollowUpPatch) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [pauseDays, setPauseDays] = useState(3)
  const [title, setTitle] = useState(f.title)
  const [details, setDetails] = useState(f.details ?? '')

  const done = f.status === 'done'
  const archived = f.status === 'archived'
  const paused = f.status === 'paused'
  const inactive = archived || paused
  const c = dueClass(f.dueDate)

  function confirmDelete() {
    if (window.confirm(`Permanently delete "${f.title}"?`)) onDelete()
  }

  return (
    <div style={{ border: `1.5px solid ${t.line}`, background: '#fff', padding: '10px 12px', opacity: done || inactive ? 0.6 : 1 }}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={inputStyle} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(false)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Cancel</button>
            <button onClick={() => { onPatch({ title, details }); setEditing(false) }} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>Save</button>
          </div>
        </div>
      ) : pausing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontWeight: 800, fontSize: 13 }}>Pause "{f.title}" for…</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PAUSE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPauseDays(p.days)}
                style={pauseDays === p.days ? { ...btnPrimary, padding: '4px 10px', fontSize: 11 } : { ...btnGhost, padding: '4px 10px', fontSize: 11 }}
              >{p.label}</button>
            ))}
            <input
              type="number"
              min={1}
              value={pauseDays}
              onChange={(e) => setPauseDays(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 60, border: `1.5px solid ${t.line}`, padding: '4px 6px', fontSize: 12, fontFamily: 'monospace' }}
            />
            <span style={{ fontSize: 12, color: t.muted, alignSelf: 'center' }}>days</span>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setPausing(false)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Cancel</button>
            <button
              onClick={() => { onPatch({ status: 'paused', pausedUntil: isoDaysFromNow(pauseDays) }); setPausing(false) }}
              style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}
            >Confirm</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span
            title={f.owner === 'client' ? 'Client to act' : 'Rob to act'}
            style={{ fontSize: 15, color: f.owner === 'client' ? t.rust : t.blue, flexShrink: 0, lineHeight: '1.4' }}
          >
            {f.owner === 'client' ? '🏠' : '🔧'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 800, fontSize: 14, textDecoration: done ? 'line-through' : 'none', margin: 0 }}>{f.title}</p>
              {f.tag && (
                <span style={{
                  fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${tagColor(f.tag)}`,
                  padding: '2px 7px', textTransform: 'uppercase', background: '#fff', color: tagColor(f.tag),
                }}>
                  {f.tag}
                </span>
              )}
            </div>
            {f.details && <p style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>{f.details}</p>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              {paused ? (
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: t.blue, textTransform: 'uppercase' }}>
                  Paused until {fmtDate(f.pausedUntil)}
                </span>
              ) : archived ? (
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: t.muted, textTransform: 'uppercase' }}>Archived</span>
              ) : (
                <>
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
                </>
              )}
              <select
                value={f.stage}
                onChange={(e) => onPatch({ stage: e.target.value as Stage })}
                style={{ border: `1px solid ${t.line}`, fontSize: 10.5, padding: '2px 4px', fontFamily: 'monospace', background: '#fff', color: t.muted }}
                title="Reassign build stage"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            {inactive ? (
              <>
                <button onClick={() => onPatch({ status: 'open' })} style={{ ...btnSmall, color: t.green, borderColor: t.green }}>Reopen</button>
                <button onClick={confirmDelete} style={{ ...btnSmall, color: t.red, borderColor: t.red }}>Delete</button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onPatch({ status: done ? 'open' : 'done' })}
                  style={{ background: done ? 'transparent' : t.green, border: `1.5px solid ${t.green}`, color: done ? t.green : '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}
                >{done ? 'Reopen' : 'Done'}</button>
                {!done && (
                  <>
                    <button onClick={() => { setTitle(f.title); setDetails(f.details ?? ''); setEditing(true) }} style={btnSmall}>Edit</button>
                    <button onClick={() => setPausing(true)} style={btnSmall}>Pause</button>
                    <button onClick={() => onPatch({ status: 'archived' })} style={btnSmall}>Archive</button>
                  </>
                )}
                <button onClick={confirmDelete} style={{ ...btnSmall, color: t.red, borderColor: t.red }}>Delete</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
