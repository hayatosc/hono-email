import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Rolldown plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Rolldown plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/rolldown'
 *
 * export default { plugins: [EmailTailwind()] }
 * ```
 */
const rolldown: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rolldown'] =
  unplugin.rolldown

export default rolldown
