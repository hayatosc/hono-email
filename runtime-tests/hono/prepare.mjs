import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [version, destination] = process.argv.slice(2)
if (!version || !destination) throw new Error('Usage: prepare.mjs <hono-version> <directory>')
const source = fileURLToPath(new URL('../../packages/core/', import.meta.url))
const core = path.join(destination, 'core')
await mkdir(core, { recursive: true })
await cp(path.join(source, 'dist'), path.join(core, 'dist'), { recursive: true })
const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'))
delete manifest.devDependencies
delete manifest.scripts
await writeFile(path.join(core, 'package.json'), JSON.stringify(manifest))
await writeFile(
  path.join(destination, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    packageManager: 'bun@1.3.12',
    dependencies: { hono: version, 'hono-email': 'file:./core' },
  }),
)
await cp(new URL('./compat.test.mjs', import.meta.url), path.join(destination, 'compat.test.mjs'))
