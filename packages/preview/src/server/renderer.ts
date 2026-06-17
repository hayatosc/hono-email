import { render } from 'hono-email'
import type { Child } from 'hono/jsx'

export async function renderTemplate(
  component: (props: Record<string, unknown>) => Child,
  props: Record<string, unknown>,
) {
  const element = component(props)
  return render(element, { strict: true, onWarning: 'silent' })
}
