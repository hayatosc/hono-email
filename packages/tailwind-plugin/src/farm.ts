import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Farm plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Farm plugin.
 *
 * @example
 * ```ts
 * import EmailTailwind from '@hono-email/tailwind-plugin/farm'
 *
 * export default { plugins: [EmailTailwind()] }
 * ```
 */
const farm: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['farm'] =
  unplugin.farm

export default farm
