import { parseSync } from 'oxc-parser'

import { suppressionProblem } from './comment-policy.mjs'

const files = Bun.spawnSync([
  'git',
  'ls-files',
  '-z',
  '--cached',
  '--others',
  '--exclude-standard',
  '--deduplicate',
])
if (!files.success) throw new Error(files.stderr.toString())

const scriptFile = /\.[cm]?[jt]sx?$/u
const componentFile = /\.(?:astro|svelte|vue)$/u
const frontmatter = /^\uFEFF?[ \t]*---[ \t]*\r?\n(.*?)(?<=\n)---[ \t]*(?:\r?\n|$)/dsu
const componentScript =
  /<!--[\s\S]*?(?:-->|$)|<script(?=[\s>])(?:[^"'<>]|"[^"]*"|'[^']*')*>([\s\S]*?)<\/script\s*>/dgiu

/** @param {string} filename @param {string} source */
function* commentsIn(filename, source) {
  if (scriptFile.test(filename)) {
    yield* parseSync(filename, source).comments
    return
  }

  /** @param {number} start @param {number} end */
  function* commentsAt(start, end) {
    for (const comment of parseSync('component.tsx', source.slice(start, end)).comments) {
      yield { ...comment, start: start + comment.start }
    }
  }

  const front = filename.endsWith('.astro') ? frontmatter.exec(source) : null
  const range = front?.indices?.[1]
  if (range) yield* commentsAt(...range)

  const offset = front?.[0].length ?? 0
  for (const match of source.slice(offset).matchAll(componentScript)) {
    const script = match.indices?.[1]
    if (script) yield* commentsAt(offset + script[0], offset + script[1])
  }
}

for (const filename of files.stdout.toString().split('\0')) {
  if (!scriptFile.test(filename) && !componentFile.test(filename)) continue
  const file = Bun.file(filename)
  if (!(await file.exists())) continue
  const source = await file.text()
  const options = { lintOnly: filename.startsWith('examples/') }
  for (const comment of commentsIn(filename, source)) {
    const problem = suppressionProblem(comment.value, filename, options)
    if (!problem) continue
    const line = source.slice(0, comment.start).split('\n').length
    console.error(`${filename}:${line}: ${problem}`)
    process.exitCode = 1
  }
}
