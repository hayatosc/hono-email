import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { CloudflareEmailBinding } from '../../cloudflare/types'

const env = {} as Record<string, CloudflareEmailBinding>
void mock.module('cloudflare:workers', () => ({ env }))

const createSpyBinding = () => {
  const send = mock(async () => ({ messageId: 'test-id' }))
  return { binding: { send } as CloudflareEmailBinding, send }
}

const payload = {
  from: 'sender@example.com',
  html: '<p>Hello</p>',
  subject: 'Workers payload guard',
  text: 'Hello',
  to: 'recipient@example.com',
}

beforeEach(() => {
  delete env.EMAIL
})

describe('createWorkersConnector payload guard', () => {
  test('throws when workersPayload is missing without invoking binding.send', async () => {
    const { binding, send } = createSpyBinding()
    env.EMAIL = binding
    const { createWorkersConnector } = await import('./index')

    await expect(
      createWorkersConnector({ bindingName: 'EMAIL' }).send({
        recipients: [],
        workersPayload: undefined as never,
      }),
    ).rejects.toThrow('Cloudflare Email workers connector requires a workers payload.')

    expect(send).not.toHaveBeenCalled()
  })

  test('forwards a valid workersPayload unchanged to binding.send', async () => {
    const { binding, send } = createSpyBinding()
    env.EMAIL = binding
    const { createWorkersConnector } = await import('./index')

    const result = await createWorkersConnector({ bindingName: 'EMAIL' }).send({
      recipients: ['recipient@example.com'],
      workersPayload: payload,
    })

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(payload)
    expect(result.delivered).toEqual(['recipient@example.com'])
    expect(result.messageId).toBe('test-id')
  })
})

describe('WorkersConnector payload guard', () => {
  test('throws when workersPayload is missing', async () => {
    const { binding } = createSpyBinding()
    env.EMAIL = binding
    const { WorkersConnector } = await import('./index')

    await expect(
      WorkersConnector.send({ recipients: [], workersPayload: undefined as never }),
    ).rejects.toThrow('Cloudflare Email workers connector requires a workers payload.')
  })
})

afterEach(() => {
  delete env.EMAIL
})
