// Minimal Cloudflare worker globals for `src/worker.ts`. We do not reference
// `@cloudflare/workers-types` because its `ExecutionContext` (which requires
// `tracing`) is incompatible with Hono's, so passing `c.executionCtx` to
// `handle()` would otherwise need an unsafe cast. Declare only what is used.
//
// No bindings are declared in wrangler.jsonc; the ASSETS binding is injected by
// the Astro Cloudflare adapter at build time and used only inside `handle()`.
interface Env {
  ASSETS: {
    fetch(request: Request | string, requestInit?: RequestInit): Response | Promise<Response>
  }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

interface ExportedHandler<E = unknown> {
  fetch?(request: Request, env: E, ctx: ExecutionContext): Response | Promise<Response>
}
