import type { AstroIntegration } from 'astro'

// Prerender every doc route to a static asset. On Cloudflare the worker
// (`src/fetch.ts`) runs before the ASSETS binding serves files, so content
// negotiation still works while HTML is delivered prerendered.
export function prerenderDocs(): AstroIntegration {
  return {
    name: 'prerender-docs',
    hooks: {
      'astro:route:setup': ({ route }) => {
        route.prerender = true
      },
    },
  }
}
