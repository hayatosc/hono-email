import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { build as esbuild, context as esbuildContext, transform } from 'esbuild'
import { render } from 'hono-email'
import { rolldown } from 'rolldown'
import { rollup } from 'rollup'
import { build as viteBuild, createServer } from 'vite'
import webpack from 'webpack'

import type { CssBuildArtifact } from '../../core/src/css/artifact'
import EmailBun from './bun'
import EmailEsbuild from './esbuild'
import EmailRolldown from './rolldown'
import EmailRollup from './rollup'
import type { EmailTailwindPluginOptions } from './types'
import EmailVite from './vite'
import EmailWebpack from './webpack'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const directories: string[] = []
const require = createRequire(import.meta.url)

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const createFixture = async () => {
  const root = await mkdtemp(path.join(packageRoot, 'integration-'))
  directories.push(root)
  await writeFile(path.join(root, '.gitignore'), '*.mjs\n')
  await mkdir(path.join(root, 'emails'))
  await mkdir(path.join(root, 'shared'))
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'hono/jsx' },
    }),
  )
  await writeFile(
    path.join(root, 'shared/button.tsx'),
    `
export const Button = () => <div className="block mt-[8px] sm:text-brand hover:text-brand">Shared</div>
`,
  )
  const entry = path.join(root, 'emails/welcome.tsx')
  await writeFile(
    entry,
    `
import { Tailwind } from 'hono-email'
import { Button } from '../shared/button.tsx'
const dynamicClass = ['px', 'email'].join('-')
export const Email = () => <Tailwind><Button /><p className={dynamicClass + ' text-brand custom'}>Hello</p></Tailwind>
`,
  )
  const configPath = path.join(root, 'tailwind.config.cjs')
  await writeFile(
    configPath,
    `module.exports = { theme: { extend: { spacing: { email: '3px' }, colors: { brand: '#123456' } } } }`,
  )
  const options: EmailTailwindPluginOptions = {
    configPath,
    safelist: ['px-email'],
    css: '.custom { font-weight: 700; }',
  }
  return { root, entry, options, configPath }
}

const transpileJsx = {
  name: 'test-jsx',
  async transform(code: string, id: string) {
    if (!id.endsWith('.tsx')) return null
    const result = await transform(code, {
      loader: 'tsx',
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
    })
    return { code: result.code, map: null }
  },
}

type Bundler = 'vite' | 'rollup' | 'rolldown' | 'esbuild' | 'webpack' | 'bun'

const bundleFixture = async (
  bundler: Bundler,
  fixture: Awaited<ReturnType<typeof createFixture>>,
  withHostTailwind = false,
): Promise<string> => {
  const { root, entry, options } = fixture
  const output = path.join(root, `${bundler}-${withHostTailwind}.mjs`)
  const external = ['hono-email', 'hono/jsx/jsx-runtime']
  switch (bundler) {
    case 'esbuild':
      await esbuild({
        absWorkingDir: root,
        entryPoints: [entry],
        outfile: output,
        bundle: true,
        format: 'esm',
        platform: 'node',
        external,
        jsx: 'automatic',
        jsxImportSource: 'hono/jsx',
        plugins: [EmailEsbuild(options)],
      })
      break
    case 'rollup': {
      const bundle = await rollup({
        input: entry,
        external,
        plugins: [EmailRollup(options), transpileJsx],
      })
      try {
        await bundle.write({ file: output, format: 'esm' })
      } finally {
        await bundle.close()
      }
      break
    }
    case 'rolldown': {
      const bundle = await rolldown({
        input: entry,
        external,
        plugins: [EmailRolldown(options), transpileJsx],
      })
      try {
        await bundle.write({ file: output, format: 'esm' })
      } finally {
        await bundle.close()
      }
      break
    }
    case 'vite':
      await viteBuild({
        root,
        configFile: false,
        logLevel: 'silent',
        resolve: { alias: { tailwindcss: require.resolve('tailwindcss/index.css') } },
        plugins: [...(withHostTailwind ? tailwindcss() : []), EmailVite(options)],
        oxc: { jsx: { runtime: 'automatic', importSource: 'hono/jsx' } },
        build: {
          ssr: entry,
          outDir: root,
          emptyOutDir: false,
          minify: false,
          rollupOptions: { external, output: { entryFileNames: path.basename(output) } },
        },
      })
      break
    case 'webpack': {
      const loader = path.join(root, 'jsx-loader.cjs')
      await writeFile(
        loader,
        `const esbuild = require(${JSON.stringify(require.resolve('esbuild'))}); module.exports = function(code) { return esbuild.transformSync(code, { loader: 'tsx', jsx: 'automatic', jsxImportSource: 'hono/jsx' }).code }`,
      )
      const compiler = webpack({
        mode: 'development',
        target: 'node',
        entry,
        devtool: false,
        experiments: { outputModule: true },
        externals: external,
        externalsType: 'module',
        output: { path: root, filename: path.basename(output), library: { type: 'module' } },
        resolve: { extensions: ['.tsx', '.ts', '.js'] },
        module: { rules: [{ test: /\.tsx$/, use: [loader] }] },
        plugins: [EmailWebpack(options)],
      })
      if (!compiler) throw new Error('Webpack compiler was not created')
      try {
        await new Promise<void>((resolve, reject) =>
          compiler.run((error, stats) => {
            if (error) reject(error)
            else if (!stats || stats.hasErrors())
              reject(new Error(stats?.toString({ all: false, errors: true })))
            else resolve()
          }),
        )
      } finally {
        await new Promise<void>((resolve, reject) =>
          compiler.close((error) => (error ? reject(error) : resolve())),
        )
      }
      break
    }
    case 'bun': {
      const result = await Bun.build({
        entrypoints: [entry],
        target: 'bun',
        format: 'esm',
        external,
        outdir: root,
        naming: path.basename(output),
        jsx: { runtime: 'automatic', importSource: 'hono/jsx', development: false },
        plugins: [EmailBun(options)],
      })
      if (!result.success) throw new AggregateError(result.logs, 'Bun build failed')
      break
    }
  }
  return output
}

const readRenderedHtml = async (output: string): Promise<string> => {
  const { Email } = (await import(output)) as { Email: () => Parameters<typeof render>[0] }
  const { html } = await render(Email(), { strict: false, onWarning: 'silent' })
  return html
}

const expectRenderedStyles = async (output: string) => {
  const html = await readRenderedHtml(output)
  expect(html).toContain('display:block')
  expect(html).toContain('margin-top:8px')
  expect(html).toContain('color:#123456')
  expect(html).toContain('padding-left:3px')
  expect(html).toContain('padding-right:3px')
  expect(html).toContain('font-weight:700')
  expect(html).toContain('@media')
  expect(html).toContain(':hover')
}

describe('actual bundler integration', () => {
  test('automatic source discovery includes an imported shared component with additive @source', async () => {
    const fixture = await createFixture()
    await expectRenderedStyles(await bundleFixture('vite', fixture, true))
  })

  for (const bundler of ['vite', 'rollup', 'rolldown', 'esbuild', 'webpack', 'bun'] as const) {
    test(`${bundler} injects compiled artifacts without host CSS support`, async () => {
      const fixture = await createFixture()
      const output = await bundleFixture(bundler, fixture)
      await expectRenderedStyles(output)
      const code = await readFile(output, 'utf8')
      expect(code).not.toContain('?inline')
      expect(code).not.toContain('buildTailwindArtifactFromCss')
    }, 20_000)
  }

  test('resolves custom CSS and TypeScript config from the host project root', async () => {
    const fixture = await createFixture()
    await writeFile(
      path.join(fixture.root, 'tailwind.config.ts'),
      `export default { theme: { extend: { spacing: { email: '3px' } } } }`,
    )
    await writeFile(
      path.join(fixture.root, 'theme.css'),
      '@theme { --color-brand: #123456; } .custom { font-weight: 700; }',
    )
    fixture.options.configPath = './tailwind.config.ts'
    fixture.options.css = '@import "./theme.css";'
    await expectRenderedStyles(await bundleFixture('esbuild', fixture))
  })

  test('esbuild rebuilds imported CSS, config dependencies, and shared sources', async () => {
    const fixture = await createFixture()
    const { root, entry, options } = fixture
    const tokens = path.join(root, 'tokens.cjs')
    await writeFile(tokens, `module.exports = { brand: '#123456' }`)
    await writeFile(
      fixture.configPath,
      `module.exports = { theme: { extend: { spacing: { email: '3px' }, colors: require('./tokens.cjs') } } }`,
    )
    const styles = path.join(root, 'theme.css')
    await writeFile(styles, '.custom { font-weight: 700; }')
    const output = path.join(root, 'rebuild.mjs')
    const context = await esbuildContext({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: output,
      bundle: true,
      format: 'esm',
      platform: 'node',
      external: ['hono-email', 'hono/jsx/jsx-runtime'],
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
      plugins: [EmailEsbuild({ ...options, css: '@import "./theme.css";' })],
    })
    try {
      await context.rebuild()
      await expectRenderedStyles(output)
      await writeFile(tokens, `module.exports = { brand: '#654321' }`)
      await writeFile(styles, '.custom { font-weight: 400; }')
      await writeFile(
        path.join(root, 'shared/button.tsx'),
        `export const Button = () => <div className="inline mt-[9px]">Shared</div>`,
      )
      await context.rebuild()
      const nextOutput = path.join(root, 'rebuilt.mjs')
      await writeFile(nextOutput, await readFile(output))
      const html = await readRenderedHtml(nextOutput)
      expect(html).toContain('display:inline')
      expect(html).toContain('margin-top:9px')
      expect(html).toContain('color:#654321')
      expect(html).toContain('font-weight:400')
      expect(html).not.toContain('color:#123456')
      expect(await readFile(output, 'utf8')).not.toContain('sm:text-brand')
    } finally {
      await context.dispose()
    }
  }, 20_000)

  test('Vite invalidates artifacts when shared source files change during development', async () => {
    const { root, entry, options } = await createFixture()
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [EmailVite(options)],
      oxc: { jsx: { runtime: 'automatic', importSource: 'hono/jsx' } },
      server: { middlewareMode: true, hmr: false },
    })
    try {
      const id = 'virtual-hono-email-tw-artifact/' + encodeURIComponent(entry)
      const initial = (await server.ssrLoadModule(id)) as { default: CssBuildArtifact }
      expect(initial.default.inlineStylesByClass.block).toEqual({ display: 'block' })
      await writeFile(
        path.join(root, 'shared/button.tsx'),
        `export const Button = () => <div className="inline">Shared</div>`,
      )
      let artifact = initial.default
      const deadline = Date.now() + 5000
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        const next = (await server.ssrLoadModule(id)) as { default: CssBuildArtifact }
        artifact = next.default
        if (artifact.inlineStylesByClass.inline) break
      }
      expect(artifact.inlineStylesByClass.inline).toEqual({ display: 'inline' })
      expect(artifact.inlineStylesByClass.block).toBeUndefined()
    } finally {
      await server.close()
    }
  }, 10_000)

  test('esbuild watch discovers newly created source files', async () => {
    const { root, entry, options } = await createFixture()
    const output = path.join(root, 'watch.mjs')
    let complete: (() => void) | undefined
    const context = await esbuildContext({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: output,
      bundle: true,
      format: 'esm',
      platform: 'node',
      external: ['hono-email', 'hono/jsx/jsx-runtime'],
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
      plugins: [
        EmailEsbuild(options),
        {
          name: 'observe-rebuild',
          setup(build) {
            build.onEnd(() => complete?.())
          },
        },
      ],
    })
    const nextBuild = async (action: () => Promise<unknown>) => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      const finished = new Promise<void>((resolve, reject) => {
        complete = resolve
        timeout = setTimeout(() => reject(new Error('esbuild watch did not rebuild')), 5000)
      })
      try {
        await action()
        await finished
      } finally {
        clearTimeout(timeout)
        complete = undefined
      }
    }
    try {
      await nextBuild(() => context.watch())
      await nextBuild(() =>
        writeFile(path.join(root, 'shared/new.tsx'), '<p className="text-[17px]" />'),
      )
      expect(await readFile(output, 'utf8')).toContain('"font-size": "17px"')
    } finally {
      await context.dispose()
    }
  }, 15_000)
})
