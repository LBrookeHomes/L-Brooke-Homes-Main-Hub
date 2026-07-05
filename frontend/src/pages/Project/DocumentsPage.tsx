import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ProjectContext } from './ProjectPage'
import DocumentList from './DocumentList'
import { documentsApi } from '../../api/documents'
import { t } from '../../theme'

export default function DocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<ProjectContext>()

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id,
  })

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Documents</h2>
        <p style={{ fontSize: 13, color: t.muted }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
      </div>
      <DocumentList documents={documents} projectId={id!} milestones={project.milestones} />
    </div>
  )
}
