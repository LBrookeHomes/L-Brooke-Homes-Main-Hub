import { api } from './client'
import type { WorkOrder, WorkOrderPhoto } from '@weebrook/shared/types'

export const workOrdersApi = {
  list: (projectId: string) => api.get<WorkOrder[]>(`/work-orders/project/${projectId}`),
  get: (id: string) => api.get<WorkOrder>(`/work-orders/${id}`),
  create: (data: Partial<WorkOrder> & { projectId: string; trade: string; title: string }) =>
    api.post<WorkOrder>('/work-orders', data),
  update: (id: string, data: Partial<WorkOrder>) => api.patch<WorkOrder>(`/work-orders/${id}`, data),
  send: (id: string) => api.post<WorkOrder>(`/work-orders/${id}/send`),
  addPhoto: (id: string, s3Key: string, caption?: string) =>
    api.post<WorkOrderPhoto>(`/work-orders/${id}/photos`, { s3Key, caption }),
  removePhoto: (id: string, photoId: string) => api.delete(`/work-orders/${id}/photos/${photoId}`),
  delete: (id: string) => api.delete(`/work-orders/${id}`),
}

export async function uploadPhoto(file: File): Promise<string> {
  const { uploadUrl, s3Key } = await api.post<{ uploadUrl: string; s3Key: string }>(
    '/public/upload-url',
    { filename: file.name, contentType: file.type }
  )
  await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  return s3Key
}
