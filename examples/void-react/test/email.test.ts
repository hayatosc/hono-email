import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createEmailTestHarness } from 'void/email/testing'

import { sendWelcomeEmail } from '../src/welcome-email'

test('captures a rendered welcome email with the Void SDK', async () => {
  const inbox = createEmailTestHarness()
  try {
    const receipt = await sendWelcomeEmail('React & Void')

    assert.equal(receipt.successful, true)
    assert.deepEqual(receipt.accepted, ['preview@example.com'])
    assert.equal(inbox.messages.length, 1)
    const [message] = inbox.messages
    assert(message)
    assert.equal(message.subject, 'Your local welcome email')
    assert.match(message.html ?? '', /Welcome, React &amp; Void!/u)
    assert.match(message.text ?? '', /WELCOME, REACT & VOID!/u)
  } finally {
    inbox.dispose()
  }
})
