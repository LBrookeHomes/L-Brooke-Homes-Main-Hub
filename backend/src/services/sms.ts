import twilio from 'twilio'

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) return null
    client = twilio(sid, token)
  }
  return client
}

export async function sendSms(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_FROM_NUMBER
  const twilio = getClient()
  if (!twilio || !from) {
    console.log(`[SMS stub] To: ${to}\n${body}`)
    return
  }
  await twilio.messages.create({ to, from, body })
}
