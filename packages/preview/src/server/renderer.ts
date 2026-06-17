import { render } from 'hono-email'

export async function renderTemplate(
  component: Function,
  props: Record<string, unknown>,
  const element = component(props)
  return render(element, { strict: true, onWarning: 'silent' })
}
