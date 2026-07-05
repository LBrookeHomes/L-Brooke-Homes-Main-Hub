import type { Decision } from '@weebrook/shared/types'
import { t } from '../../theme'

const PRIORITY_COLOR: Record<string, string> = {
  critical: t.red,
  high: t.amber,
  normal: t.muted,
  low: t.muted,
}

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending: { label: 'Pending',        bg: '#e8e4dc', color: t.muted,  border: t.muted },
  staged:  { label: 'With client',    bg: '#dde6ee', color: t.blue,   border: t.blue },
  decided: { label: 'Client responded', bg: '#f6e1bd', color: '#76510d', border: t.amber },
  locked:  { label: 'Locked',         bg: '#dfe9d4', color: t.green,  border: t.green },
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  decision: Decision
  onOpen: () => void
  onStage: () => void
  onUnstage: () => void
  onLock: (optionId?: string) => void
  onEdit?: () => void
  onCreateWorkOrder?: () => void
  onCopyPortalLink?: () => void
  copyLinkPending?: boolean
  expanded?: boolean
}

export default function DecisionCard({
  decision, onOpen, onStage, onUnstage, onLock, onEdit,
  onCreateWorkOrder, onCopyPortalLink, copyLinkPending, expanded = false,
}: Props) {
  const isLocked = decision.status === 'locked'
  const canStage = decision.status === 'pending'
  const canUnstage = ['staged', 'decided'].includes(decision.status)
  const canLock = ['staged', 'decided'].includes(decision.status)

  const selectedOption = decision.options?.find((o) => o.id === decision.selectedOptionId)
  const hasProposal = !!(decision.proposedUrl || decision.proposedNote)

  const overBudget =
    decision.allowance != null &&
    decision.chosenPrice != null &&
    decision.chosenPrice > decision.allowance

  const chip = STATUS_CHIP[decision.status] ?? STATUS_CHIP.pending

  return (
    <div
      style={{ background: '#fff', border: `2px solid ${t.line}`, padding: '10px 12px', cursor: expanded ? 'default' : 'pointer', opacity: isLocked ? 0.85 : 1 }}
      onClick={!expanded ? onOpen : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: PRIORITY_COLOR[decision.priority], fontFamily: 'monospace' }}>
            {decision.priority}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.line}`, padding: '2px 6px', textTransform: 'uppercase', background: '#f5f1e8', color: t.muted }}>
            {decision.type === 'freeform' ? 'Discussion' : 'Choice'}
          </span>
          {hasProposal && !isLocked && (
            <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${t.amber}`, padding: '2px 6px', textTransform: 'uppercase', background: '#f6e1bd', color: '#76510d' }}>
              Client proposed
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          {decision.allowance != null && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: overBudget ? t.red : t.muted, fontFamily: 'monospace' }}>
              {overBudget ? '⚠ ' : ''}{fmt(decision.allowance)} allowance
            </span>
          )}
          <span style={{ fontFamily: 'monospace', fontSize: 10, border: `1.5px solid ${chip.border}`, padding: '2px 6px', textTransform: 'uppercase', background: chip.bg, color: chip.color }}>
            {chip.label}
          </span>
        </div>
      </div>

      <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 3 }}>{decision.title}</p>
      {decision.description && <p style={{ fontSize: '0.82rem', color: t.muted, marginBottom: 8 }}>{decision.description}</p>}

      {(expanded || decision.status === 'decided' || isLocked) && decision.options && decision.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: 8 }}>
          {decision.options.map((opt) => {
            const isSelected = opt.id === decision.selectedOptionId
            const overOpt = decision.allowance != null && opt.price != null && opt.price > decision.allowance
            return (
              <div
                key={opt.id}
                style={{
                  border: isSelected ? `2px solid ${t.green}` : `1.5px solid ${t.line}`,
                  padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  background: isSelected ? '#dfe9d4' : '#f5f1e8',
                  cursor: expanded && canLock ? 'pointer' : 'default',
                }}
                onClick={expanded && canLock ? () => onLock(opt.id) : undefined}
              >
                {opt.photoS3Key && <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>📷</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{opt.label}</p>
                  {opt.description && <p style={{ fontSize: '0.78rem', color: t.muted, marginTop: 2 }}>{opt.description}</p>}
                  {opt.vendorUrl && (
                    <a href={opt.vendorUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: t.blue, display: 'block', marginTop: 3 }}
                      onClick={(e) => e.stopPropagation()}>
                      View product ↗
                    </a>
                  )}
                </div>
                {opt.price != null && (
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', whiteSpace: 'nowrap', flexShrink: 0, color: overOpt ? t.red : t.ink, fontFamily: 'monospace' }}>
                    {fmt(opt.price)}
                    {overOpt && <span style={{ fontSize: '0.65rem', color: t.red, marginLeft: 4 }}>over</span>}
                  </span>
                )}
                {isSelected && <span style={{ color: t.green, fontWeight: 900, flexShrink: 0 }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}

      {expanded && hasProposal && (
        <div style={{ borderLeft: `4px solid ${t.amber}`, padding: '9px 12px', background: '#fff', marginBottom: 8 }}>
          <p style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', color: t.amber, marginBottom: 4, fontFamily: 'monospace' }}>Client's Proposal</p>
          {decision.proposedNote && <p style={{ fontSize: '0.85rem', color: t.ink, marginBottom: 4 }}>{decision.proposedNote}</p>}
          {decision.proposedUrl && (
            <a href={decision.proposedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: t.blue, wordBreak: 'break-all', display: 'block', marginBottom: 4 }}>
              {decision.proposedUrl} ↗
            </a>
          )}
          {decision.proposedPrice != null && (
            <p style={{ fontSize: '0.82rem', fontWeight: 700 }}>Price: {fmt(decision.proposedPrice)}</p>
          )}
        </div>
      )}

      {isLocked && selectedOption && !expanded && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: '0.82rem', color: t.muted }}>Locked: <strong>{selectedOption.label}</strong></p>
          {decision.chosenPrice != null && (
            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: overBudget ? t.red : t.green, fontFamily: 'monospace' }}>
              {fmt(decision.chosenPrice)}
              {decision.allowance != null && (
                <span style={{ fontWeight: 400, color: t.muted, fontSize: '0.78rem' }}> / {fmt(decision.allowance)}</span>
              )}
            </span>
          )}
        </div>
      )}

      {!isLocked && (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: 6, flexWrap: 'wrap' }}>
          {onEdit && (
            <button
              style={{ padding: '4px 9px', background: 'transparent', border: `1.5px solid ${t.line}`, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.muted }}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
            >Edit</button>
          )}
          {canStage && (
            <button
              style={{ padding: '4px 9px', background: t.blue, border: `2px solid ${t.blue}`, color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
              onClick={(e) => { e.stopPropagation(); onStage() }}
            >
              {decision.type === 'freeform' ? 'Open discussion' : 'Stage to client'}
            </button>
          )}
          {canUnstage && (
            <button
              style={{ padding: '4px 9px', background: 'transparent', border: `1.5px solid ${t.line}`, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: t.ink }}
              onClick={(e) => { e.stopPropagation(); onUnstage() }}
            >Unstage</button>
          )}
          {onCopyPortalLink && (
            <button
              style={{ padding: '4px 9px', background: '#dde6ee', border: `1.5px solid ${t.blue}`, color: t.blue, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}
              onClick={(e) => { e.stopPropagation(); onCopyPortalLink() }}
              disabled={copyLinkPending}
            >
              {copyLinkPending ? 'Generating…' : '🔗 Copy link'}
            </button>
          )}
          {canLock && decision.type === 'structured' && !expanded && (
            <button
              style={{ padding: '4px 9px', background: t.green, border: `2px solid ${t.green}`, color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
              onClick={(e) => { e.stopPropagation(); onOpen() }}
            >Review &amp; lock</button>
          )}
          {canLock && decision.type === 'freeform' && (
            <button
              style={{ padding: '4px 9px', background: t.green, border: `2px solid ${t.green}`, color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
              onClick={(e) => { e.stopPropagation(); onLock() }}
            >Lock decision</button>
          )}
        </div>
      )}
      {isLocked && onCreateWorkOrder && !(decision.workOrders?.length) && (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: 6 }}>
          <button
            style={{ padding: '4px 9px', background: '#7c3aed', border: '2px solid #7c3aed', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}
            onClick={(e) => { e.stopPropagation(); onCreateWorkOrder() }}
          >+ Create work order</button>
        </div>
      )}
    </div>
  )
}
