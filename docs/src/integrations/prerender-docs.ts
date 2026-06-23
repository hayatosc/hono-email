import type { AstroIntegration } from 'astro'

// Prerender every doc route to a static asset. The custom worker entrypoint
// (`src/worker.ts`) runs before the ASSETS binding (`run_worker_first`), so
// content negotiation still works while HTML is delivered prerendered.
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
