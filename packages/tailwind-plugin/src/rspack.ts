import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Rspack plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns An Rspack plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/rspack'
 *
 * export default { plugins: [EmailTailwind()] }
 * ```
 */
const rspack: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rspack'] =
  unplugin.rspack

export default rspack
