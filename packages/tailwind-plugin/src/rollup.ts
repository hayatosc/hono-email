import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Rollup plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Rollup plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/rollup'
 *
 * export default { plugins: [EmailTailwind()] }
 * ```
 */
const rollup: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rollup'] =
  unplugin.rollup

export default rollup
