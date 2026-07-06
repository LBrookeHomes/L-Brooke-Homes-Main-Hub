import Modal from '../../components/Modal'
import WorkItemForm from './WorkItemForm'
import type { Worker, JobLocation } from '../../api/schedule'

interface Props {
  workers: Worker[]
  locations: JobLocation[]
  onClose: () => void
}

export default function AddModal({ workers, locations, onClose }: Props) {
  return (
    <Modal title="New Work Item" onClose={onClose} maxWidth={620}>
      <WorkItemForm workers={workers} locations={locations} onDone={onClose} />
    </Modal>
  )
}
