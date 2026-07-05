import webpush from 'web-push'
import prisma from '../lib/prisma'
import { sendSms } from './sms'
import { sendEmail } from './email'
import { sendPush } from './push'

interface NotifyPayload {
  event: string
  subject: string
  body: string
  metadata?: Record<string, unknown>
}

async function logNotification(
  type: 'sms' | 'email' | 'push',
  recipientId: string,
  recipientType: 'gc' | 'client' | 'contractor',
  payload: NotifyPayload,
  status: 'sent' | 'failed'
) {
  await prisma.notification.create({
    data: {
      type,
      recipientId,
      recipientType,
      subject: payload.subject,
      body: payload.body,
      status,
      metadata: (payload.metadata || {}) as Record<string, string>,
    },
  })
}

const notify = {
  async toContractor(
    contractor: { id: string; phone: string },
    payload: NotifyPayload
  ): Promise<void> {
    try {
      await sendSms(contractor.phone, payload.body)
      await logNotification('sms', contractor.id, 'contractor', payload, 'sent')
    } catch (err) {
      await logNotification('sms', contractor.id, 'contractor', payload, 'failed')
      console.error('SMS to contractor failed:', err)
    }
  },

  async toClient(
    client: { id: string; email: string; phone?: string | null; notifPrefs: unknown; pushSubs: unknown },
    payload: NotifyPayload
  ): Promise<void> {
    const prefs = (client.notifPrefs as { email?: boolean; sms?: boolean; push?: boolean }) || {}

    if (prefs.email !== false) {
      try {
        await sendEmail(client.email, payload.subject, payload.body)
        await logNotification('email', client.id, 'client', payload, 'sent')
      } catch (err) {
        await logNotification('email', client.id, 'client', payload, 'failed')
        console.error('Email to client failed:', err)
      }
    }

    if (prefs.sms && client.phone) {
      try {
        await sendSms(client.phone, payload.body)
        await logNotification('sms', client.id, 'client', payload, 'sent')
      } catch (err) {
        await logNotification('sms', client.id, 'client', payload, 'failed')
        console.error('SMS to client failed:', err)
      }
    }

    if (prefs.push) {
      const subs = (client.pushSubs as webpush.PushSubscription[]) || []
      const deadSubs: string[] = []
      for (const sub of subs) {
        try {
          await sendPush(sub as any, { title: payload.subject, body: payload.body, data: payload.metadata })
          await logNotification('push', client.id, 'client', payload, 'sent')
        } catch (err: any) {
          if (err?.statusCode === 410) deadSubs.push((sub as any).endpoint)
          await logNotification('push', client.id, 'client', payload, 'failed')
        }
      }
      if (deadSubs.length) {
        await prisma.client.update({
          where: { id: client.id },
          data: { pushSubs: subs.filter((s: any) => !deadSubs.includes(s.endpoint)) as any },
        })
      }
    }
  },

  async toGC(
    gc: { id: string; pushSubs: unknown },
    payload: NotifyPayload
  ): Promise<void> {
    const subs = (gc.pushSubs as any[]) || []
    const deadSubs: string[] = []
    for (const sub of subs) {
      try {
        await sendPush(sub, { title: payload.subject, body: payload.body, data: payload.metadata })
        await logNotification('push', gc.id, 'gc', payload, 'sent')
      } catch (err: any) {
        if (err?.statusCode === 410) deadSubs.push(sub.endpoint)
        await logNotification('push', gc.id, 'gc', payload, 'failed')
      }
    }
    if (deadSubs.length) {
      await prisma.gCUser.update({
        where: { id: gc.id },
        data: { pushSubs: subs.filter((s) => !deadSubs.includes(s.endpoint)) },
      })
    }
  },
}

export default notify
