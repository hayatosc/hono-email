import { Html, Body, Text } from 'hono-email'

import type { PreviewPropsConfig } from '../src/props/index.js'

export const previewProps = {
  name: { type: 'string', default: 'Guest' },
} satisfies PreviewPropsConfig

export default function WelcomeEmail({ name = 'Guest' }: { name?: string }) {
  return (
    <Html>
      <Body>
        <Text style={{ color: '#3b82f6', fontSize: '16px' }}>Hello {name}!</Text>
      </Body>
    </Html>
  )
}
