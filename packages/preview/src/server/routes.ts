import { Hono } from 'hono'
import type { ViteDevServer } from 'vite'

import { discoverTemplates } from '../discovery/index.js'
import { extractPropsSchema, mergePropsWithDefaults } from '../props/index.js'
import { renderTemplate } from './renderer.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function createApiRoutes(vite: ViteDevServer, templateDir: string) {
  const app = new Hono().basePath('/api')

  app.get('/templates', (c) => {
    const templates = discoverTemplates(templateDir)
    return c.json(templates)
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
      const component = (mod as Record<string, unknown>).default
      if (typeof component !== 'function') {
        return c.json({})
      }
      const schema = extractPropsSchema(component)
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
      const component = (mod as Record<string, unknown>).default
      if (typeof component !== 'function') {
        return c.json({ error: 'No default export function' }, 400)
      }

      const schema = extractPropsSchema(component)
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
