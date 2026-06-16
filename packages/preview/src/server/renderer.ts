import { render } from 'hono-email'

export async function renderTemplate(
  component: Function,
  props: Record<string, unknown>,
): Promise<{ html: string; text: string; warnings: string[] }> {
  const element = component(props)
  return render(element, { strict: false, onWarning: 'silent' })
}
