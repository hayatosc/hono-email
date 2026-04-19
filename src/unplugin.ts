import path from 'node:path'

import { createUnplugin, type UnpluginFactory } from 'unplugin'

const PLUGIN_NAME = 'hono-email-tailwind'
const DEFAULT_PACKAGE_NAMES = ['hono-email'] as const
const ARTIFACT_IMPORT_ID = 'virtual:hono-email-tailwind-artifact'
const CSS_IMPORT_ID = 'virtual:hono-email-tailwind.css'
const RESOLVED_ARTIFACT_IMPORT_ID = '\0virtual:hono-email-tailwind-artifact'
const RESOLVED_CSS_IMPORT_ID = '\0virtual:hono-email-tailwind.css'
const SOURCE_MODULE_FILTER = /\.[cm]?[jt]sx?$/
const TAILWIND_COMPONENT_OPEN_TAG_PATTERN = /<Tailwind\b([^>]*?)(\/?)>/g

export type HonoEmailTailwindPluginOptions = {
  configPath?: string
  css?: string
  packageNames?: string[]
  runtimeModuleSpecifier?: string
  safelist?: string[]
  sourcePaths?: string[]
}

type ResolvedPluginOptions = {
  configPath?: string
  css?: string
  packageNames: string[]
  runtimeModuleSpecifier: string
  safelist: string[]
  sourcePaths: string[]
}

const normalizePathForCss = (value: string): string => value.replace(/\\/g, '/')

const resolveOptionalPath = (value: string | undefined): string | undefined =>
  value ? normalizePathForCss(path.resolve(value)) : undefined

const resolvePluginOptions = (options: HonoEmailTailwindPluginOptions = {}): ResolvedPluginOptions => ({
  configPath: resolveOptionalPath(options.configPath),
  css: options.css?.trim(),
  packageNames: options.packageNames?.length ? [...new Set(options.packageNames)] : [...DEFAULT_PACKAGE_NAMES],
  runtimeModuleSpecifier: options.runtimeModuleSpecifier?.trim() || options.packageNames?.[0] || DEFAULT_PACKAGE_NAMES[0],
  safelist: options.safelist?.length ? [...new Set(options.safelist)] : [],
  sourcePaths: options.sourcePaths?.length ? [...new Set(options.sourcePaths.map((entry) => normalizePathForCss(path.resolve(entry))))] : [],
})

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stripQueryAndHash = (id: string): string => id.replace(/[?#].*$/, '')

const hasTailwindImport = (code: string, packageNames: string[]): boolean =>
  packageNames.some((packageName) =>
    new RegExp(`from\\s*['"]${escapeForRegExp(packageName)}['"]`).test(code) &&
    new RegExp(`import\\s*{[\\s\\S]*\\bTailwind\\b[\\s\\S]*}\\s*from\\s*['"]${escapeForRegExp(packageName)}['"]`).test(code)
  )

export const transformTailwindComponentSource = (
  code: string,
  packageNames: string[] = [...DEFAULT_PACKAGE_NAMES]
): string | null => {
  if (!hasTailwindImport(code, packageNames) || !code.includes('<Tailwind')) {
    return null
  }

  let replaced = false
  const transformedCode = code.replace(
    TAILWIND_COMPONENT_OPEN_TAG_PATTERN,
    (fullMatch, attributes: string, selfClosing: string) => {
    if (/\bartifact\s*=/.test(attributes)) {
      return fullMatch
    }

    replaced = true
      return `<Tailwind artifact={__honoEmailTailwindArtifact}${attributes}${selfClosing}>`
    }
  )

  if (!replaced) {
    return null
  }

  return `import __honoEmailTailwindArtifact from '${ARTIFACT_IMPORT_ID}'\n${transformedCode}`
}

export const buildTailwindCssModule = (options: HonoEmailTailwindPluginOptions = {}): string => {
  const resolved = resolvePluginOptions(options)
  const lines = ['@import "tailwindcss";']

  if (resolved.configPath) {
    lines.push(`@config "${resolved.configPath}";`)
  }

  for (const sourcePath of resolved.sourcePaths) {
    lines.push(`@source "${sourcePath}";`)
  }

  if (resolved.safelist.length > 0) {
    lines.push(`@source inline(${JSON.stringify(resolved.safelist.join(' '))});`)
  }

  if (resolved.css) {
    lines.push(resolved.css)
  }

  return `${lines.join('\n')}\n`
}

export const buildTailwindArtifactModule = (runtimeModuleSpecifier: string = DEFAULT_PACKAGE_NAMES[0]): string => `import tailwindCss from '${CSS_IMPORT_ID}?inline'
import { buildTailwindArtifactFromCss } from '${runtimeModuleSpecifier}'

export default buildTailwindArtifactFromCss({ css: tailwindCss })
`

const factory: UnpluginFactory<HonoEmailTailwindPluginOptions | undefined> = (options) => {
  const resolvedOptions = resolvePluginOptions(options)

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(ARTIFACT_IMPORT_ID)) {
        return RESOLVED_ARTIFACT_IMPORT_ID
      }

      if (id.startsWith(CSS_IMPORT_ID)) {
        return RESOLVED_CSS_IMPORT_ID + id.slice(CSS_IMPORT_ID.length)
      }

      return null
    },
    load(id) {
      if (id === RESOLVED_ARTIFACT_IMPORT_ID) {
        return buildTailwindArtifactModule(resolvedOptions.runtimeModuleSpecifier)
      }

      if (id.startsWith(RESOLVED_CSS_IMPORT_ID)) {
        if (resolvedOptions.configPath) {
          this.addWatchFile(resolvedOptions.configPath)
        }

        for (const sourcePath of resolvedOptions.sourcePaths) {
          this.addWatchFile(sourcePath)
        }

        return buildTailwindCssModule(resolvedOptions)
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

        return transformTailwindComponentSource(code, resolvedOptions.packageNames)
      },
    },
  }
}

const honoEmailTailwind = createUnplugin(factory)

export default honoEmailTailwind
export const vitePlugin = honoEmailTailwind.vite
export const unpluginFactory = factory
