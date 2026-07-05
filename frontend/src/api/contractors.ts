import { api } from './client'

export const TRADES = ['plumbing', 'electrical', 'masonry', 'carpentry', 'finish', 'painting', 'landscaping', 'hvac', 'roofing', 'tiling', 'drywall', 'general'] as const
export type Trade = typeof TRADES[number]

export interface Contractor {
  id: string
  name: string
  phone: string
  email: string | null
  trade: Trade
  notes: string | null
  active: boolean
  isRetired: boolean
}

export const contractorsApi = {
  list: () => api.get<Contractor[]>('/contractors'),
  create: (data: { name: string; phone: string; email?: string; trade: Trade; notes?: string }) =>
    api.post<Contractor>('/contractors', data),
  retire: (id: string) => api.post<Contractor>(`/contractors/${id}/retire`),
}
