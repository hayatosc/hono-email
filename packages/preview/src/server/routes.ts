import { Hono } from 'hono'

import { discoverTemplates } from '../discovery/index.js'
import { extractPropsSchema, mergePropsWithDefaults, resolveComponent } from '../props/index.js'
import { renderTemplate } from './renderer.js'

interface SsrModuleLoader {
  ssrLoadModule(url: string): Promise<Record<string, unknown>>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function createApiRoutes(vite: SsrModuleLoader, templateDir: string) {
  const app = new Hono().basePath('/api')

  app.get('/templates', (c) => {
    const templates = discoverTemplates(templateDir)
    return c.json(templates.map((t) => ({ name: t.name })))
  })

  app.get('/templates/:name/props', async (c) => {
    const name = c.req.param('name')
    const templates = discoverTemplates(templateDir)
    const entry = templates.find((t) => t.name === name)
    if (!entry) {
      return c.json({ error: 'Template not found' }, 404)
    }

    try {
      const mod = await vite.ssrLoadModule(entry.filePath)
      const component = resolveComponent(mod)
      if (!component) {
        return c.json({ error: 'No exported component function found' }, 400)
      }
      const schema = extractPropsSchema(mod)
      return c.json(schema)
    } catch (err) {
      console.error('Failed to load template props:', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  app.post('/templates/:name/render', async (c) => {
    const name = c.req.param('name')
    const templates = discoverTemplates(templateDir)
    const entry = templates.find((t) => t.name === name)
    if (!entry) {
      return c.json({ error: 'Template not found' }, 404)
    }

    const body = await c.req.json().catch(() => ({}))
    const props = isObject(body) && isObject(body.props) ? body.props : {}

    try {
      const mod = await vite.ssrLoadModule(entry.filePath)
      const component = resolveComponent(mod)
      if (!component) {
        return c.json({ error: 'No exported component function found' }, 400)
      }

      const schema = extractPropsSchema(mod)
      const mergedProps = mergePropsWithDefaults(schema, props)
      const result = await renderTemplate(component, mergedProps)
      return c.json(result)
    } catch (err) {
      console.error('Failed to render template:', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  return app
}
