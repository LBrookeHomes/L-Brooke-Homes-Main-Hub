import type { Trade } from './project'

export type WorkOrderStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'needs_revision'

export type WorkOrderPriority = 'normal' | 'urgent'

export interface WorkOrderPhoto {
  id: string
  workOrderId: string
  s3Key: string
  caption: string | null
  createdAt: string
}

export interface WorkOrder {
  id: string
  projectId: string
  milestoneId: string | null
  contractorId: string | null
  trade: Trade
  title: string
  instructions: string
  status: WorkOrderStatus
  priority: WorkOrderPriority
  scheduledDate: string | null
  dueDate: string | null
  completedDate: string | null
  fromDecisionId: string | null
  magicLinkToken: string
  magicLinkExpiresAt: string
  smsSentAt: string | null
  createdAt: string
  updatedAt: string
  photos?: WorkOrderPhoto[]
}
