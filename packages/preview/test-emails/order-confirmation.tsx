import { Html, Body, Text, Button } from 'hono-email'

import type { PreviewPropsConfig } from '../src/props/index.js'

type Props = {
  customerName?: string
  orderId?: string
  items?: string[]
  showButton?: boolean
}

export const previewProps = {
  customerName: { type: 'string', default: 'Guest' },
  orderId: { type: 'string', default: '0000' },
  items: { type: 'array', default: ['Widget A', 'Widget B'] },
  showButton: { type: 'boolean', default: true },
} satisfies PreviewPropsConfig

export default function OrderConfirmation({
  customerName = 'Guest',
  orderId = '0000',
  items = [],
  showButton = true,
}: Props) {
  return (
    <Html>
      <Body>
        <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>Hi {customerName},</Text>
        <Text>Your order #{orderId} has been confirmed.</Text>
        <Text style={{ fontWeight: 'bold' }}>Items:</Text>
        <ul>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {showButton && <Button href={`https://example.com/orders/${orderId}`}>View Order</Button>}
      </Body>
    </Html>
  )
}
