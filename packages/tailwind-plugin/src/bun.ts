import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Bun plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Bun plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/bun'
 *
 * await Bun.build({ plugins: [EmailTailwind()] })
 * ```
 */
const bun: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['bun'] = unplugin.bun

export default bun
