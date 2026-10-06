import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { build as esbuild, transform } from 'esbuild'
import { render } from 'hono-email'
import { rolldown } from 'rolldown'
import { rollup } from 'rollup'
import { build as viteBuild } from 'vite'
import webpack from 'webpack'

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
import { Button } from '../shared/button'
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
  return { root, entry, options }
}

const transpileJsx = {
  name: 'test-jsx',
  async transform(code: string, id: string) {
    if (!id.endsWith('.tsx')) return null
    return transform(code, { loader: 'tsx', jsx: 'automatic', jsxImportSource: 'hono/jsx' })
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
        plugins: [EmailBun(options)],
      })
      if (!result.success) throw new AggregateError(result.logs, 'Bun build failed')
      break
    }
  }
  return output
}

const expectRenderedStyles = async (output: string) => {
  const { Email } = (await import(output)) as { Email: () => Parameters<typeof render>[0] }
  const { html } = await render(Email(), { strict: false, onWarning: 'silent' })
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
})
