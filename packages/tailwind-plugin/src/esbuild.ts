import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Esbuild plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns An esbuild plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/esbuild'
 *
 * await esbuild.build({ plugins: [EmailTailwind()] })
 * ```
 */
const esbuild: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['esbuild'] =
  unplugin.esbuild

export default esbuild
