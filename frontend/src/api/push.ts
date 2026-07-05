import { api } from './client'

export async function registerPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const { key } = await api.get<{ key: string }>('/auth/vapid-public-key')
  if (!key) return

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
    })
  }

  await api.post('/auth/push-subscribe', { subscription: sub.toJSON() })
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
