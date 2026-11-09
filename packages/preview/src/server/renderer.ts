import { inlineCidImagesAsDataUrls, render, type EmailAttachment } from 'hono-email'
import { jsx, type Child } from 'hono/jsx'

export type RenderTemplateOptions = {
  locale?: string | undefined
  attachments?: EmailAttachment[] | undefined
}

export async function renderTemplate(
  component: (props: Record<string, unknown>) => Child,
  props: Record<string, unknown>,
  options: RenderTemplateOptions = {},
): Promise<{ html: string; text: string; warnings: string[] }> {
  const element = jsx(component, props)
  const result = await render(element, {
    strict: true,
    onWarning: 'silent',
    ...(options.locale !== undefined ? { locale: options.locale } : {}),
  })
  const html = await inlineCidImagesAsDataUrls(result.html, options.attachments)
  return {
    ...result,
    html,
  }
}
