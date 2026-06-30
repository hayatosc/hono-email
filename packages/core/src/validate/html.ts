import {
  ALWAYS_BLOCKED_TAGS,
  EMAIL_CLIENT_NAMES,
  type CaniemailDataFile,
  type EmailClient,
} from './caniemail'
import caniemailDataJson from './caniemail-data.json' with { type: 'json' }
import {
  collectOpeningTags,
  extractConditionalCommentPayloads,
  stripHtmlComments,
  type OpeningTag,
} from './tags'

const { tables, clientData } = caniemailDataJson as unknown as CaniemailDataFile

const formatClients = (clients: EmailClient[]): string => {
  const names = clients.map((c) => EMAIL_CLIENT_NAMES[c])
  return names.length === 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

const getUnsupportedClients = (
  key: string,
  warningClients: EmailClient[],
): { clients: EmailClient[]; url: string } | undefined => {
  const entry = clientData[key]
  if (!entry) return undefined
  const unsupported = warningClients.filter((c) => entry[c] === 'n' || entry[c] === 'a')
  return unsupported.length > 0 ? { clients: unsupported, url: entry.url } : undefined
}

const CSS_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g
const IMPORTANT_PATTERN = /\s*!important\b/gi
const CSS_DECLARATION_PATTERN = /([a-z0-9-]+)\s*:\s*([^;}{]+)/gi
const CSS_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi
const HEAD_CLOSE_PATTERN = /<\/head\s*>/i
const DANGEROUS_URL_SCHEMES = new Set(['data', 'file', 'javascript', 'vbscript'])
const DANGEROUS_CSS_URL_SCHEMES = new Set(['file', 'javascript', 'vbscript'])

const stripCssComments = (cssText: string): string => cssText.replace(CSS_COMMENT_PATTERN, ' ')

const normalizeCssValue = (value: string): string =>
  stripCssComments(value).replace(IMPORTANT_PATTERN, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const decodeHtmlAttributeValue = (value: string): string =>
  value.replace(/&(#x[0-9a-f]+|#\d+|colon|tab|newline);?/giu, (entity, body: string) => {
    const normalized = body.toLowerCase()
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
    }

    if (normalized === 'colon') {
      return ':'
    }

    if (normalized === 'tab') {
      return '\t'
    }

    if (normalized === 'newline') {
      return '\n'
    }

    return entity
  })

const getUrlScheme = (value: string): string | undefined => {
  const decoded = decodeHtmlAttributeValue(value).trim()
  const compacted = Array.from(decoded)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 0x20 && codePoint !== 0x7f
    })
    .join('')
  const match = compacted.match(/^([a-z][a-z0-9+.-]*):/iu)
  return match?.[1]?.toLowerCase()
}

const validateTags = (
  openingTags: OpeningTag[],
  warnings: Set<string>,
  warningClients: EmailClient[],
): void => {
  for (const tag of openingTags) {
    if (ALWAYS_BLOCKED_TAGS.has(tag.name)) {
      throw new Error(
        `The <${tag.name}> tag isn't allowed in HTML email strict mode. Active content and embedded resources must not be used in email HTML.`,
      )
    }

    const disallowedEntry = tables.disallowedTags[tag.name]
    if (disallowedEntry) {
      throw new Error(`${disallowedEntry.message} See: ${disallowedEntry.url}`)
    }

    const warningEntry = tables.warningTags[tag.name]
    if (warningEntry) {
      warnings.add(`${warningEntry.message} See: ${warningEntry.url}`)
    }

    if (warningClients.length > 0) {
      const result = getUnsupportedClients(`html-tag:${tag.name}`, warningClients)
      if (result) {
        warnings.add(
          `The <${tag.name}> tag is not supported in ${formatClients(result.clients)}. See: ${result.url}`,
        )
      }
    }
  }
}

const validateAnchors = (openingTags: OpeningTag[]): void => {
  for (const tag of openingTags) {
    if (tag.name !== 'a') {
      continue
    }

    const href = tag.attributes.get('href')

    if (href === undefined || href.trim() === '') {
      throw new Error(
        'The <a> tag is missing an href attribute. Use <Link href="..."> or <Button href="..."> with a real destination URL.',
      )
    }
  }
}

const validateUnsafeAttributes = (openingTags: OpeningTag[], warnings: Set<string>): void => {
  for (const tag of openingTags) {
    for (const attributeName of tag.attributes.keys()) {
      if (attributeName.startsWith('on')) {
        throw new Error(
          `The '${attributeName}' attribute isn't supported in HTML email strict mode. JavaScript event handlers must not be used in email HTML.`,
        )
      }
    }

    const href = tag.attributes.get('href')
    if (href !== undefined) {
      const scheme = getUrlScheme(href)
      if (scheme !== undefined && DANGEROUS_URL_SCHEMES.has(scheme)) {
        throw new Error(
          `The ${tag.name} href uses the unsafe '${scheme}:' URL scheme. Use http, https, mailto, tel, or a relative URL instead.`,
        )
      }
    }

    const src = tag.attributes.get('src')
    if (src !== undefined) {
      const scheme = getUrlScheme(src)
      if (scheme !== undefined && DANGEROUS_URL_SCHEMES.has(scheme)) {
        if (tag.name === 'img' && scheme === 'data') {
          warnings.add(
            'Base64 image data URLs have inconsistent support in email clients. Prefer hosted image URLs or cid: inline attachments.',
          )
        } else {
          throw new Error(
            `The ${tag.name} src uses the unsafe '${scheme}:' URL scheme. Use http, https, cid, or a relative URL instead.`,
          )
        }
      }
    }

    if (tag.name === 'img' && (tag.attributes.has('srcset') || tag.attributes.has('sizes'))) {
      warnings.add(
        'The img srcset and sizes attributes have limited support in email clients. Use a single src image sized for email instead.',
      )
    }
  }
}

const validateImages = (openingTags: OpeningTag[], warnings: Set<string>): void => {
  for (const tag of openingTags) {
    if (tag.name !== 'img') {
      continue
    }

    if (!tag.attributes.has('alt')) {
      warnings.add(
        'The <img> tag is missing an alt attribute. Add alt text for meaningful images, or use alt="" for decorative images.',
      )
    }
  }
}

const validateStylePlacement = (html: string, openingTags: OpeningTag[]): void => {
  const headOpen = openingTags.find((tag) => tag.name === 'head')
  const headClose = html.match(HEAD_CLOSE_PATTERN)

  for (const tag of openingTags) {
    if (tag.name !== 'style') {
      continue
    }

    if (
      !headOpen ||
      !headClose ||
      headClose.index === undefined ||
      tag.index < headOpen.index ||
      tag.index > headClose.index
    ) {
      throw new Error(
        'The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling.',
      )
    }
  }
}

const validateStylesheetLinks = (openingTags: OpeningTag[]): void => {
  for (const tag of openingTags) {
    if (tag.name !== 'link') {
      continue
    }

    const rel = tag.attributes.get('rel')?.toLowerCase()

    if (!rel) {
      continue
    }

    const relTokens = rel.split(/\s+/).filter(Boolean)
    if (relTokens.includes('stylesheet')) {
      throw new Error(
        'The <link rel="stylesheet"> tag isn\'t supported in HTML email strict mode. Move styles into <Head><style>...</style> instead.',
      )
    }
  }
}

const collectStyleTagContents = (html: string, openingTags: OpeningTag[]): string[] => {
  const contents: string[] = []
  const lowerHtml = html.toLowerCase()

  for (const tag of openingTags) {
    if (tag.name !== 'style') {
      continue
    }

    const closeIndex = lowerHtml.indexOf('</style>', tag.endIndex)
    if (closeIndex < 0) {
      continue
    }

    contents.push(html.slice(tag.endIndex, closeIndex))
  }

  return contents
}

const collectCssWarnings = (
  cssText: string,
  warnings: Set<string>,
  warningClients: EmailClient[],
): void => {
  const normalizedCssText = stripCssComments(cssText).toLowerCase()

  for (const [atRule, entry] of Object.entries(tables.disallowedAtRules)) {
    if (normalizedCssText.includes(atRule)) {
      throw new Error(`${entry.message} See: ${entry.url}`)
    }
  }

  for (const [atRule, entry] of Object.entries(tables.warningAtRules)) {
    if (normalizedCssText.includes(atRule)) {
      warnings.add(`${entry.message} See: ${entry.url}`)
    }
  }

  if (warningClients.length > 0) {
    for (const [namespacedKey] of Object.entries(clientData)) {
      if (!namespacedKey.startsWith('css-at-rule:')) continue
      const atRule = namespacedKey.slice('css-at-rule:'.length)
      if (!normalizedCssText.includes(atRule)) continue
      const result = getUnsupportedClients(namespacedKey, warningClients)
      if (result) {
        warnings.add(
          `The CSS at-rule '${atRule}' is not supported in ${formatClients(result.clients)}. See: ${result.url}`,
        )
      }
    }
  }
}

const validateCssUrls = (property: string, value: string, warnings: Set<string>): void => {
  for (const match of value.matchAll(CSS_URL_PATTERN)) {
    const rawUrl = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    const scheme = getUrlScheme(rawUrl)
    if (scheme === undefined) {
      continue
    }

    if (DANGEROUS_CSS_URL_SCHEMES.has(scheme)) {
      throw new Error(
        `The CSS property '${property}' uses the unsafe '${scheme}:' URL scheme. Use a hosted asset URL or cid: inline attachment instead.`,
      )
    }

    if (scheme === 'data') {
      warnings.add(
        `The CSS property '${property}' uses a data URL, which has inconsistent support in email clients. Prefer hosted assets or cid: inline attachments.`,
      )
    }
  }
}

const validateCssDeclarations = (
  cssText: string,
  warnings: Set<string>,
  warningClients: EmailClient[],
): void => {
  const normalizedCssText = stripCssComments(cssText)
  collectCssWarnings(normalizedCssText, warnings, warningClients)

  for (const match of normalizedCssText.matchAll(CSS_DECLARATION_PATTERN)) {
    const property = match[1]?.toLowerCase()
    const normalizedValue = normalizeCssValue(match[2] ?? '')

    if (!property || !normalizedValue) {
      continue
    }

    validateCssUrls(property, match[2] ?? '', warnings)

    if (property.startsWith('--')) {
      throw new Error(`CSS variables ('${property}') aren't supported in HTML email strict mode.`)
    }

    if (/\bvar\s*\(/.test(normalizedValue)) {
      throw new Error(
        `The 'var()' function isn't supported in HTML email strict mode. Use static values instead.`,
      )
    }

    if (/\bcalc\s*\(/.test(normalizedValue)) {
      warnings.add(
        "The CSS function 'calc()' may not be supported consistently across email clients, especially in Outlook (Windows).",
      )
    }

    if (/\b\d+(\.\d+)?(rem|em)\b/.test(normalizedValue)) {
      warnings.add(
        "The CSS units 'rem' and 'em' may not be supported consistently. Use 'px' for more reliable rendering across email clients.",
      )
    }

    const declarationKey = `${property}:${normalizedValue}`
    const disallowedDeclaration = tables.disallowedDeclarations[declarationKey]
    if (disallowedDeclaration) {
      throw new Error(`${disallowedDeclaration.message} See: ${disallowedDeclaration.url}`)
    }

    const disallowedProperty = tables.disallowedProperties[property]
    if (disallowedProperty) {
      throw new Error(`${disallowedProperty.message} See: ${disallowedProperty.url}`)
    }

    const warningDeclaration = tables.warningDeclarations[declarationKey]
    if (warningDeclaration) {
      warnings.add(`${warningDeclaration.message} See: ${warningDeclaration.url}`)
    }

    const warningProperty = tables.warningProperties[property]
    if (warningProperty) {
      warnings.add(`${warningProperty.message} See: ${warningProperty.url}`)
    }

    if (warningClients.length > 0) {
      const declResult = getUnsupportedClients(`css-declaration:${declarationKey}`, warningClients)
      if (declResult) {
        warnings.add(
          `The CSS property '${declarationKey}' is not supported in ${formatClients(declResult.clients)}. See: ${declResult.url}`,
        )
      }

      const propResult = getUnsupportedClients(`css-property:${property}`, warningClients)
      if (propResult) {
        warnings.add(
          `The CSS property '${property}' is not supported in ${formatClients(propResult.clients)}. See: ${propResult.url}`,
        )
      }
    }
  }
}

const validateStyleAttributes = (
  openingTags: OpeningTag[],
  warnings: Set<string>,
  warningClients: EmailClient[],
): void => {
  for (const tag of openingTags) {
    const cssText = tag.attributes.get('style')

    if (cssText && cssText.trim() !== '') {
      validateCssDeclarations(cssText, warnings, warningClients)
    }
  }
}

const validateStyleTags = (
  html: string,
  openingTags: OpeningTag[],
  warnings: Set<string>,
  warningClients: EmailClient[],
): void => {
  for (const cssText of collectStyleTagContents(html, openingTags)) {
    if (cssText.trim() === '') {
      continue
    }

    validateCssDeclarations(cssText, warnings, warningClients)
  }
}

const validateHtmlFragment = (
  html: string,
  warnings: Set<string>,
  options?: { enforceStylePlacement?: boolean; warningClients?: EmailClient[] },
): void => {
  const openingTags = collectOpeningTags(html)
  const warningClients = options?.warningClients ?? []

  validateTags(openingTags, warnings, warningClients)
  if (options?.enforceStylePlacement ?? true) {
    validateStylePlacement(html, openingTags)
  }
  validateStylesheetLinks(openingTags)
  validateAnchors(openingTags)
  validateUnsafeAttributes(openingTags, warnings)
  validateImages(openingTags, warnings)
  validateStyleAttributes(openingTags, warnings, warningClients)
  validateStyleTags(html, openingTags, warnings, warningClients)
}

export const validateHtml = (html: string, warningClients: EmailClient[] = []): string[] => {
  const warnings = new Set<string>()
  const conditionalCommentPayloads = extractConditionalCommentPayloads(html)
  const htmlWithoutComments = stripHtmlComments(html)

  validateHtmlFragment(htmlWithoutComments, warnings, { warningClients })
  for (const payload of conditionalCommentPayloads) {
    validateHtmlFragment(payload, warnings, { enforceStylePlacement: false, warningClients })
  }

  return Array.from(warnings)
}
