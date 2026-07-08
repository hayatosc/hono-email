#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { defineCommand, runMain } from 'citty'

import { startPreviewServer } from './server/index.js'

export const preview = defineCommand({
  meta: {
    name: 'preview',
    description: 'Live preview server for hono-email templates',
  },
  args: {
    dir: {
      alias: 'd',
      type: 'string',
      description: 'Template directory',
      default: './emails',
    },
    port: {
      alias: 'p',
      type: 'string',
      description: 'Server port',
      default: '3000',
    },
    host: {
      type: 'string',
      description: 'Server host (default: 127.0.0.1)',
    },
  },
  async run({ args }) {
    const port = Number(args.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`Invalid port: ${args.port}`)
      process.exit(1)
    }

    try {
      const server = await startPreviewServer({
        dir: args.dir,
        port,
        host: args.host,
      })

      let shuttingDown = false
      const shutdown = async () => {
        if (shuttingDown) {
          process.exit(0)
        }
        shuttingDown = true
        console.log('\nShutting down...')

        const forceExitTimeout = setTimeout(() => {
          process.exit(0)
        }, 1000)
        forceExitTimeout.unref()

        try {
          await server.close()
        } catch {
          // ignore
        } finally {
          clearTimeout(forceExitTimeout)
          process.exit(0)
        }
      }

      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(`Error: ${err.message}`)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        console.error(`Error: ${String(err.message)}`)
      } else {
        console.error(`Error: ${String(err)}`)
      }
      process.exit(1)
    }
  },
})

export const main = defineCommand({
  meta: {
    name: 'hono-email',
    description: 'hono-email command line interface',
  },
  subCommands: {
    preview,
  },
})

const isMainModule = (): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  // `realpathSync` throws when argv[1] is not a real file path (e.g. `node -e`).
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href
  } catch {
    return false
  }
}

if (isMainModule()) {
  void runMain(main)
}
