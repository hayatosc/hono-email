import type { UnpluginInstance } from 'unplugin'

import unplugin from './index'
import type { EmailTailwindPluginOptions } from './types'

/**
 * Webpack plugin that injects Tailwind artifacts into `<Tailwind>` components.
 *
 * @param options - Tailwind plugin options.
 * @returns A Webpack plugin.
 *
 * @example
 * ```js
 * const EmailTailwind = require('@hono-email/tailwind-plugin/webpack').default
 *
 * module.exports = { plugins: [EmailTailwind()] }
 * ```
 */
const webpack: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['webpack'] =
  unplugin.webpack

export default webpack
