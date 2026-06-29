import caniemailData from './caniemail-data.json'
import {
  collectOpeningTags,
  extractConditionalCommentPayloads,
  stripHtmlComments,
  type OpeningTag,
} from './tags'

/**
 * Build validation lookup tables from caniemail-data.json.
 *
 * caniemail.com is the single source of truth for email-client compatibility.
 * Only features tracked by caniemail are validated; anything not present in the
 * data is allowed to pass strict mode.
 */
const buildValidationTables = () => {
  const disallowedTags = new Map<string, string>()
  const disallowedDeclarations = new Map<string, string>()
  const disallowedProperties = new Set<string>()
  const disallowedPropertyMessages = new Map<string, string>()
  const warningDeclarations = new Map<string, string>()
  const warningProperties = new Map<string, string>()
  const warningAtRules = new Map<string, string>()
  const disallowedAtRules = new Map<string, string>()

  for (const [key, entry] of Object.entries(caniemailData.features)) {
    if (entry.status === 'supported') {
      continue
    }

    if (entry.kind === 'html-tag') {
      const message =
        entry.status === 'unsupported'
          ? `The <${key}> tag isn't supported in HTML email strict mode.`
          : `The <${key}> tag has limited support in HTML email strict mode.`
      disallowedTags.set(key, message)
      continue
    }

    if (entry.kind === 'css-property') {
      const message =
        entry.status === 'unsupported'
          ? `The CSS property '${key}' isn't supported in HTML email strict mode.`
          : `The CSS property '${key}' has inconsistent support in HTML email strict mode.`
      if (entry.status === 'unsupported') {
        disallowedProperties.add(key)
        disallowedPropertyMessages.set(key, message)
      } else {
        warningProperties.set(key, message)
      }
      continue
    }

    if (entry.kind === 'css-declaration') {
      const message =
        entry.status === 'unsupported'
          ? `The CSS property '${key}' isn't supported in HTML email strict mode.`
          : `The CSS property '${key}' may not be supported consistently in HTML email strict mode.`
      if (entry.status === 'unsupported') {
        disallowedDeclarations.set(key, message)
      } else {
        warningDeclarations.set(key, message)
      }
      continue
    }

    if (entry.kind === 'css-at-rule') {
      const message =
        entry.status === 'unsupported'
          ? `The CSS at-rule '${key}' isn't supported reliably in HTML email strict mode.`
          : `The CSS at-rule '${key}' has limited support in HTML email strict mode.`
      if (entry.status === 'unsupported') {
        disallowedAtRules.set(key, message)
      } else {
        warningAtRules.set(key, message)
      }
    }
  }

  return {
    disallowedTags,
    disallowedDeclarations,
    disallowedProperties,
    disallowedPropertyMessages,
    warningDeclarations,
    warningProperties,
    warningAtRules,
    disallowedAtRules,
  }
}

const {
  disallowedTags: DISALLOWED_TAG_MESSAGES,
  disallowedDeclarations: DISALLOWED_CSS_DECLARATIONS,
  disallowedProperties: DISALLOWED_CSS_PROPERTIES,
  disallowedPropertyMessages: DISALLOWED_CSS_PROPERTY_MESSAGES,
  warningDeclarations: WARNING_CSS_DECLARATIONS,
  warningProperties: WARNING_CSS_PROPERTIES,
  warningAtRules: WARNING_AT_RULES,
  disallowedAtRules: DISALLOWED_AT_RULES,
} = buildValidationTables()

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

const validateTags = (openingTags: OpeningTag[]): void => {
  for (const tag of openingTags) {
    const message = DISALLOWED_TAG_MESSAGES.get(tag.name)
    if (message) {
      throw new Error(message)
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

const collectCssWarnings = (cssText: string, warnings: Set<string>): void => {
  const normalizedCssText = stripCssComments(cssText).toLowerCase()

  for (const [atRule, message] of DISALLOWED_AT_RULES) {
    if (normalizedCssText.includes(atRule)) {
      throw new Error(message)
    }
  }

  for (const [atRule, message] of WARNING_AT_RULES) {
    if (normalizedCssText.includes(atRule)) {
      warnings.add(message)
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

const validateCssDeclarations = (cssText: string, warnings: Set<string>): void => {
  const normalizedCssText = stripCssComments(cssText)
  collectCssWarnings(normalizedCssText, warnings)

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
    const disallowedDeclarationMessage = DISALLOWED_CSS_DECLARATIONS.get(declarationKey)
    if (disallowedDeclarationMessage) {
      throw new Error(disallowedDeclarationMessage)
    }

    if (DISALLOWED_CSS_PROPERTIES.has(property)) {
      throw new Error(
        DISALLOWED_CSS_PROPERTY_MESSAGES.get(property) ??
          `The CSS property '${property}' isn't supported in HTML email strict mode.`,
      )
    }

    const warningDeclarationMessage = WARNING_CSS_DECLARATIONS.get(declarationKey)
    if (warningDeclarationMessage) {
      warnings.add(warningDeclarationMessage)
    }

    const warningPropertyMessage = WARNING_CSS_PROPERTIES.get(property)
    if (warningPropertyMessage) {
      warnings.add(warningPropertyMessage)
    }
  }
}

const validateStyleAttributes = (openingTags: OpeningTag[], warnings: Set<string>): void => {
  for (const tag of openingTags) {
    const cssText = tag.attributes.get('style')

    if (cssText && cssText.trim() !== '') {
      validateCssDeclarations(cssText, warnings)
    }
  }
}

const validateStyleTags = (
  html: string,
  openingTags: OpeningTag[],
  warnings: Set<string>,
): void => {
  for (const cssText of collectStyleTagContents(html, openingTags)) {
    if (cssText.trim() === '') {
      continue
    }

    validateCssDeclarations(cssText, warnings)
  }
}

const validateHtmlFragment = (
  html: string,
  warnings: Set<string>,
  options?: { enforceStylePlacement?: boolean },
): void => {
  const openingTags = collectOpeningTags(html)

  validateTags(openingTags)
  if (options?.enforceStylePlacement ?? true) {
    validateStylePlacement(html, openingTags)
  }
  validateStylesheetLinks(openingTags)
  validateAnchors(openingTags)
  validateUnsafeAttributes(openingTags, warnings)
  validateImages(openingTags, warnings)
  validateStyleAttributes(openingTags, warnings)
  validateStyleTags(html, openingTags, warnings)
}

export const validateHtml = (html: string): string[] => {
  const warnings = new Set<string>()
  const conditionalCommentPayloads = extractConditionalCommentPayloads(html)
  const htmlWithoutComments = stripHtmlComments(html)

  validateHtmlFragment(htmlWithoutComments, warnings)
  for (const payload of conditionalCommentPayloads) {
    validateHtmlFragment(payload, warnings, { enforceStylePlacement: false })
  }

  return Array.from(warnings)
}
