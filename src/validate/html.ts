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
  ['position:fixed', "The CSS property 'position:fixed' isn't supported in HTML email strict mode."],
  ['position:sticky', "The CSS property 'position:sticky' isn't supported in HTML email strict mode."],
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
  'filter',
  'object-fit',
  'object-position',
  'pointer-events',
  'user-select',
  'aspect-ratio',
  'transform',
  'transition',
  'animation',
  'mask-image',
  'clip-path',
  'background-attachment',
  'background-blend-mode',
  'background-clip',
  'backdrop-filter',
  'mix-blend-mode',
  'contain',
  'will-change',
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
  ['filter', "The CSS property 'filter' isn't supported in HTML email strict mode."],
  ['object-fit', "The CSS property 'object-fit' isn't supported in HTML email strict mode."],
  ['object-position', "The CSS property 'object-position' isn't supported in HTML email strict mode."],
  ['pointer-events', "The CSS property 'pointer-events' isn't supported in HTML email strict mode."],
  ['user-select', "The CSS property 'user-select' isn't supported in HTML email strict mode."],
  ['aspect-ratio', "The CSS property 'aspect-ratio' isn't supported in HTML email strict mode."],
  ['transform', "The CSS property 'transform' isn't supported in HTML email strict mode."],
  ['transition', "The CSS property 'transition' isn't supported in HTML email strict mode."],
  ['animation', "The CSS property 'animation' isn't supported in HTML email strict mode."],
  ['mask-image', "The CSS property 'mask-image' isn't supported in HTML email strict mode."],
  ['clip-path', "The CSS property 'clip-path' isn't supported in HTML email strict mode."],
  ['background-attachment', "The CSS property 'background-attachment' isn't supported in HTML email strict mode."],
  ['background-blend-mode', "The CSS property 'background-blend-mode' isn't supported in HTML email strict mode."],
  ['background-clip', "The CSS property 'background-clip' isn't supported in HTML email strict mode."],
  ['backdrop-filter', "The CSS property 'backdrop-filter' isn't supported in HTML email strict mode."],
  ['mix-blend-mode', "The CSS property 'mix-blend-mode' isn't supported in HTML email strict mode."],
  ['contain', "The CSS property 'contain' isn't supported in HTML email strict mode."],
  ['will-change', "The CSS property 'will-change' isn't supported in HTML email strict mode."],
])

const WARNING_CSS_DECLARATIONS = new Map([
  ['display:flex', "The CSS property 'display:flex' may not be supported consistently across email clients. Prefer <Section>, <Row>, <Column>, or table-based layout for critical structure."],
])

const WARNING_CSS_PROPERTIES = new Map([
  ['position', "The CSS property 'position' may not be supported consistently across email clients. Prefer table structure, spacing, and natural document flow instead of positional offsets."],
  ['background-image', "The CSS property 'background-image' may not be supported consistently across email clients. Prefer <Img> or a solid background color for essential content."],
  ['box-shadow', "The CSS property 'box-shadow' may not be supported consistently across email clients, especially in Outlook and some Gmail versions."],
  ['z-index', "The CSS property 'z-index' has limited support in email clients as it depends on positioning."],
  ['opacity', "The CSS property 'opacity' may not be supported consistently across all email clients."],
  ['border-radius', "The CSS property 'border-radius' isn't supported in Outlook (Windows). It may be ignored or cause rendering issues."],
  ['overflow', "The CSS property 'overflow' has limited support and is often ignored in email clients like Gmail and Outlook."],
  ['text-shadow', "The CSS property 'text-shadow' isn't supported in Outlook and has inconsistent support in other clients."],
  ['gap', "The CSS property 'gap' isn't supported in many email clients. Use margin on child elements for consistent spacing in layouts."],
  ['float', "The CSS property 'float' has inconsistent support, particularly in Outlook (Windows). Prefer table-based layout instead."],
  ['clear', "The CSS property 'clear' has inconsistent support, particularly in Outlook (Windows)."],
])

const WARNING_AT_RULES = new Map([
  ['@media', "The CSS at-rule '@media' may not be supported consistently across email clients. Keep the base layout readable without media queries."],
  ['@import', "The CSS at-rule '@import' is poorly supported in email clients. Prefer linking to fonts via <Font> or using system fonts."],
])

const STYLE_ATTRIBUTE_PATTERN = /style="([^"]*)"/gi
const LINK_STYLESHEET_PATTERN = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi
const STYLE_TAG_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
const CSS_DECLARATION_PATTERN = /([a-z0-9-]+)\s*:\s*([^;}{]+)/gi
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
    const index = match.index ?? -1
    if (!headOpen || !headClose || index < headOpen.index! || index > headClose.index!) {
      throw new Error(
        'The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling.'
      )
    }
  }

  for (const match of html.matchAll(LINK_STYLESHEET_PATTERN)) {
    const index = match.index ?? -1
    if (!headOpen || !headClose || index < headOpen.index! || index > headClose.index!) {
      throw new Error(
        'The <link> tag must be placed inside <Head> in HTML email strict mode.'
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

    if (property.startsWith('--')) {
      throw new Error(`CSS variables ('${property}') aren't supported in HTML email strict mode.`)
    }

    if (value.includes('var(')) {
      throw new Error(`The 'var()' function isn't supported in HTML email strict mode. Use static values instead.`)
    }

    if (value.includes('calc(')) {
      warnings.add("The CSS function 'calc()' may not be supported consistently across email clients, especially in Outlook (Windows).")
    }

    if (/\b\d+(\.\d+)?(rem|em)\b/.test(value)) {
      warnings.add("The CSS units 'rem' and 'em' may not be supported consistently. Use 'px' for more reliable rendering across email clients.")
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
