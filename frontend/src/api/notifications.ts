import { api } from './client'
import type { Notification } from '@weebrook/shared/types'

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
}
