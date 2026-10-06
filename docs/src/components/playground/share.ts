const HASH_PREFIX = '#code/'

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const pipe = async (
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> =>
  new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

/**
 * Encodes playground source into a URL hash.
 *
 * @param source - Editor contents.
 * @returns Hash such as `#code/<deflated base64url>`.
 */
export const encodeSourceToHash = async (source: string): Promise<string> =>
  HASH_PREFIX +
  toBase64Url(await pipe(new TextEncoder().encode(source), new CompressionStream('deflate-raw')))

/**
 * Decodes playground source from a URL hash created by `encodeSourceToHash()`.
 *
 * @param hash - `location.hash`.
 * @returns The source, or `undefined` when the hash holds no valid playground code.
 */
export const decodeSourceFromHash = async (hash: string): Promise<string | undefined> => {
  if (!hash.startsWith(HASH_PREFIX)) return undefined
  try {
    const bytes = fromBase64Url(hash.slice(HASH_PREFIX.length))
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')))
  } catch {
    return undefined
  }
}
