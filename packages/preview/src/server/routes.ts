import { Hono } from 'hono'
import type { EmailAttachment } from 'hono-email'
import { HTTPException } from 'hono/http-exception'
import type { Child } from 'hono/jsx'

import { discoverTemplates } from '../discovery/index.js'
import {
  MissingRequiredPropsError,
  extractPropsSchema,
  mergePropsWithDefaults,
  resolveComponent,
} from '../props/index.js'
import { renderTemplate } from './renderer.js'

type LoadModule = (url: string) => Promise<Record<string, unknown>>

type ApiEnv = {
  Variables: {
    mod: Record<string, unknown>
    component: (props: Record<string, unknown>) => Child
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidAttachment(item: unknown): item is EmailAttachment {
  if (!isObject(item)) return false
  if ('cid' in item && item.cid !== undefined && typeof item.cid !== 'string') return false
  if ('filename' in item && item.filename !== undefined && typeof item.filename !== 'string')
    return false
  if (
    'contentType' in item &&
    item.contentType !== undefined &&
    typeof item.contentType !== 'string'
  )
    return false
  return true
}

function sanitizeClientAttachment(item: unknown): EmailAttachment | null {
  if (!isValidAttachment(item)) return null
  // Prevent SSRF: request-supplied attachments may only carry inline content or data URIs.
  // Any non-string href/path is rejected too, because fetch() would stringify it into a URL.
  if ('href' in item && item.href !== undefined) return null
  if ('httpHeaders' in item && item.httpHeaders !== undefined) return null
  if (
    'path' in item &&
    item.path !== undefined &&
    (typeof item.path !== 'string' || !/^data:/i.test(item.path))
  )
    return null
  if ('content' in item && item.content !== undefined && typeof item.content !== 'string')
    return null
  return item
}

export function createApiRoutes(loadModule: LoadModule, templateDir: string): Hono<ApiEnv> {
  return new Hono<ApiEnv>()
    .basePath('/api')
    .use('/templates/:name/*', async (c, next) => {
      const name = c.req.param('name')
      const templates = discoverTemplates(templateDir)
      const entry = templates.find((t) => t.name === name)
      if (!entry) {
        throw new HTTPException(404, { message: 'Template not found' })
      }

      const mod = await loadModule(entry.filePath)
      const component = resolveComponent(mod)
      if (!component) {
        throw new HTTPException(400, { message: 'No exported component function found' })
      }

      c.set('mod', mod)
      c.set('component', component)
      await next()
    })
    .get('/templates', (c) => {
      const templates = discoverTemplates(templateDir)
      return c.json(templates.map((t) => ({ name: t.name })))
    })
    .get('/templates/:name/props', (c) => {
      return c.json(extractPropsSchema(c.var.mod))
    })
    .post('/templates/:name/render', async (c) => {
      const body = await c.req.json().catch(() => ({}))
      const props = isObject(body) && isObject(body.props) ? body.props : {}
      const schema = extractPropsSchema(c.var.mod)
      const mergedProps = mergePropsWithDefaults(schema, props)
      const locale =
        isObject(body) && typeof body.locale === 'string'
          ? body.locale
          : typeof mergedProps.locale === 'string'
            ? mergedProps.locale
            : undefined

      let attachments: EmailAttachment[] | undefined
      if (isObject(body) && Array.isArray(body.attachments)) {
        attachments = body.attachments
          .map(sanitizeClientAttachment)
          .filter((a): a is EmailAttachment => a !== null)
      } else if (Array.isArray(c.var.mod.attachments)) {
        attachments = c.var.mod.attachments.filter(isValidAttachment)
      }

      const result = await renderTemplate(c.var.component, mergedProps, {
        ...(locale !== undefined ? { locale } : {}),
        ...(attachments !== undefined ? { attachments } : {}),
      })
      return c.json(result)
    })
    .onError((err, c) => {
      if (err instanceof HTTPException) {
        return c.json({ error: err.message }, err.status)
      }
      if (err instanceof MissingRequiredPropsError) {
        return c.json({ error: err.message }, 400)
      }
      console.error('Failed to handle preview API request:', err)
      return c.json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
    })
}
