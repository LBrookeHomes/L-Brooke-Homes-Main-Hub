import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProjectContext } from './ProjectPage'
import MilestoneTimeline from '../../components/MilestoneTimeline/MilestoneTimeline'
import { t } from '../../theme'

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<ProjectContext>()

  const complete = project.milestones.filter((m) => m.status === 'complete').length
  const total = project.milestones.length

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Phase Timeline</h2>
        <p style={{ fontSize: 13, color: t.muted }}>{complete}/{total} phases complete</p>
      </div>
      <MilestoneTimeline milestones={project.milestones} projectId={id!} />
    </div>
  )
}
