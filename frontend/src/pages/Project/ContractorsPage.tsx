import { useState } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectContext } from './ProjectPage'
import { projectsApi } from '../../api/projects'
import { contractorsApi, type Contractor } from '../../api/contractors'
import { t } from '../../theme'

const TRADE_CHIP: Record<string, { bg: string; color: string; border: string }> = {
  plumbing:    { bg: '#dde6ee', color: t.blue,    border: t.blue },
  electrical:  { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  carpentry:   { bg: '#dfe9d4', color: t.green,   border: t.green },
  tiling:      { bg: '#e8e4dc', color: t.muted,   border: t.muted },
  painting:    { bg: '#f5dbd9', color: t.rust,    border: t.rust },
  hvac:        { bg: '#dde6ee', color: t.blue,    border: t.blue },
  general:     { bg: '#e8e4dc', color: t.ink,     border: t.muted },
}

function tradeChip(trade: string) {
  return TRADE_CHIP[trade.toLowerCase()] ?? { bg: t.paper, color: t.muted, border: t.muted }
}

export default function ContractorsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<ProjectContext>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState('')
  const [role, setRole] = useState('')

  const { data: allContractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: contractorsApi.list,
  })

  const assigned = project.contractors ?? []
  const assignedIds = new Set(assigned.map((pc) => pc.contractor.id))
  const available = allContractors.filter((c: Contractor) => !assignedIds.has(c.id))

  const assignMut = useMutation({
    mutationFn: ({ contractorId, role }: { contractorId: string; role?: string }) =>
      projectsApi.addContractor(id!, contractorId, role || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      setSelectedId('')
      setRole('')
    },
  })

  const unassignMut = useMutation({
    mutationFn: (contractorId: string) => projectsApi.removeContractor(id!, contractorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  })

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.7rem',
    border: `1.5px solid ${t.line}`,
    fontSize: '0.875rem',
    background: '#fff',
    width: '100%',
    boxSizing: 'border-box',
  }

  function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    assignMut.mutate({ contractorId: selectedId, role: role || undefined })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Contractors</h2>
          <p style={{ fontSize: 13, color: t.muted }}>{assigned.length} assigned to this project</p>
        </div>
        <button
          onClick={() => navigate('/contractors')}
          style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '5px 12px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Manage Roster ↗
        </button>
      </div>

      {/* Assigned list */}
      {assigned.length === 0 ? (
        <div style={{ border: `2px dashed ${t.sand}`, padding: '2rem', textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, marginBottom: 6 }}>No contractors assigned</p>
          <p style={{ fontSize: '0.82rem', color: t.muted }}>Select from your roster below to assign contractors to this project.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {assigned.map(({ contractor: c, role: assignedRole }) => {
            const chip = tradeChip(c.trade)
            return (
              <div key={c.id} style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>{c.name}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 6px', textTransform: 'uppercase', background: chip.bg, color: chip.color }}>
                      {c.trade}
                    </span>
                    {assignedRole && (
                      <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: t.paper, color: t.muted }}>
                        {assignedRole}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: t.muted, fontFamily: 'monospace' }}>{c.phone}</span>
                    {c.email && <span style={{ fontSize: '0.8rem', color: t.muted }}>{c.email}</span>}
                  </div>
                </div>
                <button
                  onClick={() => unassignMut.mutate(c.id)}
                  disabled={unassignMut.isPending}
                  style={{ background: 'transparent', border: `1.5px solid ${t.line}`, color: t.muted, padding: '4px 10px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', flexShrink: 0 }}
                >
                  Unassign
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign from roster */}
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '1rem 1.1rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color: t.muted, marginBottom: 12 }}>Assign from Roster</p>
        {allContractors.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: t.muted }}>
            No contractors in your roster yet.{' '}
            <button onClick={() => navigate('/contractors')} style={{ background: 'none', border: 'none', color: t.rust, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', padding: 0, textDecoration: 'underline' }}>
              Add contractors to your roster
            </button>
          </p>
        ) : available.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: t.muted }}>All roster contractors are already assigned to this project.</p>
        ) : (
          <form onSubmit={handleAssign} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted, display: 'block', marginBottom: 4 }}>Contractor</label>
              <select style={inputStyle} value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
                <option value="">Select…</option>
                {available.map((c: Contractor) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.trade}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted, display: 'block', marginBottom: 4 }}>Role (optional)</label>
              <input style={inputStyle} placeholder="e.g. Lead, Sub" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <button
              type="submit"
              disabled={!selectedId || assignMut.isPending}
              style={{ padding: '0.5rem 1rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', opacity: !selectedId || assignMut.isPending ? 0.6 : 1, flexShrink: 0 }}
            >
              {assignMut.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
