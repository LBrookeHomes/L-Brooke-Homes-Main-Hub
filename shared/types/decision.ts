export type DecisionType = 'structured' | 'freeform'
export type DecisionStatus = 'pending' | 'staged' | 'decided' | 'locked'
export type DecisionPriority = 'critical' | 'high' | 'normal' | 'low'
export type MessageSender = 'gc' | 'client'

export interface DecisionOption {
  id: string
  decisionId: string
  label: string
  description: string | null
  photoS3Key: string | null
  price: number | null
  vendorUrl: string | null
}

export interface DecisionMessage {
  id: string
  decisionId: string
  senderType: MessageSender
  body: string
  attachmentS3Keys: string[]
  createdAt: string
}

export interface Decision {
  id: string
  projectId: string
  milestoneId: string | null
  title: string
  description: string | null
  room: string | null
  type: DecisionType
  status: DecisionStatus
  priority: DecisionPriority
  dueDate: string | null
  stagedAt: string | null
  decidedAt: string | null
  selectedOptionId: string | null
  allowance: number | null
  chosenPrice: number | null
  proposedUrl: string | null
  proposedNote: string | null
  proposedPrice: number | null
  createdAt: string
  updatedAt: string
  options?: DecisionOption[]
  messages?: DecisionMessage[]
  workOrders?: { id: string }[]
}
