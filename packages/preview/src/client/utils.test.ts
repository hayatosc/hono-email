import { describe, expect, test } from 'bun:test'

import { getApiErrorMessageFromBody, handleLiveUpdate } from './utils'

describe('getApiErrorMessageFromBody', () => {
  test('extracts the server error field', () => {
    expect(getApiErrorMessageFromBody('{"error":"Missing required props: trialDays"}', 400)).toBe(
      'Missing required props: trialDays',
    )
  })

  test('falls back to plain text and status for unexpected bodies', () => {
    expect(getApiErrorMessageFromBody('Service unavailable', 503)).toBe('Service unavailable')
    expect(getApiErrorMessageFromBody('{"message":"failed"}', 500)).toBe('Request failed (500)')
    expect(getApiErrorMessageFromBody('', 500)).toBe('Request failed (500)')
  })
})

describe('handleLiveUpdate', () => {
  test('refreshes templates for template events without rendering directly', () => {
    const calls: string[] = []
    handleLiveUpdate('templates-changed', {
      onTemplatesChanged: () => calls.push('templates'),
      onContentChanged: () => calls.push('content'),
    })
    expect(calls).toEqual(['templates'])
  })

  test('renders directly for content events', () => {
    const calls: string[] = []
    handleLiveUpdate('content-changed', {
      onTemplatesChanged: () => calls.push('templates'),
      onContentChanged: () => calls.push('content'),
    })
    expect(calls).toEqual(['content'])
  })
})
