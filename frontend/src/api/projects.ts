import { api } from './client'
import type { Project, Milestone } from '@weebrook/shared/types'

export interface ProjectWithMeta extends Project {
  client: { id: string; name: string; email: string; portalToken: string | null; portalTokenExpires: string | null }
  milestones: Milestone[]
  contractors: { contractor: { id: string; name: string; trade: string; phone: string; email: string | null }; role: string | null }[]
  _count: { decisions: number; workOrders: number }
  budget?: { allowance: number; committed: number } | null
}

export const clientsApi = {
  sendPortalLink: (clientId: string) => api.post<{ ok: boolean; expiresAt: string }>(`/clients/${clientId}/send-portal-link`),
}

export interface AttentionQueue {
  blockingDecisions: any[]
  overdueDecisions: any[]
  unstaged: any[]
  upcomingMilestones: any[]
  overdueMilestones: any[]
}

export const projectsApi = {
  list: () => api.get<ProjectWithMeta[]>('/projects'),
  get: (id: string) => api.get<ProjectWithMeta>(`/projects/${id}`),
  create: (data: {
    name: string
    address: string
    clientId: string
    startDate?: string
    targetDate?: string
    templateType?: string
    rooms?: string[]
  }) => api.post<ProjectWithMeta>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
  attention: (id: string) => api.get<AttentionQueue>(`/projects/${id}/attention`),
  addContractor: (projectId: string, contractorId: string, role?: string) =>
    api.post(`/projects/${projectId}/contractors`, { contractorId, role }),
  removeContractor: (projectId: string, contractorId: string) =>
    api.delete(`/projects/${projectId}/contractors/${contractorId}`),
}
