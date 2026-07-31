export type AttributePair = {
  name: string
  value: string | undefined
}

const ATTRIBUTE_NAME_END_PATTERN = /[\s=/><]/

const WHITESPACE_PATTERN = /\s/

const UNQUOTED_VALUE_END_PATTERN = /[\s"'=<>]/

const parseAttributePairs = (attributes: string): AttributePair[] => {
  const pairs: AttributePair[] = []
  let index = 0
  const length = attributes.length

  while (index < length) {
    while (index < length && WHITESPACE_PATTERN.test(attributes[index] ?? '')) {
      index += 1
    }
    if (index >= length) {
      break
    }

    const nameStart = index
    while (index < length && !ATTRIBUTE_NAME_END_PATTERN.test(attributes[index] ?? '')) {
      index += 1
    }
    const name = attributes.slice(nameStart, index).toLowerCase()
    if (name === '') {
      index += 1
      continue
    }

    while (index < length && WHITESPACE_PATTERN.test(attributes[index] ?? '')) {
      index += 1
    }

    let value: string | undefined
    if (attributes[index] === '=') {
      index += 1
      while (index < length && WHITESPACE_PATTERN.test(attributes[index] ?? '')) {
        index += 1
      }

      const quote = attributes[index]
      if (quote === '"' || quote === "'") {
        index += 1
        const valueStart = index
        while (index < length && attributes[index] !== quote) {
          index += 1
        }
        value = attributes.slice(valueStart, index)
        if (attributes[index] === quote) {
          index += 1
        }
      } else {
        const valueStart = index
        while (index < length && !UNQUOTED_VALUE_END_PATTERN.test(attributes[index] ?? '')) {
          index += 1
        }
        value = attributes.slice(valueStart, index)
      }
    }

    pairs.push({ name, value })
  }

  return pairs
}

export const readAttribute = (attributes: string, name: string): string | undefined => {
  const target = name.toLowerCase()

  for (const pair of parseAttributePairs(attributes)) {
    if (pair.name === target) {
      return pair.value
    }
  }

  return undefined
}

export const hasAttribute = (attributes: string, name: string): boolean => {
  const target = name.toLowerCase()

  for (const pair of parseAttributePairs(attributes)) {
    if (pair.name === target) {
      return true
    }
  }

  return false
}
