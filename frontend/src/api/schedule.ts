import { api } from './client'

// Statuses match the old Airtable/Tasklet app exactly.
export const STATUSES = [
  'Planning',
  'Material to order',
  'Waiting on stock',
  'Schedule',
  'On Going',
  'On Hold',
  'Completed',
] as const

export type Status = typeof STATUSES[number]

export interface Worker {
  id: string
  name: string
  email: string | null
  phone: string | null
  active: boolean
  createdAt: string
}

export interface JobLocation {
  id: string
  name: string
  active: boolean
  createdAt: string
}

export interface WorkItem {
  id: string
  jobDetails: string
  status: Status
  timeline: string | null
  jobDate: string | null
  day: string | null
  notes: string | null
  materialRequired: boolean
  startTime: string | null
  endTime: string | null
  plannedHours: number | null
  paymentStatus: string | null
  purchasingItems: string | null
  firstStop: boolean
  endOfDay: boolean
  createdAt: string
  updatedAt: string
  workerIds: string[]
  workerNames: string[]
  locationIds: string[]
  locationNames: string[]
}

export interface WorkItemInput {
  jobDetails: string
  status?: Status
  timeline?: string | null
  jobDate?: string | null
  day?: string | null
  notes?: string | null
  materialRequired?: boolean
  startTime?: string | null
  endTime?: string | null
  plannedHours?: number | null
  paymentStatus?: string | null
  purchasingItems?: string | null
  firstStop?: boolean
  endOfDay?: boolean
  workerIds?: string[]
  locationIds?: string[]
}

export const scheduleApi = {
  fetchWorkers: () => api.get<Worker[]>('/schedule/workers'),
  createWorker: (data: { name: string; email?: string; phone?: string }) =>
    api.post<Worker>('/schedule/workers', data),
  updateWorker: (id: string, data: Partial<{ name: string; email: string | null; phone: string | null; active: boolean }>) =>
    api.patch<Worker>(`/schedule/workers/${id}`, data),
  deleteWorker: (id: string) => api.delete<{ ok: true }>(`/schedule/workers/${id}`),

  fetchLocations: () => api.get<JobLocation[]>('/schedule/locations'),
  createLocation: (name: string) => api.post<JobLocation>('/schedule/locations', { name }),
  deleteLocation: (id: string) => api.delete<{ ok: true }>(`/schedule/locations/${id}`),

  fetchWorkItems: () => api.get<WorkItem[]>('/schedule/work-items'),
  createWorkItem: (data: WorkItemInput) => api.post<WorkItem>('/schedule/work-items', data),
  updateWorkItemFull: (id: string, data: Partial<WorkItemInput>) =>
    api.patch<WorkItem>(`/schedule/work-items/${id}`, data),
  updateWorkItemStatus: (id: string, status: Status) =>
    api.patch<WorkItem>(`/schedule/work-items/${id}/status`, { status }),
  deleteWorkItem: (id: string) => api.delete<{ ok: true }>(`/schedule/work-items/${id}`),

  sendCrewPush: (workerId: string, message: string) =>
    api.post<{ ok: true }>('/schedule/crew-push', { workerId, message }),
}
