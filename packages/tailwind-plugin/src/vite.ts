import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Vite plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Vite plugin.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import EmailTailwind from '@hono-email/tailwind-plugin/vite'
 *
 * export default defineConfig({ plugins: [EmailTailwind()] })
 * ```
 */
const vite: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['vite'] =
  unplugin.vite

export default vite
