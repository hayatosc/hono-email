import { Hono } from 'hono'
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
      const result = await renderTemplate(c.var.component, mergedProps)
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
