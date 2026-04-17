import { Body, Html, Text, render, toPlainText } from '../../src'

const html = await render(
  <Html lang='en'>
    <Body>
      <Text>Hello from hono-email.</Text>
    </Body>
  </Html>
)

const text = toPlainText(html)

console.log(html)
console.log('---')
console.log(text)
