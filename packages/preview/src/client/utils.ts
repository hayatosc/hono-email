function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function getApiErrorMessageFromBody(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (isObject(parsed) && typeof parsed.error === 'string' && parsed.error.length > 0) {
      return parsed.error
    }
    if (typeof parsed === 'string' && parsed.length > 0) {
      return parsed
    }
  } catch {
    if (body.trim().length > 0) return body.trim()
  }

  return `Request failed (${status})`
}

export async function getApiErrorMessage(response: Response): Promise<string> {
  return getApiErrorMessageFromBody(await response.text(), response.status)
}

export function handleLiveUpdate(
  eventType: string,
  callbacks: {
    onTemplatesChanged: () => void
    onContentChanged: () => void
  },
): void {
  if (eventType === 'templates-changed') {
    callbacks.onTemplatesChanged()
  } else if (eventType === 'content-changed') {
    callbacks.onContentChanged()
  }
}
