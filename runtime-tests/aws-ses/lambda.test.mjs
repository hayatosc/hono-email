import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

void test('packaged Lambda renders and sends through the SDK, returning only failed SQS IDs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hono-email-lambda-'))
  const bodies = []
  const server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += String(chunk)
    bodies.push(body)
    response.setHeader('Content-Type', 'application/json')
    if (bodies.length === 2) {
      response.writeHead(429)
      response.end(JSON.stringify({ __type: 'TooManyRequestsException', message: 'Rate exceeded' }))
    } else {
      response.end(JSON.stringify({ MessageId: `ses-${bodies.length}` }))
    }
  })
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    await cp(new URL('../../examples/aws-ses-sqs/dist/', import.meta.url), directory, {
      recursive: true,
    })
    await writeFile(
      join(directory, 'invoke.mjs'),
      `
      import { handler } from './handler.mjs'
      const Records = ['first', 'second', 'third'].map((messageId) => ({
        messageId,
        body: JSON.stringify({ to: 'recipient@example.com', name: 'Alice' }),
        eventSourceARN: 'arn:aws:sqs:ap-northeast-1:123456789012:emails',
      }))
      console.log(JSON.stringify(await handler({ Records })))
    `,
    )
    const result = await execFileAsync(process.execPath, ['invoke.mjs'], {
      cwd: directory,
      timeout: 20_000,
      env: {
        ...process.env,
        EMAIL_FROM: 'sender@example.com',
        AWS_REGION: 'ap-northeast-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_SESSION_TOKEN: 'test',
        AWS_ENDPOINT_URL_SES_V2: `http://127.0.0.1:${address.port}`,
        AWS_ENDPOINT_URL: `http://127.0.0.1:${address.port}`,
        AWS_EC2_METADATA_DISABLED: 'true',
      },
    })
    assert.deepEqual(JSON.parse(result.stdout), {
      batchItemFailures: [{ itemIdentifier: 'second' }],
    })
    assert.equal(bodies.length, 3)
    assert.match(bodies[0] ?? '', /Hello Alice, welcome aboard!/)
    assert.match(bodies[0] ?? '', /FromEmailAddress/)
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})
