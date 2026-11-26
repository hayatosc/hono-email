import { readFileSync, writeFileSync } from 'node:fs'

const declarations = new URL('./worker-configuration.d.ts', import.meta.url)
const source = readFileSync(declarations, 'utf8')
const cleaned = source
  .replace(/^\/\* eslint-disable \*\/\r?\n/gmu, '')
  .replace(/[ \t]+\/\/ eslint-disable-line(?=\r?$)/gmu, '')

if (cleaned !== source) writeFileSync(declarations, cleaned)
