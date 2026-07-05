import { api } from './client'
import type { Decision, DecisionMessage } from '@weebrook/shared/types'

export const decisionsApi = {
  list: (projectId: string) => api.get<Decision[]>(`/decisions/project/${projectId}`),
  get: (id: string) => api.get<Decision>(`/decisions/${id}`),
  create: (data: Partial<Decision> & { projectId: string; title: string }) =>
    api.post<Decision>('/decisions', data),
  update: (id: string, data: Partial<Decision>) => api.patch<Decision>(`/decisions/${id}`, data),
  stage: (id: string) => api.post<Decision>(`/decisions/${id}/stage`),
  unstage: (id: string) => api.post<Decision>(`/decisions/${id}/unstage`),
  lock: (id: string, selectedOptionId?: string) =>
    api.post<Decision>(`/decisions/${id}/lock`, { selectedOptionId }),
  addMessage: (id: string, body: string, attachmentS3Keys?: string[]) =>
    api.post<DecisionMessage>(`/decisions/${id}/messages`, { body, attachmentS3Keys }),
  delete: (id: string) => api.delete(`/decisions/${id}`),
}
