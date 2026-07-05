import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
})

const FROM = process.env.SES_FROM_EMAIL || 'noreply@weebrook.app'

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Email stub] To: ${to} | Subject: ${subject}\n${text}`)
    return
  }
  await ses.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Text: { Data: text, Charset: 'UTF-8' } },
      },
    })
  )
}
