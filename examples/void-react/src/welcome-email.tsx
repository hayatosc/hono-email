/** @jsxImportSource hono/jsx */
import { Body, Container, Heading, Html, Text } from 'hono-email'
import { sendEmail } from 'hono-email/adapter'
import { VoidEmailAdapter } from 'hono-email/void'
import { sendEmail as sendWithVoid } from 'void/email'

const adapter = VoidEmailAdapter({ sendEmail: sendWithVoid })

export function sendWelcomeEmail(name: string) {
  return sendEmail({
    adapter,
    from: 'Example <welcome@example.com>',
    to: 'preview@example.com',
    subject: 'Your local welcome email',
    jsx: (
      <Html lang="en">
        <Body>
          <Container>
            <Heading>Welcome, {name}!</Heading>
            <Text>This message was rendered by hono-email and captured by Void.</Text>
          </Container>
        </Body>
      </Html>
    ),
  })
}
