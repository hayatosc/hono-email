// Use the module declarations without introducing Workers globals into other runtimes.
declare module 'cloudflare:workers' {
  import type { CloudflareWorkersModule } from '@cloudflare/workers-types/index'

  export const env: typeof CloudflareWorkersModule.env
}
