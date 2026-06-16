import { Html, Body, Text } from 'hono-email'

export default function WelcomeEmail({ name = 'Guest' }: { name?: string }) {
  return (
    <Html>
      <Body>
        <Text style={{ color: '#3b82f6', fontSize: '16px' }}>Hello {name}!</Text>
      </Body>
    </Html>
  )
}
