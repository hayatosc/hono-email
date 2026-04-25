import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from 'hono-email'
import { Style, css } from 'hono/css'

export type LoginEmailProps = {
  code: string
  expiresInMinutes?: number
}

const body = css`
  background-color: #f4f4f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const card = css`
  max-width: 480px;
  margin: 40px auto;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e4e7;
`

const header = css`
  background-color: #09090b;
  padding: 24px 32px;
`

const brand = css`
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.3px;
  margin: 0;
`

const content = css`
  padding: 32px;
`

const heading = css`
  color: #09090b;
  font-size: 22px;
  font-weight: 600;
  line-height: 32px;
  margin: 0 0 8px;
`

const lead = css`
  color: #52525b;
  font-size: 15px;
  line-height: 24px;
  margin: 0 0 24px;
`

const codeBox = css`
  background-color: #f4f4f5;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  margin: 0 0 20px;
`

const codeText = css`
  color: #09090b;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 10px;
  margin: 0;
`

const expiry = css`
  color: #71717a;
  font-size: 13px;
  line-height: 20px;
  margin: 0 0 20px;
`

const footer = css`
  color: #a1a1aa;
  font-size: 12px;
  line-height: 20px;
  margin: 0;
`

export function LoginEmail({ code, expiresInMinutes = 10 }: LoginEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <title>Your login code</title>
        <Style />
      </Head>
      <Preview>Your login code: {code}</Preview>
      <Body className={body}>
        <Container className={card}>
          <Container className={header}>
            <Text className={brand}>MyApp</Text>
          </Container>
          <Container className={content}>
            <Heading as="h1" className={heading}>
              Your login code
            </Heading>
            <Text className={lead}>
              Enter the code below to sign in to your account. It expires in {expiresInMinutes}{' '}
              minutes.
            </Text>
            <Container className={codeBox}>
              <Text className={codeText}>{code}</Text>
            </Container>
            <Text className={expiry}>
              If you did not request this code, you can safely ignore this email. Someone may have
              entered your email address by mistake.
            </Text>
            <Hr />
            <Text className={footer}>
              This is an automated message from MyApp. Please do not reply to this email.
            </Text>
          </Container>
        </Container>
      </Body>
    </Html>
  )
}
