import { Body, Button, Container, Head, Heading, Html, Preview, Tailwind, Text, render } from 'hono-email'

export type WelcomeEmailInput = {
  dashboardUrl: string
  supportUrl: string
  userName: string
}

const WelcomeEmail = ({ dashboardUrl, supportUrl, userName }: WelcomeEmailInput) => (
  <Html lang='en'>
    <Head>
      <title>Welcome to hono-email</title>
    </Head>
    <Preview>Your account is ready. Open your dashboard to continue.</Preview>
    <Tailwind>
      <Body className='bg-slate-100'>
        <Container className='p-6'>
          <Container className='bg-white border border-slate-300 rounded-lg p-6'>
            <Text className='text-slate-900 mb-4'>hono-email</Text>
            <Heading as='h1' className='text-slate-900 text-2xl sm:text-3xl font-semibold mb-4'>
              Welcome, {userName}
            </Heading>
            <Text className='text-slate-900 mb-4'>
              Your account is ready. Continue from your dashboard and finish the initial setup.
            </Text>
            <Button href={dashboardUrl} className='inline-block bg-slate-900 text-white rounded-lg px-4 py-2'>
              Open dashboard
            </Button>
            <Text className='text-slate-900 mb-4'>
              Need help? Visit <a href={supportUrl}>support</a>.
            </Text>
          </Container>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export const renderWelcomeEmail = (input: WelcomeEmailInput): Promise<string> => render(<WelcomeEmail {...input} />)
