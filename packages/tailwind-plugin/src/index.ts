import { createRequire } from 'node:module'
import path from 'node:path'

import { compile, optimize } from '@tailwindcss/node'
import { clearRequireCache } from '@tailwindcss/node/require-cache'
import { Scanner } from '@tailwindcss/oxide'
import {
  createUnplugin,
  type UnpluginBuildContext,
  type UnpluginFactory,
  type UnpluginInstance,
} from 'unplugin'

import { buildCssArtifact } from '../../core/src/css/artifact'
import type { EmailTailwindPluginOptions } from './types'

export type { EmailTailwindPluginOptions } from './types'

const PLUGIN_NAME = 'hono-email-tailwind'
const DEFAULT_PACKAGE_NAMES = ['hono-email'] as const
const ARTIFACT_IMPORT_PREFIX = 'virtual-hono-email-tw-artifact/'
const RESOLVED_ARTIFACT_PREFIX = '\0virtual-hono-email-tw-artifact/'
const SOURCE_MODULE_FILTER: RegExp = /\.[cm]?[jt]sx?(?:[?#]|$)/

type ResolvedPluginOptions = {
  configPath?: string
  css?: string
  packageNames: string[]
  safelist: string[]
}

const normalizePathForCss = (value: string): string => value.replace(/\\/g, '/')

const escapeCssString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const resolveOptionalPath = (value: string | undefined, base: string): string | undefined =>
  value ? normalizePathForCss(path.resolve(base, value)) : undefined

const resolvePluginOptions = (
  options: EmailTailwindPluginOptions = {},
  base: string = process.cwd(),
): ResolvedPluginOptions => {
  const configPath = resolveOptionalPath(options.configPath, base)
  const css = options.css?.trim()
  return {
    ...(configPath !== undefined ? { configPath } : {}),
    ...(css !== undefined ? { css } : {}),
    packageNames: options.packageNames?.length
      ? [...new Set(options.packageNames)]
      : [...DEFAULT_PACKAGE_NAMES],
    safelist: options.safelist?.length ? [...new Set(options.safelist)] : [],
  }
}

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stripQueryAndHash = (id: string): string => id.replace(/[?#].*$/, '')

const stripComments = (value: string): { value: string; unterminated: boolean } => {
  let result = ''
  let cursor = 0

  while (cursor < value.length) {
    const next = value.slice(cursor, cursor + 2)

    if (next === '/*') {
      const commentEnd = value.indexOf('*/', cursor + 2)
      if (commentEnd === -1) {
        return { value: result, unterminated: true }
      }

      cursor = commentEnd + 2
      continue
    }

    if (next === '//') {
      const lineEnd = value.indexOf('\n', cursor + 2)
      if (lineEnd === -1) {
        return { value: result, unterminated: false }
      }

      cursor = lineEnd + 1
      continue
    }

    result += value[cursor]
    cursor += 1
  }

  return { value: result, unterminated: false }
}

const findTailwindImportLocalName = (code: string, packageNames: string[]): string | undefined => {
  for (const packageName of packageNames) {
    const importPattern = new RegExp(
      `import\\s*{([^}]*)}\\s*from\\s*['"]${escapeForRegExp(packageName)}['"]`,
      'g',
    )
    for (const match of code.matchAll(importPattern)) {
      const specifiers = match[1]
      if (!specifiers) {
        continue
      }

      const strippedSpecifiers = stripComments(specifiers)
      if (strippedSpecifiers.unterminated) {
        continue
      }

      for (const specifier of strippedSpecifiers.value.split(',')) {
        const tokens = specifier.trim().split(/\s+/)
        if (tokens[0] !== 'Tailwind') {
          continue
        }

        const localName =
          tokens.length === 1
            ? 'Tailwind'
            : tokens.length === 3 && tokens[1] === 'as'
              ? tokens[2]
              : undefined
        if (!localName) {
          continue
        }
        if (/^[A-Za-z_$][\w$]*$/.test(localName)) {
          return localName
        }
      }
    }
  }

  return undefined
}

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
  const tailwindLocalName = findTailwindImportLocalName(code, packageNames)
  if (!tailwindLocalName) {
    return null
  }

  const componentOpenTagPattern = new RegExp(
    `<${escapeForRegExp(tailwindLocalName)}(?=[\\s/>])([^>]*?)(\\/?)>`,
    'g',
  )
  let replaced = false
  const transformedCode = code.replace(
    componentOpenTagPattern,
    (fullMatch, attributes: string, selfClosing: string) => {
      if (/(?:^|\s)artifact\s*=/.test(attributes)) {
        return fullMatch
      }

      replaced = true
      return `<${tailwindLocalName} artifact={__EmailTailwindArtifact}${attributes}${selfClosing}>`
    },
  )

  if (!replaced) {
    return null
  }

  const encodedPath = encodeURIComponent(normalizePathForCss(id))
  return `import __EmailTailwindArtifact from '${ARTIFACT_IMPORT_PREFIX}${encodedPath}'\n${transformedCode}`
}

/**
 * Builds the per-file CSS input for Tailwind compilation.
 *
 * @param sourceFilePath - Absolute path of the email source file.
 * @param options - Plugin options.
 * @param base - Directory used to resolve relative CSS imports and configuration references.
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
  base: string = process.cwd(),
): string => {
  const resolved = resolvePluginOptions(options, base)
  const lines = ['@import "tailwindcss";']

  if (resolved.configPath) {
    const configPath = normalizePathForCss(path.relative(base, resolved.configPath))
    // Tailwind tracks transitive config dependencies only for relative module specifiers.
    lines.push(`@config "${escapeCssString(`./${configPath}`)}";`)
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

type CompiledArtifactModule = {
  code: string
  files: Set<string>
  directories: Set<string>
}

const require = createRequire(import.meta.url)

const decodeSourcePath = (encodedPath: string): string => {
  try {
    return decodeURIComponent(encodedPath)
  } catch {
    throw new Error(`Invalid encoded path in Tailwind artifact virtual module: ${encodedPath}`)
  }
}

const compileArtifactModule = async (
  sourceFilePath: string,
  options: EmailTailwindPluginOptions,
  root: string,
  buildDependencies: Set<string>,
): Promise<CompiledArtifactModule> => {
  const files = new Set([sourceFilePath])
  const compiler = await compile(buildPerFileCssModule(sourceFilePath, options, root), {
    base: root,
    onDependency(file) {
      files.add(file)
      buildDependencies.add(file)
    },
    // Resolve the matching Tailwind stylesheet even when the host has no CSS tooling installed.
    async customCssResolver(id) {
      return id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : undefined
    },
  })
  const sources =
    compiler.root === 'none'
      ? []
      : [{ ...(compiler.root ?? { base: root, pattern: '**/*' }), negated: false }]
  const scanner = new Scanner({ sources: [...sources, ...compiler.sources] })
  const candidates = scanner.scan()
  for (const file of scanner.files) files.add(file)
  const directories = new Set(scanner.globs.map((glob) => glob.base))
  // Flatten Tailwind's nested selectors before the shared email CSS builder sees them.
  const css = optimize(compiler.build(candidates), { minify: false }).code
  const artifact = buildCssArtifact({ css })
  return { code: `export default ${JSON.stringify(artifact)}\n`, files, directories }
}

const watchArtifact = (context: UnpluginBuildContext, artifact: CompiledArtifactModule): void => {
  for (const file of artifact.files) context.addWatchFile(file)
  const native = context.getNativeBuildContext?.()
  for (const directory of artifact.directories) {
    if (native?.framework === 'webpack' || native?.framework === 'rspack') {
      native.loaderContext?.addContextDependency(directory)
    } else {
      context.addWatchFile(directory)
    }
  }
}

/**
 * Compiles Tailwind and returns a JavaScript module exporting a serialized email CSS artifact.
 * Relative CSS imports resolve from the current working directory.
 *
 * @param encodedPath - URL-encoded source file path.
 * @param options - Tailwind compilation options. Legacy runtime specifiers are ignored.
 */
export const buildPerFileArtifactModule = async (
  encodedPath: string,
  options: EmailTailwindPluginOptions | string = {},
): Promise<string> => {
  const artifact = await compileArtifactModule(
    decodeSourcePath(encodedPath),
    typeof options === 'string' ? {} : options,
    process.cwd(),
    new Set(),
  )
  return artifact.code
}

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
  let root = process.cwd()
  const compiled = new Map<string, Promise<CompiledArtifactModule>>()
  const buildDependencies = new Set<string>()
  const artifactIds = new Set<string>()
  const invalidate = (): void => {
    clearRequireCache([...buildDependencies])
    buildDependencies.clear()
    compiled.clear()
  }
  const getArtifact = async (id: string): Promise<CompiledArtifactModule> => {
    const sourceFilePath = decodeSourcePath(id.slice(RESOLVED_ARTIFACT_PREFIX.length))
    artifactIds.add(id)
    let pending = compiled.get(sourceFilePath)
    if (!pending) {
      pending = compileArtifactModule(sourceFilePath, options ?? {}, root, buildDependencies)
      compiled.set(sourceFilePath, pending)
    }
    try {
      return await pending
    } catch (error) {
      compiled.delete(sourceFilePath)
      throw error
    }
  }

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    // New compilers also remove candidates deleted since the previous build.
    buildStart: invalidate,
    watchChange: invalidate,
    esbuild: {
      config(options) {
        root = options.absWorkingDir ?? process.cwd()
      },
      setup(build) {
        // Unplugin forwards watchFiles, but esbuild needs watchDirs to discover new candidates.
        build.onLoad(
          { filter: new RegExp(`^${RESOLVED_ARTIFACT_PREFIX}`), namespace: PLUGIN_NAME },
          async ({ path: id }) => {
            const artifact = await getArtifact(id)
            return {
              contents: artifact.code,
              loader: 'js',
              watchFiles: [...artifact.files],
              watchDirs: [...artifact.directories],
            }
          },
        )
      },
    },
    bun: {
      setup(build) {
        root = path.resolve(build.config.root ?? process.cwd())
      },
    },
    webpack(compiler) {
      root = compiler.context
    },
    rspack(compiler) {
      root = compiler.context
    },
    vite: {
      configResolved(config) {
        root = config.root
      },
      hotUpdate(context) {
        invalidate()
        const modules = new Set(context.modules)
        for (const id of artifactIds) {
          const module = this.environment.moduleGraph.getModuleById(id)
          if (module) {
            this.environment.moduleGraph.invalidateModule(module)
            modules.add(module)
          }
        }
        return [...modules]
      },
      handleHotUpdate(context) {
        invalidate()
        const modules = new Set(context.modules)
        for (const id of artifactIds) {
          const module = context.server.moduleGraph.getModuleById(id)
          if (module) {
            context.server.moduleGraph.invalidateModule(module)
            modules.add(module)
          }
        }
        return [...modules]
      },
    },
    resolveId(id) {
      if (id.startsWith(ARTIFACT_IMPORT_PREFIX)) {
        return `${RESOLVED_ARTIFACT_PREFIX}${id.slice(ARTIFACT_IMPORT_PREFIX.length)}`
      }
      return null
    },
    load: {
      filter: { id: new RegExp(`^${RESOLVED_ARTIFACT_PREFIX}`) },
      async handler(id) {
        if (!id.startsWith(RESOLVED_ARTIFACT_PREFIX)) return null
        const artifact = await getArtifact(id)
        watchArtifact(this, artifact)
        return artifact.code
      },
    },
    transform: {
      filter: {
        id: SOURCE_MODULE_FILTER,
        code: 'Tailwind',
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
