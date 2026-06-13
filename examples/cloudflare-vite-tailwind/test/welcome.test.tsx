import { render } from 'hono-email'
import { describe, expect, it } from 'vitest'

import { createWelcomeEmailInput, WelcomeEmail } from '../src/emails/welcome'

const input = createWelcomeEmailInput({ subject: 'Welcome aboard', message: 'Hello there.' })

describe('WelcomeEmail', () => {
  it('renders with Tailwind utilities inlined by the built library', async () => {
    const { html, warnings } = await render(<WelcomeEmail {...input} />, { onWarning: 'silent' })

    expect(html).toContain('Welcome aboard')
    // Tailwind utilities (e.g. bg-white) are compiled by the EmailTailwind plugin
    // and inlined as styles by the library.
    expect(html).toContain('background-color')
    expect(Array.isArray(warnings)).toBe(true)
  })

  it('surfaces compatibility warnings for inspection', async () => {
    const { warnings } = await render(<WelcomeEmail {...input} />, { onWarning: 'silent' })

    // The design uses gradients/shadows/rounded corners that are not universally
    // supported, so the library reports them as compatibility warnings.
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('fails fast when warnings are treated as errors', async () => {
    await expect(render(<WelcomeEmail {...input} />, { onWarning: 'error' })).rejects.toThrow(
      'email warning(s)',
    )
  })
})
