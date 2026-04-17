const DISALLOWED_TAG_MESSAGES = new Map([
  ['form', 'The <form> tag isn\'t supported in HTML email strict mode. Use <Button href="..."> or <Link href="..."> for clickable actions instead.'],
  ['input', 'The <input> tag isn\'t supported in HTML email strict mode. Use copy, links, or explicit fallback text instead of interactive form fields.'],
  ['button', 'The <button> tag isn\'t supported in HTML email strict mode. Use <Button href="..."> or <Link href="..."> instead.'],
  ['select', 'The <select> tag isn\'t supported in HTML email strict mode. Use links to separate landing pages instead of interactive selection controls.'],
  ['option', 'The <option> tag isn\'t supported in HTML email strict mode. Use links or plain text choices instead.'],
  ['textarea', 'The <textarea> tag isn\'t supported in HTML email strict mode. Use a link to a hosted form instead.'],
  ['label', 'The <label> tag isn\'t supported in HTML email strict mode. Remove form labeling and replace the flow with text plus links.'],
  ['video', 'The <video> tag isn\'t supported in HTML email strict mode. Use an <Img> preview linked to a hosted video page instead.'],
  ['audio', 'The <audio> tag isn\'t supported in HTML email strict mode. Use a linked image or text CTA to a hosted audio page instead.'],
  ['object', 'The <object> tag isn\'t supported in HTML email strict mode. Use static HTML content or linked assets instead of embedded objects.'],
  ['embed', 'The <embed> tag isn\'t supported in HTML email strict mode. Use static HTML content or linked assets instead.'],
  ['iframe', 'The <iframe> tag isn\'t supported in HTML email strict mode. Link to the hosted content instead of embedding it.'],
  ['canvas', 'The <canvas> tag isn\'t supported in HTML email strict mode. Render the graphic ahead of time and use <Img> instead.'],
  ['svg', 'The <svg> tag isn\'t supported in HTML email strict mode. Export the asset to an image and use <Img> instead.'],
  ['math', 'The <math> tag isn\'t supported in HTML email strict mode. Use text, an image, or pre-rendered markup instead.'],
  ['dialog', 'The <dialog> tag isn\'t supported in HTML email strict mode. Use a linked landing page for modal-like interactions instead.'],
  ['template', 'The <template> tag isn\'t supported in HTML email strict mode. Render the final HTML content directly instead.'],
  ['slot', 'The <slot> tag isn\'t supported in HTML email strict mode. Render explicit content instead of relying on slot projection.'],
  ['script', 'The <script> tag isn\'t supported in HTML email strict mode. Pre-render the final content and rely on links for interaction instead.'],
])

const DISALLOWED_CSS_DECLARATIONS = new Map([
  ['display:grid', "The CSS property 'display:grid' isn't supported in HTML email strict mode. Use <Section>, <Row>, <Column>, or table-based layout instead."],
  ['display:inline-grid', "The CSS property 'display:inline-grid' isn't supported in HTML email strict mode. Use inline-block or table-based layout instead."],
  ['display:inline-flex', "The CSS property 'display:inline-flex' isn't supported in HTML email strict mode. Use inline-block or table-based layout instead."],
])

const DISALLOWED_CSS_PROPERTIES = new Set([
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'border-inline',
  'border-inline-start',
  'border-inline-end',
  'border-block',
  'border-block-start',
  'border-block-end',
])

const DISALLOWED_CSS_PROPERTY_MESSAGES = new Map([
  ['margin-inline', "The CSS property 'margin-inline' isn't supported in HTML email strict mode. Use physical properties such as margin-left and margin-right instead."],
  ['margin-inline-start', "The CSS property 'margin-inline-start' isn't supported in HTML email strict mode. Use margin-left instead."],
  ['margin-inline-end', "The CSS property 'margin-inline-end' isn't supported in HTML email strict mode. Use margin-right instead."],
  ['margin-block', "The CSS property 'margin-block' isn't supported in HTML email strict mode. Use margin-top and margin-bottom instead."],
  ['margin-block-start', "The CSS property 'margin-block-start' isn't supported in HTML email strict mode. Use margin-top instead."],
  ['margin-block-end', "The CSS property 'margin-block-end' isn't supported in HTML email strict mode. Use margin-bottom instead."],
  ['padding-inline', "The CSS property 'padding-inline' isn't supported in HTML email strict mode. Use physical properties such as padding-left and padding-right instead."],
  ['padding-inline-start', "The CSS property 'padding-inline-start' isn't supported in HTML email strict mode. Use padding-left instead."],
  ['padding-inline-end', "The CSS property 'padding-inline-end' isn't supported in HTML email strict mode. Use padding-right instead."],
  ['padding-block', "The CSS property 'padding-block' isn't supported in HTML email strict mode. Use padding-top and padding-bottom instead."],
  ['padding-block-start', "The CSS property 'padding-block-start' isn't supported in HTML email strict mode. Use padding-top instead."],
  ['padding-block-end', "The CSS property 'padding-block-end' isn't supported in HTML email strict mode. Use padding-bottom instead."],
  ['border-inline', "The CSS property 'border-inline' isn't supported in HTML email strict mode. Use border-left and border-right instead."],
  ['border-inline-start', "The CSS property 'border-inline-start' isn't supported in HTML email strict mode. Use border-left instead."],
  ['border-inline-end', "The CSS property 'border-inline-end' isn't supported in HTML email strict mode. Use border-right instead."],
  ['border-block', "The CSS property 'border-block' isn't supported in HTML email strict mode. Use border-top and border-bottom instead."],
  ['border-block-start', "The CSS property 'border-block-start' isn't supported in HTML email strict mode. Use border-top instead."],
  ['border-block-end', "The CSS property 'border-block-end' isn't supported in HTML email strict mode. Use border-bottom instead."],
])

const WARNING_CSS_DECLARATIONS = new Map([
  ['display:flex', "The CSS property 'display:flex' may not be supported consistently across email clients. Prefer <Section>, <Row>, <Column>, or table-based layout for critical structure."],
])

const WARNING_CSS_PROPERTIES = new Map([
  ['position', "The CSS property 'position' may not be supported consistently across email clients. Prefer table structure, spacing, and natural document flow instead of positional offsets."],
  ['background-image', "The CSS property 'background-image' may not be supported consistently across email clients. Prefer <Img> or a solid background color for essential content."],
])

const WARNING_AT_RULES = new Map([
  ['@media', "The CSS at-rule '@media' may not be supported consistently across email clients. Keep the base layout readable without media queries."],
])

const STYLE_ATTRIBUTE_PATTERN = /style="([^"]*)"/gi
const STYLE_TAG_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
const CSS_DECLARATION_PATTERN = /([a-z-]+)\s*:\s*([^;}{]+)/gi
const ANCHOR_TAG_PATTERN = /<a\b([^>]*)>/gi
const IMAGE_TAG_PATTERN = /<img\b([^>]*)>/gi
const HEAD_OPEN_PATTERN = /<head\b[^>]*>/i
const HEAD_CLOSE_PATTERN = /<\/head>/i

const validateTags = (html: string): void => {
  const tagPattern = /<([a-z][a-z0-9-]*)\b/gi

  for (const match of html.matchAll(tagPattern)) {
    const tagName = match[1]?.toLowerCase()
    if (tagName) {
      const message = DISALLOWED_TAG_MESSAGES.get(tagName)
      if (message) {
        throw new Error(message)
      }
    }
  }
}

const validateAnchors = (html: string): void => {
  for (const match of html.matchAll(ANCHOR_TAG_PATTERN)) {
    const attributes = match[1] ?? ''
    if (!/\shref="/i.test(attributes)) {
      throw new Error('The <a> tag is missing an href attribute. Use <Link href="..."> or <Button href="..."> with a real destination URL.')
    }
  }
}

const validateImages = (html: string, warnings: Set<string>): void => {
  for (const match of html.matchAll(IMAGE_TAG_PATTERN)) {
    const attributes = match[1] ?? ''
    if (!/\salt="/i.test(attributes)) {
      warnings.add('The <img> tag is missing an alt attribute. Add alt text for meaningful images, or use alt="" for decorative images.')
    }
  }
}

const validateStylePlacement = (html: string): void => {
  const headOpen = html.match(HEAD_OPEN_PATTERN)
  const headClose = html.match(HEAD_CLOSE_PATTERN)

  for (const match of html.matchAll(STYLE_TAG_PATTERN)) {
    const styleIndex = match.index ?? -1

    if (!headOpen || !headClose || styleIndex < headOpen.index! || styleIndex > headClose.index!) {
      throw new Error(
        'The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling.'
      )
    }
  }
}

const collectCssWarnings = (cssText: string, warnings: Set<string>): void => {
  for (const [atRule, message] of WARNING_AT_RULES) {
    if (cssText.toLowerCase().includes(atRule)) {
      warnings.add(message)
    }
  }
}

const validateCssDeclarations = (cssText: string, warnings: Set<string>): void => {
  collectCssWarnings(cssText, warnings)

  for (const match of cssText.matchAll(CSS_DECLARATION_PATTERN)) {
    const property = match[1]?.toLowerCase()
    const value = match[2]?.trim().toLowerCase()

    if (!property || !value) {
      continue
    }

    const declarationKey = `${property}:${value}`
    const disallowedDeclarationMessage = DISALLOWED_CSS_DECLARATIONS.get(declarationKey)
    if (disallowedDeclarationMessage) {
      throw new Error(disallowedDeclarationMessage)
    }

    if (DISALLOWED_CSS_PROPERTIES.has(property)) {
      throw new Error(DISALLOWED_CSS_PROPERTY_MESSAGES.get(property) ?? `The CSS property '${property}' isn't supported in HTML email strict mode.`)
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

const validateStyleAttributes = (html: string, warnings: Set<string>): void => {
  for (const match of html.matchAll(STYLE_ATTRIBUTE_PATTERN)) {
    const cssText = match[1]
    if (cssText) {
      validateCssDeclarations(cssText, warnings)
    }
  }
}

const validateStyleTags = (html: string, warnings: Set<string>): void => {
  for (const match of html.matchAll(STYLE_TAG_PATTERN)) {
    const cssText = match[1]
    if (cssText) {
      validateCssDeclarations(cssText, warnings)
    }
  }
}

export const validateHtml = (html: string): string[] => {
  const warnings = new Set<string>()

  validateTags(html)
  validateStylePlacement(html)
  validateAnchors(html)
  validateImages(html, warnings)
  validateStyleAttributes(html, warnings)
  validateStyleTags(html, warnings)

  return Array.from(warnings)
}
