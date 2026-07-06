import Modal from '../../components/Modal'
import WorkItemForm from './WorkItemForm'
import type { Worker, JobLocation, WorkItem } from '../../api/schedule'

interface Props {
  item: WorkItem
  workers: Worker[]
  locations: JobLocation[]
  onClose: () => void
}

export default function EditModal({ item, workers, locations, onClose }: Props) {
  return (
    <Modal title="Edit Work Item" onClose={onClose} maxWidth={620}>
      <WorkItemForm workers={workers} locations={locations} existing={item} onDone={onClose} />
    </Modal>
  )
}
