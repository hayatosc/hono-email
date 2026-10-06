import { expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isObject, startPreviewServer, type PreviewServer } from './index'

const previewPackageDir = fileURLToPath(new URL('../..', import.meta.url))
const packagesDir = fileURLToPath(new URL('../../..', import.meta.url))

function createProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'preview-tailwind-render-'))
  mkdirSync(join(dir, 'emails'))
  mkdirSync(join(dir, 'node_modules/@hono-email'), { recursive: true })
  symlinkSync(join(packagesDir, 'core'), join(dir, 'node_modules/hono-email'))
  symlinkSync(previewPackageDir, join(dir, 'node_modules/@hono-email/preview'))
  symlinkSync(
    join(packagesDir, 'tailwind-plugin'),
    join(dir, 'node_modules/@hono-email/tailwind-plugin'),
  )
  symlinkSync(
    realpathSync(join(previewPackageDir, 'node_modules/hono')),
    join(dir, 'node_modules/hono'),
  )
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }))
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'hono/jsx' } }),
  )
  return dir
}

function templateSource(className: string): string {
  return `
import { Html, Body, Text, Tailwind as EmailTailwind } from 'hono-email'
import { mergePropsWithDefaults } from '@hono-email/preview'

export const previewProps = { name: { type: 'string', default: 'Guest' } }
export default function Welcome(props) {
  const values = mergePropsWithDefaults(
    { name: { type: 'string', required: false, defaultValue: 'Guest' } }, props,
  )
  return <Html><EmailTailwind><Body><Text className="${className}">{values.name}</Text></Body></EmailTailwind></Html>
}
`
}

async function availablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  if (!address || typeof address === 'string') throw new Error('Could not allocate a test port')
  return address.port
}

async function renderHtml(url: string): Promise<string> {
  const response = await fetch(`${url}/api/templates/Welcome/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ props: {} }),
  })
  const result: unknown = await response.json()
  expect(response.status).toBe(200)
  if (!isObject(result) || typeof result.html !== 'string') {
    throw new Error(`Unexpected render result: ${JSON.stringify(result)}`)
  }
  expect(result.text).toBe('Guest')
  return result.html
}

async function readEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  controller: AbortController,
  expected: string,
): Promise<void> {
  const timeout = setTimeout(() => controller.abort(new Error('Timed out waiting for HMR')), 5000)
  try {
    let data = ''
    const decoder = new TextDecoder()
    while (!data.includes(expected)) {
      const chunk = await reader.read()
      if (chunk.done) throw new Error('Live update stream closed')
      data += decoder.decode(chunk.value, { stream: true })
    }
  } finally {
    clearTimeout(timeout)
  }
}

test('Tailwind preview rendering and HMR use the project theme without host CSS tooling', async () => {
  const dir = createProject()
  const templatePath = join(dir, 'emails/welcome.tsx')
  const configPath = join(dir, 'tailwind.config.cjs')
  writeFileSync(templatePath, templateSource('text-brand'))
  writeFileSync(
    configPath,
    "module.exports = { theme: { extend: { colors: { brand: '#123456', accent: '#654321' } } } }",
  )
  const originalCwd = process.cwd()
  const request = Object.getOwnPropertyDescriptor(globalThis, 'Request')
  const response = Object.getOwnPropertyDescriptor(globalThis, 'Response')
  const controller = new AbortController()
  let server: PreviewServer | undefined
  process.chdir(dir)

  try {
    const port = await availablePort()
    server = await startPreviewServer({ dir: 'emails', port, tailwind: true })
    const url = `http://127.0.0.1:${port}`
    const props = await fetch(`${url}/api/templates/Welcome/props`)
    expect(props.status).toBe(200)
    expect(await props.json()).toEqual({
      name: { type: 'string', required: false, defaultValue: 'Guest' },
    })
    expect(await renderHtml(url)).toContain('color:#123456')

    const live = await fetch(`${url}/__live`, { signal: controller.signal })
    const reader = live.body?.getReader()
    if (!reader) throw new Error('Missing live update stream')
    await readEvent(reader, controller, ':ok')
    writeFileSync(templatePath, templateSource('text-accent'))
    await readEvent(reader, controller, 'event: templates-changed')
    const updatedHtml = await renderHtml(url)
    expect(updatedHtml).toContain('color:#654321')
    expect(updatedHtml).not.toContain('color:#123456')

    writeFileSync(
      configPath,
      "module.exports = { theme: { extend: { colors: { brand: '#123456', accent: '#abcdef' } } } }",
    )
    await readEvent(reader, controller, 'event: content-changed')
    expect(await renderHtml(url)).toContain('color:#abcdef')
  } finally {
    controller.abort()
    await server?.close()
    process.chdir(originalCwd)
    if (request) Object.defineProperty(globalThis, 'Request', request)
    if (response) Object.defineProperty(globalThis, 'Response', response)
    rmSync(dir, { recursive: true, force: true })
  }
}, 20000)

test('Tailwind preview preserves explicit email plugin CSS and config inputs', async () => {
  const dir = createProject()
  writeFileSync(join(dir, 'emails/welcome.tsx'), templateSource('text-brand bg-configured'))
  writeFileSync(
    join(dir, 'email.theme.cjs'),
    "module.exports = { theme: { extend: { colors: { configured: '#abcdef' } } } }",
  )
  writeFileSync(
    join(dir, 'email.vite.config.mjs'),
    `import { unplugin } from '@hono-email/tailwind-plugin'
export default { plugins: [unplugin.vite({
  configPath: './email.theme.cjs', css: '@theme { --color-brand: #456789; }',
})] }`,
  )
  const originalCwd = process.cwd()
  const request = Object.getOwnPropertyDescriptor(globalThis, 'Request')
  const response = Object.getOwnPropertyDescriptor(globalThis, 'Response')
  let server: PreviewServer | undefined
  process.chdir(dir)

  try {
    const port = await availablePort()
    server = await startPreviewServer({
      dir: 'emails',
      port,
      tailwind: true,
      file: 'email.vite.config.mjs',
    })
    const html = await renderHtml(`http://127.0.0.1:${port}`)
    expect(html).toContain('color:#456789')
    expect(html).toContain('background-color:#abcdef')
  } finally {
    await server?.close()
    process.chdir(originalCwd)
    if (request) Object.defineProperty(globalThis, 'Request', request)
    if (response) Object.defineProperty(globalThis, 'Response', response)
    rmSync(dir, { recursive: true, force: true })
  }
}, 20000)
