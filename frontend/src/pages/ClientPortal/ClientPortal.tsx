import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Decision, DecisionOption } from '@weebrook/shared/types'
import { format } from 'date-fns'
import { BASE, PUBLIC_BASE } from '../../api/client'
import { t } from '../../theme'

interface PortalData {
  project: { id: string; name: string; address: string; milestones: any[] }
  decisions: (Decision & { options: (DecisionOption & { photoUrl?: string })[]; milestone?: { name: string } })[]
}

export default function ClientPortal() {
  const { projectId } = useParams<{ projectId: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState<string | null>(null)
  const [threadInput, setThreadInput] = useState<Record<string, string>>({})
  const clientName = sessionStorage.getItem('clientName') || 'Homeowner'

  async function load() {
    const res = await fetch(`${PUBLIC_BASE}/portal/project/${projectId}`, { credentials: 'include' })
    const d = await res.json()
    if (d.error) setError(d.error); else setData(d)
  }

  useEffect(() => {
    load().catch(() => setError('Could not load your project. Please use your login link.'))
  }, [projectId])

  async function selectOption(decisionId: string, optionId: string) {
    setResponding(decisionId)
    await fetch(`${BASE}/decisions/${decisionId}/respond`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedOptionId: optionId }),
    })
    await load()
    setResponding(null)
  }

  async function submitProposal(decisionId: string, proposal: { proposedUrl?: string; proposedNote?: string; proposedPrice?: string }) {
    setResponding(decisionId)
    await fetch(`${BASE}/decisions/${decisionId}/respond`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal),
    })
    await load()
    setResponding(null)
  }

  async function sendMessage(decisionId: string) {
    const body = threadInput[decisionId]?.trim()
    if (!body) return
    await fetch(`${BASE}/decisions/${decisionId}/client-messages`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    setThreadInput((prev) => ({ ...prev, [decisionId]: '' }))
    await load()
  }

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '2rem', maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', color: t.red, marginBottom: 8, fontFamily: 'monospace', letterSpacing: '0.07em' }}>Access Error</p>
        <p style={{ color: t.ink, marginBottom: 8 }}>{error}</p>
        <p style={{ color: t.muted, fontSize: '0.875rem' }}>Contact your contractor for a new link.</p>
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <p style={{ color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.85rem' }}>Loading your project…</p>
    </div>
  )

  const pending = data.decisions.filter((d) => d.status === 'staged')
  const responded = data.decisions.filter((d) => ['decided', 'locked'].includes(d.status))

  const totalAllowance = data.decisions.reduce((s, d) => s + (d.allowance ?? 0), 0)
  const committed = data.decisions
    .filter((d) => ['decided', 'locked'].includes(d.status) && d.chosenPrice != null)
    .reduce((s, d) => s + (d.chosenPrice ?? 0), 0)
  const hasBudget = totalAllowance > 0
  const budgetOver = committed > totalAllowance
  const fmtMoney = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })

  return (
    <div style={{ minHeight: '100vh', background: t.paper }}>
      <header style={{ background: t.ink, color: '#fff', borderBottom: `4px solid ${t.rust}`, padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1.05rem', letterSpacing: '0.01em' }}>Weebrook</div>
          <div style={{ fontSize: 11, color: '#d9874c', letterSpacing: '0.18em', fontWeight: 700, marginTop: 2 }}>CLIENT PORTAL</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase' }}>{data.project.name}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{data.project.address} · Hi, {clientName}</div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '22px 18px 80px' }}>

        {hasBudget && (
          <div style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '0.9rem 1.1rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 2, fontFamily: 'monospace' }}>Your selections budget</span>
                <span style={{ fontSize: '0.75rem', display: 'block', color: budgetOver ? t.red : t.muted, fontFamily: 'monospace' }}>
                  {budgetOver ? `${fmtMoney(committed - totalAllowance)} over budget` : `${fmtMoney(totalAllowance - committed)} remaining`}
                </span>
              </div>
              <span style={{ fontWeight: 900, fontSize: '0.9rem', color: budgetOver ? t.red : t.ink, fontFamily: 'monospace' }}>
                {fmtMoney(committed)} <span style={{ fontWeight: 400, color: t.muted }}>/ {fmtMoney(totalAllowance)}</span>
              </span>
            </div>
            <div style={{ height: 9, border: `1px solid ${t.line}`, background: t.sand, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((committed / totalAllowance) * 100, 100)}%`, background: budgetOver ? t.red : t.green, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <div style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '2.5rem', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '1.5rem', color: t.green, marginBottom: 8 }}>✓</div>
            <p style={{ fontWeight: 900, fontSize: '0.95rem', textTransform: 'uppercase', marginBottom: 6 }}>All caught up</p>
            <p style={{ color: t.muted, fontSize: '0.875rem' }}>Your contractor will notify you when a new decision is ready.</p>
          </div>
        )}

        {pending.length > 0 && (
          <section style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, fontWeight: 700, marginBottom: '0.75rem', fontFamily: 'monospace' }}>
              Needs Your Input — {pending.length} item{pending.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map((d) => (
                <ClientDecisionCard
                  key={d.id}
                  decision={d}
                  responding={responding === d.id}
                  threadInput={threadInput[d.id] || ''}
                  onSelect={(optId) => selectOption(d.id, optId)}
                  onPropose={(p) => submitProposal(d.id, p)}
                  onThreadChange={(val) => setThreadInput((prev) => ({ ...prev, [d.id]: val }))}
                  onThreadSend={() => sendMessage(d.id)}
                />
              ))}
            </div>
          </section>
        )}

        {responded.length > 0 && (
          <section>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, fontWeight: 700, marginBottom: '0.75rem', fontFamily: 'monospace' }}>
              Decisions Made — {responded.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {responded.map((d) => (
                <ClientDecisionCard key={d.id} decision={d} responding={false}
                  threadInput="" onSelect={() => {}} onPropose={() => {}}
                  onThreadChange={() => {}} onThreadSend={() => {}} readOnly />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

interface CardProps {
  decision: any
  responding: boolean
  threadInput: string
  onSelect: (optId: string) => void
  onPropose: (p: { proposedUrl?: string; proposedNote?: string; proposedPrice?: string }) => void
  onThreadChange: (val: string) => void
  onThreadSend: () => void
  readOnly?: boolean
}

function ClientDecisionCard({ decision, responding, threadInput, onSelect, onPropose, onThreadChange, onThreadSend, readOnly }: CardProps) {
  const isDecided = ['decided', 'locked'].includes(decision.status)
  const [showPropose, setShowPropose] = useState(false)
  const [propUrl, setPropUrl] = useState('')
  const [propNote, setPropNote] = useState('')
  const [propPrice, setPropPrice] = useState('')

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

  function handlePropose() {
    if (!propUrl && !propNote) return
    onPropose({ proposedUrl: propUrl || undefined, proposedNote: propNote || undefined, proposedPrice: propPrice || undefined })
    setShowPropose(false)
  }

  const inputStyle: React.CSSProperties = { padding: '0.5rem 0.7rem', border: `1.5px solid ${t.line}`, fontSize: '0.875rem', width: '100%', background: '#fff', outline: 'none' }

  return (
    <div style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '1rem 1.1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{decision.title}</h3>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {decision.room && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: t.paper, color: t.muted }}>
                {decision.room}
              </span>
            )}
            {decision.milestone?.name && !decision.room && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: t.paper, color: t.muted }}>
                {decision.milestone.name}
              </span>
            )}
            {decision.allowance != null && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.green}`, padding: '2px 6px', textTransform: 'uppercase', background: '#dfe9d4', color: t.green }}>
                {fmt(decision.allowance)} allowance
              </span>
            )}
            {decision.dueDate && !isDecided && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.red}`, padding: '2px 6px', textTransform: 'uppercase', background: '#f2d2ca', color: t.red }}>
                Due {format(new Date(decision.dueDate), 'MMM d')}
              </span>
            )}
            {isDecided && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.green}`, padding: '2px 6px', textTransform: 'uppercase', background: '#dfe9d4', color: t.green }}>
                ✓ Submitted
              </span>
            )}
          </div>
        </div>
      </div>

      {decision.description && <p style={{ color: t.muted, fontSize: '0.875rem', marginBottom: '0.75rem' }}>{decision.description}</p>}

      {/* Structured options */}
      {decision.type === 'structured' && decision.options?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {decision.options.map((opt: any) => {
            const isSelected = opt.id === decision.selectedOptionId
            const overOpt = decision.allowance != null && opt.price != null && opt.price > decision.allowance
            return (
              <button
                key={opt.id}
                disabled={readOnly || isDecided || responding}
                onClick={() => !readOnly && !isDecided && onSelect(opt.id)}
                style={{
                  border: isSelected ? `2px solid ${t.green}` : `2px solid ${t.line}`,
                  padding: '0.75rem', background: isSelected ? '#dfe9d4' : t.paper,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  textAlign: 'left', cursor: readOnly || isDecided ? 'default' : 'pointer',
                  position: 'relative',
                }}
              >
                {opt.photoUrl && <img src={opt.photoUrl} alt={opt.label} style={{ width: '100%', height: 90, objectFit: 'cover', marginBottom: 4 }} />}
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{opt.label}</span>
                {opt.description && <span style={{ fontSize: '0.78rem', color: t.muted }}>{opt.description}</span>}
                {opt.vendorUrl && (
                  <a href={opt.vendorUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: t.blue, fontWeight: 700 }}
                    onClick={(e) => e.stopPropagation()}>
                    See product ↗
                  </a>
                )}
                {opt.price != null && (
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', marginTop: 4, fontFamily: 'monospace', color: overOpt ? t.red : isSelected ? t.green : t.ink }}>
                    {fmt(opt.price)}
                    {overOpt && !isSelected && <span style={{ fontSize: '0.7rem', color: t.red }}> over</span>}
                  </span>
                )}
                {isSelected && <span style={{ position: 'absolute', top: 8, right: 8, color: t.green, fontWeight: 900, fontSize: '1rem' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Freeform thread */}
      {decision.type === 'freeform' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {decision.messages?.map((msg: any) => (
            <div key={msg.id} style={{
              padding: '0.6rem 0.85rem',
              background: msg.senderType === 'gc' ? t.paper : '#dfe9d4',
              border: `1.5px solid ${msg.senderType === 'gc' ? t.sand : t.green}`,
              alignSelf: msg.senderType === 'gc' ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
            }}>
              <p style={{ fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', color: t.muted, marginBottom: 2, fontFamily: 'monospace' }}>
                {msg.senderType === 'gc' ? 'Your Contractor' : 'You'}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{msg.body}</p>
            </div>
          ))}
          {!readOnly && !isDecided && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: 4 }}>
              <textarea
                style={{ ...inputStyle, flex: 1, resize: 'vertical', height: 60 }}
                value={threadInput}
                onChange={(e) => onThreadChange(e.target.value)}
                placeholder="Type your message…"
                rows={2}
              />
              <button
                style={{ padding: '0.55rem 1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={onThreadSend} disabled={!threadInput.trim()}
              >Send</button>
            </div>
          )}
        </div>
      )}

      {/* "Found something online?" proposal */}
      {!readOnly && !isDecided && (
        <div style={{ borderTop: `1px solid ${t.sand}`, paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: t.muted, padding: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}
            onClick={() => setShowPropose((v) => !v)}
          >
            {showPropose ? '▲ Hide' : '▼ Found something online?'}
          </button>
          {showPropose && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: t.muted, margin: 0 }}>Share a link and your contractor will review it.</p>
              <input style={inputStyle} placeholder="Product URL (e.g. homedepot.com/…)" value={propUrl} onChange={(e) => setPropUrl(e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'vertical', height: 60 }} placeholder="Notes (color, size, finish…)" value={propNote} onChange={(e) => setPropNote(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '0.5rem', color: t.muted, fontSize: '0.875rem', pointerEvents: 'none' }}>$</span>
                  <input style={{ ...inputStyle, paddingLeft: '1.4rem', width: 110 }} placeholder="Price" type="number" min="0" value={propPrice} onChange={(e) => setPropPrice(e.target.value)} />
                </div>
                <button
                  style={{ flex: 1, padding: '0.5rem 0.75rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.78rem' }}
                  disabled={!propUrl && !propNote}
                  onClick={handlePropose}
                >Send my find</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show submitted proposal in read-only */}
      {(decision.proposedUrl || decision.proposedNote) && isDecided && (
        <div style={{ borderLeft: `4px solid ${t.amber}`, padding: '9px 12px', background: t.paper, marginTop: 8 }}>
          <p style={{ fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', color: t.amber, marginBottom: 4, fontFamily: 'monospace' }}>Your Proposal</p>
          {decision.proposedNote && <p style={{ fontSize: '0.875rem', color: t.ink, marginBottom: 4 }}>{decision.proposedNote}</p>}
          {decision.proposedUrl && (
            <a href={decision.proposedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: t.blue, wordBreak: 'break-all' }}>
              {decision.proposedUrl} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}
