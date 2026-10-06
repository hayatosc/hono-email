import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Body, Head, Html, Text, render } from 'hono-email'
import { css, Style } from 'hono/css'
import { jsx } from 'hono/jsx/jsx-runtime'

const email = (children, includeStyle = true) =>
  jsx(Html, {
    children: [
      jsx(Head, { children: includeStyle ? jsx(Style, {}) : null }),
      jsx(Body, { children }),
    ],
  })

await test('inlines synchronous hono/css and keeps responsive CSS in the head', async () => {
  const className = css`
    color: #123456;
    padding-inline: 1rem;
    @media (width >= 40rem) {
      color: #654321;
    }
  `
  const result = await render(email(jsx(Text, { className, children: 'CSS' })), {
    onWarning: 'silent',
  })
  assert.ok(result.html.includes('color:#123456'))
  assert.ok(result.html.includes('padding-left:16px'))
  assert.match(result.html, /<head[^>]*>[\s\S]*@media[\s\S]*<\/head>/)
  assert.ok(!result.html.includes('id="hono-css"'))
  assert.equal(result.text, 'CSS')
})

await test('collects hono/css created after an asynchronous component resumes', async () => {
  const AsyncText = async () => {
    await Promise.resolve()
    const className = css`
      color: #234567;
      padding-inline: 1rem;
    `
    return jsx(Text, { className, children: 'Async CSS' })
  }
  const result = await render(email(jsx(AsyncText, {})), { onWarning: 'silent' })
  assert.ok(result.html.includes('color:#234567'))
  assert.ok(result.html.includes('padding-right:16px'))
  assert.ok(!result.html.includes('<script'))
  assert.ok(!result.html.includes('id="hono-css"'))
  assert.equal(result.text, 'Async CSS')
})

await test('rejects missing hono/css Style before final output', async () => {
  const className = css`
    color: #345678;
  `
  await assert.rejects(
    render(email(jsx(Text, { className, children: 'Missing Style' }), false)),
    /hono\/css styles require <Head><Style \/><\/Head>/,
  )
})
