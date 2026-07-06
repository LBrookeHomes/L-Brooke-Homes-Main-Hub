import { t } from '../../theme'
import type { Status } from '../../api/schedule'

export const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.7rem',
  border: `1.5px solid ${t.line}`,
  fontSize: '0.875rem',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
}

export const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: '0.72rem',
  fontWeight: 900,
  color: t.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export const btnPrimary: React.CSSProperties = {
  background: t.rust,
  border: `2px solid ${t.rust}`,
  color: '#fff',
  padding: '9px 14px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export const btnGhost: React.CSSProperties = {
  background: 'transparent',
  border: `2px solid ${t.line}`,
  color: t.ink,
  padding: '9px 14px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

// Per-status chip colours, using the hub palette.
export const STATUS_CHIP: Record<Status, { bg: string; color: string; border: string }> = {
  'Planning':          { bg: '#e8e4dc', color: t.muted, border: t.muted },
  'Material to order':  { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  'Waiting on stock':   { bg: '#f6e1bd', color: '#76510d', border: t.amber },
  'Schedule':           { bg: '#dde6ee', color: t.blue,  border: t.blue },
  'On Going':           { bg: '#dfe9d4', color: t.green, border: t.green },
  'On Hold':            { bg: '#f5dbd9', color: t.rust,  border: t.rust },
  'Completed':          { bg: '#dfe9d4', color: t.green, border: t.green },
}

export function statusChip(status: string) {
  return STATUS_CHIP[status as Status] ?? { bg: t.paper, color: t.muted, border: t.muted }
}
