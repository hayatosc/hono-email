import { describe, expect, test } from 'bun:test'

import { render } from '../index'
import { prettyPrintHtml } from './pretty'

describe('render pretty output', () => {
  test('returns HTML output with a doctype', async () => {
    const { html } = await render(
      <html>
        <body>
          <p>Hello</p>
        </body>
      </html>,
      { pretty: true },
    )

    expect(html).toStartWith('<!DOCTYPE html>')
    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('\n<html>')
    expect(html).toContain('\n  <body>')
  })

  test('preserves whitespace inside preformatted content', async () => {
    const code = ['function greet() {', '  console.log(42);', '    return true;', '}'].join('\n')
    const { html } = await render(<pre>{code}</pre>, { doctype: false, pretty: true })

    expect(html).toContain(`<pre>${code}</pre>`)
  })

  test('preserves Outlook conditional comments', () => {
    const conditional = '<!--[if mso]>  <td>  x  </td>  <![endif]-->'

    expect(prettyPrintHtml(conditional)).toBe(conditional)
  })
})
