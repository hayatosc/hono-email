interface AcceptType {
  type: string
  subtype: string
  q: number
}

export function parseAccept(acceptHeader: string): AcceptType[] {
  return acceptHeader
    .split(',')
    .map((item) => {
      const parts = item.split(';')
      const mediaType = parts[0].trim()
      const [type, subtype] = mediaType.split('/')
      let q = 1.0
      for (let i = 1; i < parts.length; i++) {
        const param = parts[i].trim()
        if (param.startsWith('q=')) {
          const val = parseFloat(param.slice(2))
          if (!isNaN(val)) {
            q = val
          }
        }
      }
      return { type, subtype, q }
    })
    .filter((item) => item.type && item.subtype)
}

export function negotiateContentType(
  acceptHeader: string | undefined,
): 'text/html' | 'text/markdown' | '406' {
  if (!acceptHeader) {
    return 'text/html'
  }

  const parsed = parseAccept(acceptHeader)
  if (parsed.length === 0) {
    return 'text/html'
  }

  const clientTypes = parsed.filter((t) => t.q > 0)
  if (clientTypes.length === 0) {
    return '406'
  }

  const serverTypes = ['text/html', 'text/markdown'] as const
  let bestType: 'text/html' | 'text/markdown' | null = null
  let maxQ = -1

  for (const serverType of serverTypes) {
    const [sType, sSubtype] = serverType.split('/')
    let currentMaxQForType = -1
    for (const clientType of clientTypes) {
      const match =
        (clientType.type === '*' && clientType.subtype === '*') ||
        (clientType.type === sType && clientType.subtype === '*') ||
        (clientType.type === sType && clientType.subtype === sSubtype)
      if (match) {
        if (clientType.q > currentMaxQForType) {
          currentMaxQForType = clientType.q
        }
      }
    }

    if (currentMaxQForType > maxQ) {
      maxQ = currentMaxQForType
      bestType = serverType
    } else if (currentMaxQForType === maxQ && maxQ !== -1) {
      if (serverType === 'text/html') {
        bestType = 'text/html'
      }
    }
  }

  if (bestType === null) {
    return '406'
  }

  return bestType
}
