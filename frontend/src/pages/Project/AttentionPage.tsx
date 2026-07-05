import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProjectContext } from './ProjectPage'
import AttentionQueue from './AttentionQueue'
import { t } from '../../theme'

export default function AttentionPage() {
  const { id } = useParams<{ id: string }>()
  const { attention, attentionCount } = useOutletContext<ProjectContext>()

  if (attentionCount === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '2rem', color: t.green, marginBottom: '0.75rem' }}>✓</div>
        <p style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>All clear</p>
        <p style={{ color: t.muted, fontSize: '0.875rem' }}>Nothing needs your attention right now.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Needs Attention</h2>
        <p style={{ fontSize: 13, color: t.muted }}>{attentionCount} item{attentionCount !== 1 ? 's' : ''} requiring action</p>
      </div>
      <AttentionQueue attention={attention} projectId={id!} />
    </div>
  )
}
