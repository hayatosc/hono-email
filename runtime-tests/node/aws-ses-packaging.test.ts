import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../../', import.meta.url))

void test('SDK-independent consumers can import and typecheck the built package without AWS or Void SDKs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hono-email-no-aws-'))
  try {
    const modules = join(directory, 'node_modules')
    const core = join(modules, 'hono-email')
    await mkdir(core, { recursive: true })
    await cp(join(root, 'packages/core/dist'), join(core, 'dist'), { recursive: true })
    await cp(join(root, 'packages/core/package.json'), join(core, 'package.json'))
    for (const dependency of ['hono', 'htmlrewriter']) {
      await symlink(
        join(root, 'packages/core/node_modules', dependency),
        join(modules, dependency),
        'dir',
      )
    }
    await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }))
    const consumerRequire = createRequire(join(directory, 'package.json'))
    for (const sdk of ['@aws-sdk/client-sesv2', 'void/email']) {
      assert.throws(() => consumerRequire.resolve(sdk), { code: 'MODULE_NOT_FOUND' })
    }

    const source = `
      import { render } from 'hono-email'
      import { sendEmail } from 'hono-email/adapter'
      import { ResendAdapter } from 'hono-email/resend'
      import { SmtpTransport } from 'hono-email/smtp'
      import { VoidEmailAdapter } from 'hono-email/void'
      if (typeof sendEmail !== 'function' || typeof ResendAdapter !== 'function' || typeof SmtpTransport !== 'function') throw new Error('Missing export')
      const adapter = VoidEmailAdapter({ sendEmail: async ({ to }) => ({
        ok: true,
        ids: to.map(({ email }) => ({ recipient: email, messageId: 'void-1' })),
      }) })
      const receipt = await sendEmail({ adapter, from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', jsx: 'Hello' })
      if (!receipt.successful || receipt.messageId !== 'void-1') throw new Error('Void adapter failed')
      await render('Hello')
    `
    await writeFile(join(directory, 'consumer.ts'), source)
    await writeFile(join(directory, 'consumer.mjs'), source)
    await writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          types: [],
        },
        include: ['consumer.ts'],
      }),
    )

    const runtime = spawnSync(process.execPath, ['consumer.mjs'], {
      cwd: directory,
      encoding: 'utf8',
    })
    assert.equal(runtime.status, 0, runtime.stderr)
    const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc')
    const types = spawnSync(process.execPath, [compiler, '--project', directory], {
      cwd: directory,
      encoding: 'utf8',
    })
    assert.equal(types.status, 0, types.stdout + types.stderr)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
