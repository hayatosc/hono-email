/** Starter template shown when the playground opens without shared code. */
export const DEFAULT_TEMPLATE = `import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'hono-email'

export default function WelcomeEmail() {
  const name = 'Ada'

  return (
    <Html lang="en">
      <Head>
        <title>Welcome</title>
      </Head>
      <Preview>Your account is ready.</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', color: '#1f2937' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
          <Heading as="h1">Welcome, {name}!</Heading>
          <Text>Thanks for signing up. Your account is ready to use.</Text>
          <Button
            href="https://example.com/start"
            style={{
              backgroundColor: '#ea580c',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '6px',
            }}
          >
            Get started
          </Button>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            You received this email because you signed up at example.com.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
`
