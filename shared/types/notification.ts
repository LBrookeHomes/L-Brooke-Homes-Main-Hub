export type NotificationType = 'sms' | 'email' | 'push'
export type NotificationRecipientType = 'gc' | 'client' | 'contractor'
export type NotificationStatus = 'sent' | 'delivered' | 'failed'

export interface Notification {
  id: string
  type: NotificationType
  recipientId: string
  recipientType: NotificationRecipientType
  subject: string | null
  body: string
  status: NotificationStatus
  sentAt: string
  metadata: Record<string, unknown>
}
