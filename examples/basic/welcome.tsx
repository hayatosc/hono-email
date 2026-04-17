import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, render, toPlainText } from '../../src'

const html = await render(
  <Html lang='ja'>
    <Head>
      <title>Welcome</title>
    </Head>
    <Preview>アカウント登録が完了しました。</Preview>
    <Body style={{ backgroundColor: '#f6f9fc', color: '#1f2937' }}>
      <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
        <Heading as='h1'>ようこそ</Heading>
        <Text>登録ありがとうございます。</Text>
        <Section>
          <Text>以下のリンクからセットアップを続けてください。</Text>
          <Button href='https://example.com/start'>はじめる</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

const text = toPlainText(html)

console.log(html)
console.log('---')
console.log(text)
