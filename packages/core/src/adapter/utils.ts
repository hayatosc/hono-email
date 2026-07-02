export const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const CRLF = '\r\n'

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += BASE64_ALPHABET[(combined >> 18) & 0x3f]
    output += BASE64_ALPHABET[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 0x3f] : '='
  }

  return output
}
