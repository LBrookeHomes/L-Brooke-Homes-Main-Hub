export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'complete' | 'cancelled'
export type MilestoneStatus = 'pending' | 'in_progress' | 'complete' | 'blocked'
export type MilestonePhase = 'onboarding' | 'preconstruction' | 'construction' | 'closeout'
export type Trade =
  | 'plumbing'
  | 'electrical'
  | 'masonry'
  | 'carpentry'
  | 'finish'
  | 'painting'
  | 'landscaping'
  | 'hvac'
  | 'roofing'
  | 'tiling'
  | 'drywall'
  | 'general'

export interface Project {
  id: string
  name: string
  address: string
  clientId: string
  status: ProjectStatus
  templateType: string | null
  startDate: string | null
  targetDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  projectId: string
  name: string
  phase: MilestonePhase
  order: number
  startDate: string | null
  endDate: string | null
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  notifPrefs: { email: boolean; sms: boolean; push: boolean }
  createdAt: string
}

export interface Contractor {
  id: string
  name: string
  phone: string
  email: string | null
  trade: Trade
  notes: string | null
  active: boolean
  createdAt: string
}

export interface ProjectContractor {
  projectId: string
  contractorId: string
  role: string | null
}
