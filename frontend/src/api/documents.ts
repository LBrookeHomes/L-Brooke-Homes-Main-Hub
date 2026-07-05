import { api } from './client'
import type { Document } from '@weebrook/shared/types'

export const documentsApi = {
  list: (projectId: string) => api.get<Document[]>(`/documents/project/${projectId}`),
  create: (data: { projectId: string; milestoneId?: string; name: string; kind?: string; status?: string; link?: string }) =>
    api.post<Document>('/documents', data),
  update: (id: string, data: Partial<Pick<Document, 'name' | 'kind' | 'status' | 'link' | 'milestoneId'>>) =>
    api.patch<Document>(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  attach: (docId: string, workOrderId: string) => api.post(`/documents/${docId}/attach/${workOrderId}`),
  detach: (docId: string, workOrderId: string) => api.delete(`/documents/${docId}/attach/${workOrderId}`),
}
