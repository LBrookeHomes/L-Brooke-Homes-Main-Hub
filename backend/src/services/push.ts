import webpush from 'web-push'

let initialized = false

function init() {
  if (initialized) return
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@weebrook.app'
  if (!pub || !priv) return
  webpush.setVapidDetails(subject, pub, priv)
  initialized = true
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  init()
  if (!initialized) {
    console.log(`[Push stub] ${payload.title}: ${payload.body}`)
    return
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err: any) {
    // 410 = subscription expired/unsubscribed; caller should remove it
    if (err.statusCode === 410) throw err
    console.error('Push failed:', err.message)
  }
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || ''
}
