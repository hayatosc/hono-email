/**
 * caniemail.com data mapping and support utilities.
 *
 * This module defines how caniemail feature slugs map to validation keys used
 * by `hono-email`. The mapping is consumed both by the runtime validator and
 * by the update script that regenerates `caniemail-data.ts`.
 */

export type CaniemailApiData = {
  api_version: string
  last_update_date: string
  data: CaniemailFeature[]
}

export type CaniemailFeature = {
  slug: string
  title: string
  category: 'css' | 'html' | 'image' | 'others'
  url: string
  stats: CaniemailStats
}

export type CaniemailStats = Record<string, Record<string, Record<string, string>>>

export type FeatureKind =
  | 'css-declaration'
  | 'css-property'
  | 'css-at-rule'
  | 'html-tag'
  | 'html-attribute'
  | 'image-format'

export type FeatureMapEntry = {
  key: string
  kind: FeatureKind
  slug: string
}

export type ValidationEntry = {
  message: string
  url: string
}

export type ValidationTables = {
  disallowedTags: Record<string, ValidationEntry>
  warningTags: Record<string, ValidationEntry>
  disallowedDeclarations: Record<string, ValidationEntry>
  warningDeclarations: Record<string, ValidationEntry>
  disallowedProperties: Record<string, ValidationEntry>
  warningProperties: Record<string, ValidationEntry>
  disallowedAtRules: Record<string, ValidationEntry>
  warningAtRules: Record<string, ValidationEntry>
  disallowedAttributes: Record<string, ValidationEntry>
  warningAttributes: Record<string, ValidationEntry>
  disallowedImageFormats: Record<string, ValidationEntry>
  warningImageFormats: Record<string, ValidationEntry>
}

export type EmailClient = 'outlook' | 'gmail' | 'apple-mail' | 'yahoo'

export type ClientStatus = 'y' | 'n' | 'a'

export type ClientDataEntry = { url: string } & Partial<Record<EmailClient, ClientStatus>>

export type CaniemailDataFile = {
  apiVersion: string
  lastUpdateDate: string
  contentHash: string
  tables: ValidationTables
  clientData: Record<string, ClientDataEntry>
}

// Representative platform used as the latest-version proxy for each client
export const EMAIL_CLIENT_PLATFORMS: Record<EmailClient, { client: string; platform: string }> = {
  outlook: { client: 'outlook', platform: 'windows' },
  gmail: { client: 'gmail', platform: 'desktop-webmail' },
  'apple-mail': { client: 'apple-mail', platform: 'macos' },
  yahoo: { client: 'yahoo', platform: 'desktop-webmail' },
}

export const EMAIL_CLIENT_NAMES: Record<EmailClient, string> = {
  outlook: 'Outlook',
  gmail: 'Gmail',
  'apple-mail': 'Apple Mail',
  yahoo: 'Yahoo Mail',
}

export const ALWAYS_BLOCKED_TAGS = new Set([
  'script',
  'iframe',
  'embed',
  'object',
  'applet',
  'form',
])

// satisfies ensures all entries are valid EmailClient values without widening to string[]
export const EMAIL_CLIENT_LIST = [
  'outlook',
  'gmail',
  'apple-mail',
  'yahoo',
] as const satisfies readonly EmailClient[]

const SUPPORT_THRESHOLD = 0.8
const WARNING_THRESHOLD = 0.5

export const classifyRatio = (ratio: number): 'supported' | 'warn' | 'unsupported' => {
  if (ratio >= SUPPORT_THRESHOLD) {
    return 'supported'
  }

  if (ratio >= WARNING_THRESHOLD) {
    return 'warn'
  }

  return 'unsupported'
}

export const computeSupportRatio = (stats: CaniemailStats): number => {
  let supported = 0
  let total = 0

  for (const platforms of Object.values(stats)) {
    for (const versions of Object.values(platforms)) {
      const keys = Object.keys(versions)
      if (keys.length === 0) {
        continue
      }

      const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      const latest = sortedKeys[sortedKeys.length - 1]
      if (latest === undefined) {
        continue
      }

      const value = versions[latest]
      if (value === undefined) {
        continue
      }

      const base = value.split('#')[0]?.trim().split(/\s+/)[0]?.toLowerCase()
      if (base === 'y' || base === 'a') {
        supported += 1
      }

      total += 1
    }
  }

  return total === 0 ? 0 : supported / total
}

/**
 * Maps validation keys to caniemail feature slugs.
 *
 * A single caniemail feature can back multiple validation keys (for example,
 * `css-border-inline-block` covers both `border-inline` and `border-block`).
 */
export const CANIEMAIL_FEATURE_MAP: FeatureMapEntry[] = [
  // CSS declarations (property:value pairs)
  { key: 'display:flex', kind: 'css-declaration', slug: 'css-display-flex' },
  { key: 'display:grid', kind: 'css-declaration', slug: 'css-display-grid' },
  { key: 'display:inline-flex', kind: 'css-declaration', slug: 'css-display-flex' },
  { key: 'display:inline-grid', kind: 'css-declaration', slug: 'css-display-grid' },
  { key: 'position:fixed', kind: 'css-declaration', slug: 'css-position' },
  { key: 'position:sticky', kind: 'css-declaration', slug: 'css-position' },

  // CSS properties
  { key: 'grid', kind: 'css-property', slug: 'css-grid-template' },
  { key: 'grid-area', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-auto-columns', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-auto-flow', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-auto-rows', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-column', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-column-end', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-column-start', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-row', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-row-end', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-row-start', kind: 'css-property', slug: 'css-display-grid' },
  { key: 'grid-template', kind: 'css-property', slug: 'css-grid-template' },
  { key: 'grid-template-areas', kind: 'css-property', slug: 'css-grid-template' },
  { key: 'grid-template-columns', kind: 'css-property', slug: 'css-grid-template' },
  { key: 'grid-template-rows', kind: 'css-property', slug: 'css-grid-template' },

  { key: 'margin-inline', kind: 'css-property', slug: 'css-margin-inline-block' },
  { key: 'margin-inline-start', kind: 'css-property', slug: 'css-margin-inline-start-end' },
  { key: 'margin-inline-end', kind: 'css-property', slug: 'css-margin-inline-start-end' },
  { key: 'margin-block', kind: 'css-property', slug: 'css-margin-inline-block' },
  { key: 'margin-block-start', kind: 'css-property', slug: 'css-margin-block-start-end' },
  { key: 'margin-block-end', kind: 'css-property', slug: 'css-margin-block-start-end' },

  { key: 'padding-inline', kind: 'css-property', slug: 'css-padding-inline-block' },
  { key: 'padding-inline-start', kind: 'css-property', slug: 'css-padding-inline-start-end' },
  { key: 'padding-inline-end', kind: 'css-property', slug: 'css-padding-inline-start-end' },
  { key: 'padding-block', kind: 'css-property', slug: 'css-padding-inline-block' },
  { key: 'padding-block-start', kind: 'css-property', slug: 'css-padding-block-start-end' },
  { key: 'padding-block-end', kind: 'css-property', slug: 'css-padding-block-start-end' },

  { key: 'border-inline', kind: 'css-property', slug: 'css-border-inline-block' },
  { key: 'border-inline-start', kind: 'css-property', slug: 'css-border-inline-block-individual' },
  { key: 'border-inline-end', kind: 'css-property', slug: 'css-border-inline-block-individual' },
  { key: 'border-block', kind: 'css-property', slug: 'css-border-inline-block' },
  { key: 'border-block-start', kind: 'css-property', slug: 'css-border-inline-block-individual' },
  { key: 'border-block-end', kind: 'css-property', slug: 'css-border-inline-block-individual' },

  { key: 'filter', kind: 'css-property', slug: 'css-filter' },
  { key: 'pointer-events', kind: 'css-property', slug: 'css-pointer-events' },
  { key: 'user-select', kind: 'css-property', slug: 'css-user-select' },
  { key: 'aspect-ratio', kind: 'css-property', slug: 'css-aspect-ratio' },
  { key: 'transform', kind: 'css-property', slug: 'css-transform' },
  { key: 'transition', kind: 'css-property', slug: 'css-transition' },
  { key: 'animation', kind: 'css-property', slug: 'css-animation' },
  { key: 'mask-image', kind: 'css-property', slug: 'css-mask-image' },
  { key: 'clip-path', kind: 'css-property', slug: 'css-clip-path' },
  { key: 'background-attachment', kind: 'css-property', slug: 'css-background-attachment' },
  { key: 'background-blend-mode', kind: 'css-property', slug: 'css-background-blend-mode' },
  { key: 'background-clip', kind: 'css-property', slug: 'css-background-clip' },
  { key: 'backdrop-filter', kind: 'css-property', slug: 'css-backdrop-filter' },
  { key: 'mix-blend-mode', kind: 'css-property', slug: 'css-mix-blend-mode' },
  { key: 'contain', kind: 'css-property', slug: 'css-contain' },
  { key: 'will-change', kind: 'css-property', slug: 'css-will-change' },

  { key: 'align-content', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'align-items', kind: 'css-property', slug: 'css-align-items' },
  { key: 'align-self', kind: 'css-property', slug: 'css-align-items' },
  { key: 'flex', kind: 'css-property', slug: 'css-display-flex' },
  { key: 'flex-basis', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'flex-direction', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'flex-grow', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'flex-shrink', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'flex-wrap', kind: 'css-property', slug: 'css-flex-wrap' },
  { key: 'justify-content', kind: 'css-property', slug: 'css-justify-content' },
  { key: 'order', kind: 'css-property', slug: 'css-flex-direction' },
  { key: 'position', kind: 'css-property', slug: 'css-position' },
  { key: 'object-fit', kind: 'css-property', slug: 'css-object-fit' },
  { key: 'object-position', kind: 'css-property', slug: 'css-object-position' },
  { key: 'background-image', kind: 'css-property', slug: 'css-background-image' },
  { key: 'box-shadow', kind: 'css-property', slug: 'css-box-shadow' },
  { key: 'z-index', kind: 'css-property', slug: 'css-z-index' },
  { key: 'opacity', kind: 'css-property', slug: 'css-opacity' },
  { key: 'border-radius', kind: 'css-property', slug: 'css-border-radius' },
  { key: 'overflow', kind: 'css-property', slug: 'css-overflow' },
  { key: 'text-shadow', kind: 'css-property', slug: 'css-text-shadow' },
  { key: 'gap', kind: 'css-property', slug: 'css-gap' },
  { key: 'float', kind: 'css-property', slug: 'css-float' },
  { key: 'clear', kind: 'css-property', slug: 'css-clear' },

  // CSS at-rules
  { key: '@media', kind: 'css-at-rule', slug: 'css-at-media' },
  { key: '@import', kind: 'css-at-rule', slug: 'css-at-import' },
  { key: '@font-face', kind: 'css-at-rule', slug: 'css-at-font-face' },
  { key: '@keyframes', kind: 'css-at-rule', slug: 'css-at-keyframes' },
  { key: '@supports', kind: 'css-at-rule', slug: 'css-at-supports' },

  // HTML tags
  { key: 'form', kind: 'html-tag', slug: 'html-form' },
  { key: 'input', kind: 'html-tag', slug: 'html-input-text' },
  { key: 'button', kind: 'html-tag', slug: 'html-button-submit' },
  { key: 'select', kind: 'html-tag', slug: 'html-select' },
  { key: 'option', kind: 'html-tag', slug: 'html-select' },
  { key: 'textarea', kind: 'html-tag', slug: 'html-textarea' },
  { key: 'video', kind: 'html-tag', slug: 'html-video' },
  { key: 'audio', kind: 'html-tag', slug: 'html-audio' },
  { key: 'object', kind: 'html-tag', slug: 'html-object' },
  { key: 'embed', kind: 'html-tag', slug: 'html-embed' },
  { key: 'iframe', kind: 'html-tag', slug: 'html-iframe' },
  { key: 'picture', kind: 'html-tag', slug: 'html-picture' },
  { key: 'source', kind: 'html-tag', slug: 'html-picture' },
  { key: 'canvas', kind: 'html-tag', slug: 'html-canvas' },
  { key: 'svg', kind: 'html-tag', slug: 'html-svg' },
  { key: 'math', kind: 'html-tag', slug: 'html-math' },
  { key: 'dialog', kind: 'html-tag', slug: 'html-dialog' },
  { key: 'template', kind: 'html-tag', slug: 'html-template' },
  { key: 'slot', kind: 'html-tag', slug: 'html-slot' },
  { key: 'script', kind: 'html-tag', slug: 'html-script' },
  { key: 'meter', kind: 'html-tag', slug: 'html-meter' },
  { key: 'progress', kind: 'html-tag', slug: 'html-progress' },
  { key: 'marquee', kind: 'html-tag', slug: 'html-marquee' },
  { key: 'bdi', kind: 'html-tag', slug: 'html-bdi' },

  // HTML attributes
  { key: 'srcset', kind: 'html-attribute', slug: 'html-srcset' },
  { key: 'sizes', kind: 'html-attribute', slug: 'html-srcset' },
  { key: 'loading', kind: 'html-attribute', slug: 'html-loading-attribute' },
  { key: 'target', kind: 'html-attribute', slug: 'html-target' },
  { key: 'popover', kind: 'html-attribute', slug: 'html-popover' },
  { key: 'hidden', kind: 'html-attribute', slug: 'html-hidden' },
  { key: 'required', kind: 'html-attribute', slug: 'html-required' },

  // Image formats
  { key: 'webp', kind: 'image-format', slug: 'image-webp' },
  { key: 'avif', kind: 'image-format', slug: 'image-avif' },
  { key: 'svg', kind: 'image-format', slug: 'image-svg' },
  { key: 'base64', kind: 'image-format', slug: 'image-base64' },
]
