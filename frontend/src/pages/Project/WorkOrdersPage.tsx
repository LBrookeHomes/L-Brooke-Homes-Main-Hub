import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ProjectContext } from './ProjectPage'
import WorkOrderList from './WorkOrderList'
import { workOrdersApi } from '../../api/workorders'
import { documentsApi } from '../../api/documents'
import { t } from '../../theme'

export default function WorkOrdersPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<ProjectContext>()

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workorders', id],
    queryFn: () => workOrdersApi.list(id!),
    enabled: !!id,
  })
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id,
  })

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Work Orders</h2>
        <p style={{ fontSize: 13, color: t.muted }}>{workOrders.length} work order{workOrders.length !== 1 ? 's' : ''}</p>
      </div>
      <WorkOrderList
        workOrders={workOrders}
        projectId={id!}
        milestones={project.milestones}
        documents={documents}
      />
    </div>
  )
}
