import {
  Html,
  Body,
  Container,
  Head,
  Heading,
  Preview,
  Text,
  Button,
  Section,
  Hr,
  Column,
  Link,
} from 'hono-email'

import type { PreviewPropsConfig } from '../src/props/index.js'

export const previewProps = {
  customerName: { type: 'string', default: 'Taro' },
  orderId: { type: 'string', default: '987654321' },
  date: { type: 'string', default: 'June 16, 2026' },
  items: {
    type: 'array',
    item: {
      name: { type: 'string' },
      variant: { type: 'string' },
      price: { type: 'string' },
      qty: { type: 'number' },
    },
    default: [
      { name: 'Mechanical Keyboard', variant: 'Tactile · Walnut', price: '$120.00', qty: 1 },
      { name: 'Wireless Mouse', variant: 'Graphite', price: '$55.00', qty: 2 },
    ],
  },
  subtotal: { type: 'string', default: '$230.00' },
  shipping: { type: 'string', default: '$8.00' },
  tax: { type: 'string', default: '$19.04' },
  total: { type: 'string', default: '$257.04' },
  shippingAddress: {
    type: 'string',
    multiline: true,
    default: 'Taro Sasaki\n123 Market Street, Suite 400\nSan Francisco, CA 94103',
  },
  estimatedDelivery: { type: 'string', default: 'Jun 20 – Jun 23' },
  showButton: { type: 'boolean', default: true },
} satisfies PreviewPropsConfig

type Item = {
  name: string
  variant?: string
  price: string
  qty: number
}

type Props = {
  customerName?: string
  orderId?: string
  date?: string
  items?: Item[]
  subtotal?: string
  shipping?: string
  tax?: string
  total?: string
  shippingAddress?: string
  estimatedDelivery?: string
  showButton?: boolean
}

const mutedLink = { color: '#71717a', textDecoration: 'underline' }
const summaryLabel = { margin: '0 0 8px', color: '#71717a', fontSize: '14px' }
const summaryValue = { margin: '0 0 8px', color: '#3f3f46', fontSize: '14px' }

export default function OrderConfirmation({
  customerName = 'Taro',
  orderId = '987654321',
  date = 'June 16, 2026',
  items = [
    { name: 'Mechanical Keyboard', variant: 'Tactile · Walnut', price: '$120.00', qty: 1 },
    { name: 'Wireless Mouse', variant: 'Graphite', price: '$55.00', qty: 2 },
  ],
  subtotal = '$230.00',
  shipping = '$8.00',
  tax = '$19.04',
  total = '$257.04',
  shippingAddress = 'Taro Sasaki\n123 Market Street, Suite 400\nSan Francisco, CA 94103',
  estimatedDelivery = 'Jun 20 – Jun 23',
  showButton = true,
}: Props) {
  const addressLines = shippingAddress.split('\n')

  return (
    <Html>
      <Head>
        <title>Order #{orderId} confirmed</title>
      </Head>
      <Preview>
        Order #{orderId} is confirmed — estimated delivery {estimatedDelivery}.
      </Preview>
      <Body
        style={{
          backgroundColor: '#f4f4f5',
          fontFamily: 'Helvetica, Arial, sans-serif',
          padding: '40px 0',
          margin: 0,
          color: '#3f3f46',
        }}
      >
        <Container style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
          {/* Logo header */}
          <Section>
            <Column style={{ padding: '0 8px 24px', verticalAlign: 'middle' }}>
              <span
                style={{
                  display: 'inline-block',
                  height: '32px',
                  width: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: '32px',
                  fontWeight: 'bold',
                  fontSize: '18px',
                }}
              >
                A
              </span>
              <span
                style={{
                  marginLeft: '12px',
                  verticalAlign: 'middle',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#18181b',
                  letterSpacing: '-0.01em',
                }}
              >
                Acme Store
              </span>
            </Column>
            <Column style={{ padding: '0 8px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
              <Text style={{ margin: 0, fontSize: '13px', color: '#a1a1aa' }}>
                Order #{orderId}
              </Text>
            </Column>
          </Section>

          {/* Card */}
          <Container
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e4e4e7',
            }}
          >
            {/* Confirmation hero */}
            <Section>
              <Column style={{ padding: '36px 40px 0' }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#16a34a',
                  }}
                >
                  ✓ Order confirmed
                </Text>
                <Heading
                  style={{
                    color: '#18181b',
                    fontSize: '24px',
                    margin: '12px 0 0',
                    fontWeight: 'bold',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Thanks, {customerName}!
                </Heading>
                <Text
                  style={{
                    fontSize: '15px',
                    color: '#52525b',
                    lineHeight: '24px',
                    margin: '12px 0 0',
                  }}
                >
                  We've received your order placed on {date} and we're getting it ready. You'll get
                  a tracking link as soon as it ships.
                </Text>
              </Column>
            </Section>

            {/* Delivery + address box */}
            <Section>
              <Column style={{ padding: '24px 40px 0' }}>
                <Container
                  style={{
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f1',
                  }}
                >
                  <Section>
                    <Column style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                      <Text
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#a1a1aa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Estimated delivery
                      </Text>
                      <Text
                        style={{
                          margin: '4px 0 0',
                          fontSize: '15px',
                          fontWeight: 'bold',
                          color: '#18181b',
                        }}
                      >
                        {estimatedDelivery}
                      </Text>
                    </Column>
                    <Column
                      style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'top' }}
                    >
                      <Text
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#a1a1aa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Ship to
                      </Text>
                      <Text
                        style={{
                          margin: '4px 0 0',
                          fontSize: '13px',
                          color: '#52525b',
                          lineHeight: '18px',
                        }}
                      >
                        {addressLines.map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < addressLines.length - 1 && <br />}
                          </span>
                        ))}
                      </Text>
                    </Column>
                  </Section>
                </Container>
              </Column>
            </Section>

            {/* Order summary heading */}
            <Section>
              <Column style={{ padding: '28px 40px 0' }}>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#a1a1aa',
                  }}
                >
                  Order summary
                </Text>
              </Column>
            </Section>

            {/* Line items */}
            {items.map((item, i) => (
              <Section key={i}>
                <Column
                  style={{
                    width: '48px',
                    padding: '14px 0 14px 40px',
                    verticalAlign: 'top',
                    borderBottom: '1px solid #f4f4f5',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      height: '40px',
                      width: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#f4f4f5',
                      color: '#a1a1aa',
                      textAlign: 'center',
                      lineHeight: '40px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}
                  >
                    {item.name.charAt(0)}
                  </span>
                </Column>
                <Column
                  style={{
                    padding: '14px 0 14px 12px',
                    verticalAlign: 'top',
                    borderBottom: '1px solid #f4f4f5',
                  }}
                >
                  <Text
                    style={{ margin: 0, color: '#18181b', fontWeight: 'bold', fontSize: '14px' }}
                  >
                    {item.name}
                  </Text>
                  {item.variant && (
                    <Text style={{ margin: '3px 0 0', color: '#a1a1aa', fontSize: '13px' }}>
                      {item.variant}
                    </Text>
                  )}
                  <Text style={{ margin: '3px 0 0', color: '#71717a', fontSize: '13px' }}>
                    Qty {item.qty}
                  </Text>
                </Column>
                <Column
                  style={{
                    width: '80px',
                    padding: '14px 40px 14px 0',
                    textAlign: 'right',
                    verticalAlign: 'top',
                    borderBottom: '1px solid #f4f4f5',
                  }}
                >
                  <Text
                    style={{ margin: 0, color: '#18181b', fontWeight: 'bold', fontSize: '14px' }}
                  >
                    {item.price}
                  </Text>
                </Column>
              </Section>
            ))}

            {/* Price breakdown */}
            <Section>
              <Column style={{ width: '60%', padding: '20px 0 0 40px' }}>
                <Text style={summaryLabel}>Subtotal</Text>
                <Text style={summaryLabel}>Shipping</Text>
                <Text style={summaryLabel}>Estimated tax</Text>
              </Column>
              <Column style={{ width: '40%', padding: '20px 40px 0 0', textAlign: 'right' }}>
                <Text style={summaryValue}>{subtotal}</Text>
                <Text style={summaryValue}>{shipping}</Text>
                <Text style={summaryValue}>{tax}</Text>
              </Column>
            </Section>

            <Section>
              <Column style={{ padding: '8px 40px 0' }}>
                <Hr style={{ borderColor: '#e4e4e7', margin: '0 0 16px' }} />
              </Column>
            </Section>

            <Section>
              <Column style={{ width: '60%', padding: '0 0 0 40px' }}>
                <Text style={{ margin: 0, color: '#18181b', fontWeight: 'bold', fontSize: '16px' }}>
                  Total
                </Text>
              </Column>
              <Column style={{ width: '40%', padding: '0 40px 0 0', textAlign: 'right' }}>
                <Text style={{ margin: 0, color: '#18181b', fontWeight: 'bold', fontSize: '16px' }}>
                  {total}
                </Text>
              </Column>
            </Section>

            {showButton && (
              <Section>
                <Column style={{ padding: '32px 40px 40px', textAlign: 'center' }}>
                  <Button
                    href={`https://example.com/orders/${orderId}`}
                    style={{
                      backgroundColor: '#18181b',
                      color: '#ffffff',
                      padding: '14px 32px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '15px',
                    }}
                  >
                    View your order
                  </Button>
                </Column>
              </Section>
            )}
          </Container>

          {/* Support + footer */}
          <Section>
            <Column style={{ padding: '24px 24px 8px', textAlign: 'center' }}>
              <Text style={{ margin: 0, fontSize: '13px', color: '#71717a', lineHeight: '20px' }}>
                Need to make a change? Contact us at{' '}
                <Link href="mailto:support@example.com" style={mutedLink}>
                  support@example.com
                </Link>{' '}
                within 1 hour of ordering.
              </Text>
            </Column>
          </Section>

          <Section>
            <Column style={{ padding: '8px 24px 0', textAlign: 'center' }}>
              <Text style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: '18px' }}>
                Acme Store · 123 Market Street, Suite 400 · San Francisco, CA 94103
              </Text>
              <Text style={{ margin: '8px 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                <Link href="https://example.com/orders" style={mutedLink}>
                  Order history
                </Link>
                {'  ·  '}
                <Link href="https://example.com/help" style={mutedLink}>
                  Help center
                </Link>
                {'  ·  '}
                <Link href="https://example.com/returns" style={mutedLink}>
                  Returns
                </Link>
              </Text>
              <Text style={{ margin: '8px 0 0', fontSize: '12px', color: '#d4d4d8' }}>
                © 2026 Acme Store, Inc.
              </Text>
            </Column>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
