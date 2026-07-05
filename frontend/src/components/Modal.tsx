import { ReactNode } from 'react'
import { t } from '../theme'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  maxWidth?: number
}

export default function Modal({ title, onClose, children, maxWidth = 480 }: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: t.paper, border: `2px solid ${t.line}`, width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ background: t.ink, color: '#fff', padding: '10px 13px', fontWeight: 900, textTransform: 'uppercase', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>{title}</span>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }} onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '1.25rem' }}>{children}</div>
      </div>
    </div>
  )
}
