import { defineCommand, runMain } from 'citty'

import { startPreviewServer } from './server/index.js'

const main = defineCommand({
  meta: {
    name: 'hono-email-preview',
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
  },
  async run({ args }) {
    const port = Number(args.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`Invalid port: ${args.port}`)
      process.exit(1)
    }

    const server = await startPreviewServer({
      dir: args.dir,
      port,
    })

    const shutdown = async () => {
      console.log('\nShutting down...')
      await server.close()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  },
})

void runMain(main)