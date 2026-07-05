import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractorsApi, TRADES, type Contractor, type Trade } from '../../api/contractors'
import GCLayout from '../../components/GCLayout/GCLayout'
import { useIsMobile } from '../../hooks/useIsMobile'
import { t } from '../../theme'

const TRADE_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  plumbing:    { bg: '#dde6ee', color: t.blue,    border: t.blue },
  electrical:  { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  carpentry:   { bg: '#dfe9d4', color: t.green,   border: t.green },
  tiling:      { bg: '#e8e4dc', color: t.muted,   border: t.muted },
  painting:    { bg: '#f5dbd9', color: t.rust,    border: t.rust },
  hvac:        { bg: '#dde6ee', color: t.blue,    border: t.blue },
  masonry:     { bg: '#e8e4dc', color: t.muted,   border: t.muted },
  finish:      { bg: '#dfe9d4', color: t.green,   border: t.green },
  landscaping: { bg: '#dfe9d4', color: t.green,   border: t.green },
  roofing:     { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  drywall:     { bg: '#e8e4dc', color: t.muted,   border: t.muted },
  general:     { bg: '#e8e4dc', color: t.ink,     border: t.muted },
}

function tradeChip(trade: string) {
  return TRADE_CHIP[trade.toLowerCase()] ?? { bg: t.paper, color: t.muted, border: t.muted }
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  border: `1.5px solid ${t.line}`,
  fontSize: '0.875rem',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: '0.72rem', fontWeight: 900, color: t.muted,
  textTransform: 'uppercase', letterSpacing: '0.05em',
}

export default function ContractorsRoster() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [showForm, setShowForm] = useState(false)
  const [tradeFilter, setTradeFilter] = useState<Trade | 'all'>('all')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [trade, setTrade] = useState<Trade | ''>('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [retireConfirm, setRetireConfirm] = useState<string | null>(null)

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorsApi.list,
  })

  const createMut = useMutation({
    mutationFn: (data: { name: string; phone: string; trade: Trade; email?: string; notes?: string }) =>
      contractorsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractors'] })
      setShowForm(false)
      setName(''); setPhone(''); setTrade(''); setEmail(''); setNotes('')
    },
  })

  const retireMut = useMutation({
    mutationFn: (id: string) => contractorsApi.retire(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractors'] })
      setRetireConfirm(null)
    },
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !phone || !trade) return
    createMut.mutate({ name, phone, trade: trade as Trade, email: email || undefined, notes: notes || undefined })
  }

  const visible = tradeFilter === 'all'
    ? contractors
    : contractors.filter((c: Contractor) => c.trade === tradeFilter)

  const tradeCounts = TRADES.reduce((acc, tr) => {
    acc[tr] = contractors.filter((c: Contractor) => c.trade === tr).length
    return acc
  }, {} as Record<Trade, number>)

  const pillOn: React.CSSProperties  = { background: t.rust, border: `1.5px solid ${t.rust}`, color: '#fff', padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }
  const pillOff: React.CSSProperties = { background: '#fff', border: `1.5px solid ${t.line}`, color: t.ink,  padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }

  return (
    <GCLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>

        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Contractors</h1>
            <p style={{ fontSize: 13, color: t.muted }}>Global roster — assign to projects from the project page</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: showForm ? 'transparent' : t.rust, border: `2px solid ${t.rust}`, color: showForm ? t.rust : '#fff', padding: '9px 14px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {showForm ? '× Cancel' : '+ New Contractor'}
          </button>
        </div>

        {/* New contractor form */}
        {showForm && (
          <div style={{ background: t.card, border: `2px solid ${t.line}`, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ background: t.ink, padding: '10px 16px' }}>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>New Contractor</p>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <label style={labelStyle}>Name *
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
                </label>
                <label style={labelStyle}>Trade *
                  <select style={inputStyle} value={trade} onChange={(e) => setTrade(e.target.value as Trade)} required>
                    <option value="">Select trade…</option>
                    {TRADES.map((tr) => (
                      <option key={tr} value={tr}>{tr.charAt(0).toUpperCase() + tr.slice(1)}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>Phone *
                  <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+1 555 000 0000" />
                </label>
                <label style={labelStyle}>Email
                  <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
                </label>
              </div>
              <label style={labelStyle}>Notes
                <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional — licenses, specialties, etc." />
              </label>
              {createMut.isError && (
                <p style={{ fontSize: '0.82rem', color: t.red, fontFamily: 'monospace' }}>Save failed. Please try again.</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', border: `2px solid ${t.line}`, background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>Cancel</button>
                <button type="submit" disabled={createMut.isPending} style={{ padding: '0.5rem 1.1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', opacity: createMut.isPending ? 0.7 : 1 }}>
                  {createMut.isPending ? 'Saving…' : 'Add to Roster'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Trade filter pills */}
        {contractors.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={tradeFilter === 'all' ? pillOn : pillOff} onClick={() => setTradeFilter('all')}>
              All <span style={{ fontFamily: 'monospace', fontSize: 10, marginLeft: 4, opacity: 0.7 }}>{contractors.length}</span>
            </button>
            {TRADES.filter((tr) => tradeCounts[tr] > 0).map((tr) => (
              <button key={tr} style={tradeFilter === tr ? pillOn : pillOff} onClick={() => setTradeFilter(tr)}>
                {tr.charAt(0).toUpperCase() + tr.slice(1)}
                <span style={{ fontFamily: 'monospace', fontSize: 10, marginLeft: 4, opacity: 0.7 }}>{tradeCounts[tr]}</span>
              </button>
            ))}
          </div>
        )}

        {/* States */}
        {isLoading && (
          <p style={{ color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.8rem' }}>Loading…</p>
        )}

        {!isLoading && contractors.length === 0 && (
          <div style={{ border: `2px dashed ${t.sand}`, padding: '3rem 2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: 8 }}>Roster empty</p>
            <p style={{ fontSize: '0.85rem', color: t.muted, marginBottom: '1rem' }}>Add contractors to your roster, then assign them to projects.</p>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase' }}
            >+ Add First Contractor</button>
          </div>
        )}

        {/* Contractor rows */}
        {visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map((c: Contractor) => {
              const chip = tradeChip(c.trade)
              const confirming = retireConfirm === c.id
              return (
                <div key={c.id} style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>{c.name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 7px', textTransform: 'uppercase', background: chip.bg, color: chip.color }}>
                        {c.trade}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: t.muted, fontFamily: 'monospace' }}>{c.phone}</span>
                      {c.email && <span style={{ fontSize: '0.8rem', color: t.muted }}>{c.email}</span>}
                      {c.notes && <span style={{ fontSize: '0.78rem', color: t.muted, fontStyle: 'italic' }}>{c.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {confirming ? (
                      <>
                        <span style={{ fontSize: '0.75rem', color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase' }}>Retire?</span>
                        <button
                          onClick={() => retireMut.mutate(c.id)}
                          disabled={retireMut.isPending}
                          style={{ background: t.amber, border: `2px solid ${t.amber}`, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}
                        >{retireMut.isPending ? '…' : 'Confirm'}</button>
                        <button
                          onClick={() => setRetireConfirm(null)}
                          style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                        >Cancel</button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRetireConfirm(c.id)}
                        style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
                      >Retire</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </GCLayout>
  )
}
