import { Html, Body, Text, Button } from 'hono-email'

type Props = {
  customerName?: string
  orderId?: string
  items?: string[]
  showButton?: boolean
}

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
