import dotenv from 'dotenv'

import NodeConnector from 'hono-email/smtp/node'
import { SmtpTransport, sendEmail } from 'hono-email/smtp'

import { LoginEmail } from './emails/login'

dotenv.config()

const requireEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const smtp = new SmtpTransport({
  connector: NodeConnector,
  hostname: requireEnv('SMTP_HOST'),
  port: Number(requireEnv('SMTP_PORT')),
  auth: {
    username: requireEnv('SMTP_USER'),
    password: requireEnv('SMTP_PASS'),
  },
})

try {
  const receipt = await sendEmail({
    adapter: smtp,
    from: requireEnv('SMTP_FROM'),
    to: requireEnv('SMTP_TO'),
    subject: 'Your login code',
    jsx: <LoginEmail code="123456" expiresInMinutes={10} />,
  })

  if (receipt.successful) {
    console.log('Sent:', receipt.messageId)
  } else {
    console.error('Failed:', receipt.errorMessages.join(', '))
    process.exit(1)
  }
} finally {
  await smtp.close()
}
