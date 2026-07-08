import { render } from 'hono-email'
import type { Child } from 'hono/jsx'

export async function renderTemplate(
  component: (props: Record<string, unknown>) => Child,
  props: Record<string, unknown>,
): Promise<{ html: string; text: string; warnings: string[] }> {
  const element = component(props)
  return render(element, { strict: true, onWarning: 'silent' })
}
