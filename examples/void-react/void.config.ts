import { defineConfig } from 'void/config'

export default defineConfig({
  routing: { typedRoutes: true },
  cloudflare: { compatibility_flags: ['nodejs_compat'] },
  head: {
    title: 'Local email preview',
    htmlAttrs: { lang: 'en' },
  },
})
