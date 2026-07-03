import path from 'node:path'

import { createUnplugin, type UnpluginFactory, type UnpluginInstance } from 'unplugin'

import type { EmailTailwindPluginOptions } from './types'

export type { EmailTailwindPluginOptions } from './types'

const PLUGIN_NAME = 'hono-email-tailwind'
const DEFAULT_PACKAGE_NAMES = ['hono-email'] as const
const ARTIFACT_IMPORT_PREFIX = 'virtual:hono-email-tw-artifact:'
const CSS_IMPORT_PREFIX = 'virtual:hono-email-tw.css:'
const RESOLVED_ARTIFACT_PREFIX = '\0virtual:hono-email-tw-artifact:'
const RESOLVED_CSS_PREFIX = '\0virtual:hono-email-tw-css:'
const RESOLVED_CSS_SUFFIX = '.css'
const SOURCE_MODULE_FILTER: RegExp = /\.[cm]?[jt]sx?(?:[?#]|$)/
const TAILWIND_COMPONENT_OPEN_TAG_PATTERN: RegExp = /<Tailwind\b([^>]*?)(\/?)>/g

type ResolvedPluginOptions = {
  configPath?: string
  css?: string
  packageNames: string[]
  runtimeModuleSpecifier: string
  safelist: string[]
}

const normalizePathForCss = (value: string): string => value.replace(/\\/g, '/')

const escapeCssString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const resolveOptionalPath = (value: string | undefined): string | undefined =>
  value ? normalizePathForCss(path.resolve(value)) : undefined

const resolvePluginOptions = (options: EmailTailwindPluginOptions = {}): ResolvedPluginOptions => {
  const configPath = resolveOptionalPath(options.configPath)
  const css = options.css?.trim()
  return {
    ...(configPath !== undefined ? { configPath } : {}),
    ...(css !== undefined ? { css } : {}),
    packageNames: options.packageNames?.length
      ? [...new Set(options.packageNames)]
      : [...DEFAULT_PACKAGE_NAMES],
    runtimeModuleSpecifier:
      options.runtimeModuleSpecifier?.trim() ||
      options.packageNames?.[0] ||
      DEFAULT_PACKAGE_NAMES[0],
    safelist: options.safelist?.length ? [...new Set(options.safelist)] : [],
  }
}

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stripQueryAndHash = (id: string): string => id.replace(/[?#].*$/, '')

const hasTailwindImport = (code: string, packageNames: string[]): boolean =>
  packageNames.some(
    (packageName) =>
      new RegExp(`from\\s*['"]${escapeForRegExp(packageName)}['"]`).test(code) &&
      new RegExp(
        `import\\s*{[^}]*\\bTailwind\\b[^}]*}\\s*from\\s*['"]${escapeForRegExp(packageName)}['"]`,
      ).test(code),
  )

/**
 * Transforms JSX source code by injecting Tailwind artifact imports into `<Tailwind>` components.
 *
 * @param code - Source code to transform.
 * @param id - File path of the source module.
 * @param packageNames - Package names whose `Tailwind` imports should be recognized.
 * @returns Transformed code string, or `null` if no transformation was needed.
 *
 * @example
 * ```ts
 * import { transformTailwindComponentSource } from '@hono-email/tailwind-plugin'
 *
 * const result = transformTailwindComponentSource(code, id)
 * ```
 */
export const transformTailwindComponentSource = (
  code: string,
  id: string,
  packageNames: string[] = [...DEFAULT_PACKAGE_NAMES],
): string | null => {
  if (!hasTailwindImport(code, packageNames) || !code.includes('<Tailwind')) {
    return null
  }

  let replaced = false
  const transformedCode = code.replace(
    TAILWIND_COMPONENT_OPEN_TAG_PATTERN,
    (fullMatch, attributes: string, selfClosing: string) => {
      if (/(?:^|\s)artifact\s*=/.test(attributes)) {
        return fullMatch
      }

      replaced = true
      return `<Tailwind artifact={__EmailTailwindArtifact}${attributes}${selfClosing}>`
    },
  )

  if (!replaced) {
    return null
  }

  const encodedPath = encodeURIComponent(normalizePathForCss(id))
  return `import __EmailTailwindArtifact from '${ARTIFACT_IMPORT_PREFIX}${encodedPath}'\n${transformedCode}`
}

/**
 * Builds the per-file CSS virtual module content for Tailwind processing.
 *
 * @param sourceFilePath - Absolute path of the email source file.
 * @param options - Plugin options.
 * @returns CSS module string.
 *
 * @example
 * ```ts
 * import { buildPerFileCssModule } from '@hono-email/tailwind-plugin'
 *
 * const css = buildPerFileCssModule('/abs/emails/welcome.tsx', { safelist: ['text-brand'] })
 * ```
 */
export const buildPerFileCssModule = (
  sourceFilePath: string,
  options: EmailTailwindPluginOptions = {},
): string => {
  const resolved = resolvePluginOptions(options)
  const lines = ['@import "tailwindcss";']

  if (resolved.configPath) {
    lines.push(`@config "${escapeCssString(normalizePathForCss(resolved.configPath))}";`)
  }

  lines.push(`@source "${escapeCssString(normalizePathForCss(sourceFilePath))}";`)

  if (resolved.safelist.length > 0) {
    lines.push(`@source inline(${JSON.stringify(resolved.safelist.join(' '))});`)
  }

  if (resolved.css) {
    lines.push(resolved.css)
  }

  return `${lines.join('\n')}\n`
}

/**
 * Builds the per-file artifact virtual module content.
 *
 * @param encodedPath - URL-encoded file path.
 * @param runtimeModuleSpecifier - Module specifier for the runtime import.
 * @returns Artifact module string.
 *
 * @example
 * ```ts
 * import { buildPerFileArtifactModule } from '@hono-email/tailwind-plugin'
 *
 * const mod = buildPerFileArtifactModule(encodedPath, 'hono-email')
 * ```
 */
export const buildPerFileArtifactModule = (
  encodedPath: string,
  runtimeModuleSpecifier: string = DEFAULT_PACKAGE_NAMES[0],
): string =>
  `import tailwindCss from '${CSS_IMPORT_PREFIX}${encodedPath}?inline'\n` +
  `import { buildTailwindArtifactFromCss } from '${runtimeModuleSpecifier}'\n\n` +
  `export default buildTailwindArtifactFromCss({ css: tailwindCss })\n`

/**
 * Raw unplugin factory for custom plugin wiring.
 *
 * @param options - Tailwind plugin options.
 * @returns An unplugin definition.
 *
 * @example
 * ```ts
 * import { unpluginFactory } from '@hono-email/tailwind-plugin'
 *
 * const plugin = unpluginFactory({ safelist: ['text-brand'] })
 * ```
 */
export const unpluginFactory: UnpluginFactory<EmailTailwindPluginOptions | undefined> = (
  options,
) => {
  const resolvedOptions = resolvePluginOptions(options)

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(ARTIFACT_IMPORT_PREFIX)) {
        return `${RESOLVED_ARTIFACT_PREFIX}${id.slice(ARTIFACT_IMPORT_PREFIX.length)}`
      }

      if (id.startsWith(CSS_IMPORT_PREFIX)) {
        const withoutPrefix = id.slice(CSS_IMPORT_PREFIX.length)
        const queryIndex = withoutPrefix.indexOf('?')
        const encodedPath = queryIndex >= 0 ? withoutPrefix.slice(0, queryIndex) : withoutPrefix
        const query = queryIndex >= 0 ? withoutPrefix.slice(queryIndex) : ''
        return `${RESOLVED_CSS_PREFIX}${encodedPath}${RESOLVED_CSS_SUFFIX}${query}`
      }

      return null
    },
    load(id) {
      const qIdx = id.indexOf('?')
      const bareId = qIdx >= 0 ? id.slice(0, qIdx) : id
      if (bareId.startsWith(RESOLVED_CSS_PREFIX) && bareId.endsWith(RESOLVED_CSS_SUFFIX)) {
        const encodedPath = bareId.slice(RESOLVED_CSS_PREFIX.length, -RESOLVED_CSS_SUFFIX.length)
        let sourceFilePath: string
        try {
          sourceFilePath = decodeURIComponent(encodedPath)
        } catch {
          throw new Error(`Invalid encoded path in Tailwind CSS virtual module: ${encodedPath}`)
        }

        this.addWatchFile(sourceFilePath)

        if (resolvedOptions.configPath) {
          this.addWatchFile(resolvedOptions.configPath)
        }

        return buildPerFileCssModule(sourceFilePath, resolvedOptions)
      }

      if (bareId.startsWith(RESOLVED_ARTIFACT_PREFIX)) {
        const encodedPath = bareId.slice(RESOLVED_ARTIFACT_PREFIX.length)
        return buildPerFileArtifactModule(encodedPath, resolvedOptions.runtimeModuleSpecifier)
      }

      return null
    },
    transform: {
      filter: {
        id: SOURCE_MODULE_FILTER,
        code: '<Tailwind',
      },
      handler(code, id) {
        const normalizedId = stripQueryAndHash(id)
        if (!SOURCE_MODULE_FILTER.test(normalizedId)) {
          return null
        }

        return transformTailwindComponentSource(code, normalizedId, resolvedOptions.packageNames)
      },
    },
  }
}

/**
 * Unplugin instance. Use the per-bundler subpath exports for most cases.
 *
 * @example
 * ```ts
 * import { unplugin } from '@hono-email/tailwind-plugin'
 * ```
 */
export const unplugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean> =
  createUnplugin(unpluginFactory)

export default unplugin
