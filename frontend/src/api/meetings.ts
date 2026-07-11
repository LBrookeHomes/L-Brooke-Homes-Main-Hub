import { api } from './client'

export type MeetingStatus = 'analyzing' | 'analyzed' | 'failed'
export type FollowUpStatus = 'open' | 'done' | 'archived' | 'paused'

export interface FollowUp {
  id: string
  meetingId: string
  title: string
  details: string | null
  dueDate: string | null
  status: FollowUpStatus
  pausedUntil: string | null
  remindedOn: string | null
  createdAt: string
  updatedAt: string
}

export interface UpcomingFollowUp extends FollowUp {
  meeting: { id: string; title: string }
}

// Shape returned by GET /api/meetings (list)
export interface MeetingListItem {
  id: string
  title: string
  status: MeetingStatus
  meetingDate: string | null
  createdAt: string
  followUpCount: number
}

// Shape returned by GET /api/meetings/:id and POST /analyze
export interface Meeting {
  id: string
  title: string
  sourceType: 'granola-link' | 'pasted-text'
  sourceUrl: string | null
  transcript: string
  summary: string | null
  decisions: string | null
  status: MeetingStatus
  meetingDate: string | null
  createdAt: string
  updatedAt: string
  followUps: FollowUp[]
}

export interface DigestResult {
  sent: boolean
  count: number
  overdue: number
  dueToday: number
  dueSoon: number
  reason?: string
  email?: string
}

export const meetingsApi = {
  list: () => api.get<MeetingListItem[]>('/meetings'),
  get: (id: string) => api.get<Meeting>(`/meetings/${id}`),
  analyze: (body: { link?: string; text?: string }) => api.post<Meeting>('/meetings/analyze', body),
  remove: (id: string) => api.delete<{ ok: true }>(`/meetings/${id}`),
  updateFollowUp: (
    id: string,
    fid: string,
    patch: Partial<{ status: FollowUpStatus; dueDate: string | null; pausedUntil: string | null; title: string; details: string }>
  ) => api.patch<FollowUp>(`/meetings/${id}/followups/${fid}`, patch),
  removeFollowUp: (id: string, fid: string) => api.delete<{ ok: true }>(`/meetings/${id}/followups/${fid}`),
  upcoming: () => api.get<UpcomingFollowUp[]>('/meetings/followups/upcoming'),
  runDigest: () => api.post<DigestResult>('/meetings/digest/run'),
}
