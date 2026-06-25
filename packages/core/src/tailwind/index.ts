import { HTMLRewriter } from 'htmlrewriter'

import { MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME } from '../markdown'
import { mergeStyleAttributes, serializeStyleAttribute } from '../style'
import {
  escapeSelector,
  normalizeCssValue,
  normalizeDeclarations,
  normalizeMediaQuery,
  resolveCssVariables,
} from './css'
import * as csstree from './csstree'

/**
 * Compiled Tailwind CSS data consumed by `<Tailwind>`.
 *
 * @property classes - Class tokens known to the artifact.
 * @property headCssByClass - Responsive, pseudo, or head-only CSS keyed by class token.
 * @property inlineStylesByClass - Inline declarations keyed by class token.
 * @property renamedClasses - Email-safe class tokens keyed by original token, for pseudo-class variants.
 * @property droppedClasses - Class tokens dropped because their selector is unsupported (combinator/pseudo-element).
 *
 * @example
 * ```ts
 * const artifact: TailwindBuildArtifact = buildTailwindArtifactFromCss({
 *   css: '.text-brand { color: #111827; }',
 * })
 * ```
 */
export type TailwindBuildArtifact = {
  classes: string[]
  headCssByClass: Record<string, string>
  inlineStylesByClass: Record<string, Record<string, string>>
  renamedClasses: Record<string, string>
  droppedClasses: string[]
}

/**
 * CSS input used to build a Tailwind artifact.
 *
 * @property css - CSS text to parse.
 * @property classes - Optional explicit class list. When omitted, classes are discovered from CSS.
 *
 * @example
 * ```ts
 * buildTailwindArtifactFromCss({
 *   css: '.px-4 { padding-left: 1rem; padding-right: 1rem; }',
 * })
 * ```
 */
export type BuildTailwindArtifactFromCssOptions = {
  css: string
  classes?: string[]
}

type TailwindRenderResult = {
  html: string
  headCss: string
  warnings: string[]
}

export type TransformTailwindHtmlOptions = {
  throwOnMissingClass?: boolean
  ignoreMissingClass?: (className: string) => boolean
  preserveMarkdownTailwindParentRequiredAttribute?: boolean
}

const childNodes = (node: csstree.Atrule | csstree.Rule): csstree.CssNode[] =>
  node.block ? [...node.block.children] : []

const getParams = (node: csstree.Atrule): string =>
  node.prelude ? csstree.generate(node.prelude) : ''

const decodeEscapedClassToken = (value: string): string => value.replace(/\\(.)/g, '$1')

const CLASS_TOKEN_TERMINATORS = new Set([':', ' ', '>', '+', '~', '[', ',', '.'])
const PSEUDO_SUFFIX_PATTERN = /^(?::[a-zA-Z][a-zA-Z-]*(?:\([^)]*\))?)+$/

const readClassToken = (
  selector: string,
  start: number,
): { token: string; end: number } | undefined => {
  let token = ''
  let index = start + 1
  for (; index < selector.length; index += 1) {
    const character = selector[index]
    if (!character) {
      break
    }

    if (character === '\\') {
      const escaped = selector[index + 1]
      if (!escaped) {
        return undefined
      }
      token += `${character}${escaped}`
      index += 1
      continue
    }

    if (CLASS_TOKEN_TERMINATORS.has(character)) {
      break
    }

    token += character
  }

  return token === '' ? undefined : { token: decodeEscapedClassToken(token), end: index }
}

const extractLastClassToken = (selector: string): string | undefined => {
  let last: string | undefined
  for (let index = 0; index < selector.length; index += 1) {
    if (selector[index] !== '.' || selector[index - 1] === '\\') {
      continue
    }
    const read = readClassToken(selector, index)
    if (read) {
      last = read.token
      index = read.end - 1
    }
  }
  return last
}

type ParsedSelector =
  | { kind: 'simple'; token: string }
  | { kind: 'pseudo'; token: string; pseudo: string }
  | { kind: 'unsupported'; token: string | undefined }

const parseSelector = (selector: string): ParsedSelector => {
  const trimmed = selector.trim()
  if (!trimmed.startsWith('.')) {
    return { kind: 'unsupported', token: extractLastClassToken(trimmed) }
  }

  const read = readClassToken(trimmed, 0)
  if (!read) {
    return { kind: 'unsupported', token: extractLastClassToken(trimmed) }
  }

  const rest = trimmed.slice(read.end)
  if (rest === '') {
    return { kind: 'simple', token: read.token }
  }

  if (PSEUDO_SUFFIX_PATTERN.test(rest)) {
    return { kind: 'pseudo', token: read.token, pseudo: rest }
  }

  return { kind: 'unsupported', token: extractLastClassToken(trimmed) }
}

const renameVariantToken = (token: string): string => token.replaceAll(':', '-')

const droppedClassWarning = (classToken: string): string =>
  `Tailwind class '${classToken}' uses an unsupported selector (combinator or pseudo-element) and was dropped.`

const TAILWIND_WARNING_COMMENT_PREFIX = 'hono-email-tw-warning:'
const TAILWIND_WARNING_COMMENT_PATTERN = /<!--hono-email-tw-warning:([\s\S]*?)-->/g

/**
 * Encodes Tailwind render warnings as HTML comment markers.
 *
 * Markers travel with the rendered fragment until `render()` extracts them, so
 * warnings raised inside the `<Tailwind>` component reach the render pipeline.
 *
 * @param warnings - Warning messages to encode.
 * @returns Concatenated comment markers, or an empty string.
 */
export const encodeTailwindWarnings = (warnings: string[]): string =>
  warnings
    .map((warning) => `<!--${TAILWIND_WARNING_COMMENT_PREFIX}${encodeURIComponent(warning)}-->`)
    .join('')

/**
 * Extracts and removes Tailwind warning markers from HTML.
 *
 * @param html - HTML that may contain warning markers.
 * @returns The HTML without markers and the decoded warnings.
 */
export const extractTailwindWarnings = (html: string): { html: string; warnings: string[] } => {
  const warnings: string[] = []
  const stripped = html.replace(TAILWIND_WARNING_COMMENT_PATTERN, (_match, encoded: string) => {
    warnings.push(decodeURIComponent(encoded))
    return ''
  })
  return { html: stripped, warnings }
}

const extractDeclarationsFromNodes = (nodes: csstree.CssNode[]): Record<string, string> => {
  const declarations: Record<string, string> = {}

  for (const node of nodes) {
    if (node.type === 'Declaration') {
      declarations[node.property] = csstree.generate(node.value)
    }
  }

  return declarations
}

const serializeDeclarations = (declarations: Record<string, string>, important: boolean): string =>
  Object.entries(declarations)
    .map(([property, value]) => `${property}:${value}${important ? ' !important' : ''}`)
    .join(';')

const mergeStylesByClass = (
  target: Record<string, Record<string, string>>,
  classToken: string,
  declarations: Record<string, string>,
): void => {
  target[classToken] = {
    ...target[classToken],
    ...declarations,
  }
}

const appendMediaRuleByClass = (
  target: Record<string, string>,
  classToken: string,
  mediaQuery: string,
  declarations: Record<string, string>,
): void => {
  const mediaRule = `@media ${mediaQuery}{.${escapeSelector(classToken)}{${serializeDeclarations(declarations, true)}}}`
  target[classToken] = `${target[classToken] ?? ''}${mediaRule}`
}

const appendPseudoRuleByClass = (
  target: Record<string, string>,
  classToken: string,
  renamedToken: string,
  pseudo: string,
  declarations: Record<string, string>,
): void => {
  const pseudoRule = `.${escapeSelector(renamedToken)}${pseudo}{${serializeDeclarations(declarations, true)}}`
  target[classToken] = `${target[classToken] ?? ''}${pseudoRule}`
}

const collectCssVariables = (nodes: csstree.CssNode[]): Record<string, string> => {
  const cssVariables: Record<string, string> = {}

  const collect = (currentNodes: csstree.CssNode[], inThemeLayer: boolean): void => {
    for (const node of currentNodes) {
      if (node.type === 'Declaration' && inThemeLayer && node.property.startsWith('--')) {
        cssVariables[node.property] = normalizeCssValue(csstree.generate(node.value))
        continue
      }

      if (node.type === 'Atrule') {
        if (node.name.toLowerCase() === 'property' && node.prelude !== null) {
          const propertyName = getParams(node).trim()
          if (propertyName.startsWith('--')) {
            const initialValueDecl = childNodes(node).find(
              (child): child is csstree.Declaration =>
                child.type === 'Declaration' && child.property.toLowerCase() === 'initial-value',
            )
            if (initialValueDecl) {
              cssVariables[propertyName] = normalizeCssValue(
                csstree.generate(initialValueDecl.value),
              )
            }
          }
        }

        const isThemeLayer =
          inThemeLayer ||
          (node.name.toLowerCase() === 'layer' &&
            getParams(node)
              .split(',')
              .map((p) => p.trim())
              .includes('theme'))

        collect(childNodes(node), isThemeLayer)
        continue
      }

      if (node.type === 'Rule') {
        const selector = node.prelude ? csstree.generate(node.prelude).trim() : ''
        if (
          selector === ':root' ||
          selector.startsWith(':root,') ||
          selector.startsWith(':root ')
        ) {
          for (const child of childNodes(node)) {
            if (child.type === 'Declaration' && child.property.startsWith('--')) {
              cssVariables[child.property] = normalizeCssValue(csstree.generate(child.value))
            }
          }
        }
        collect(childNodes(node), inThemeLayer)
      }
    }
  }

  collect(nodes, false)
  return cssVariables
}

function assertStyleSheet(node: csstree.CssNode): asserts node is csstree.StyleSheet {
  if (node.type !== 'StyleSheet') {
    throw new TypeError(`css-tree: expected StyleSheet, got ${node.type}`)
  }
}

const buildArtifactFromCss = (cssText: string, classes?: string[]): TailwindBuildArtifact => {
  const parsed = csstree.parse(cssText)
  assertStyleSheet(parsed)
  const rootNodes = [...parsed.children]
  const cssVariables = collectCssVariables(rootNodes)
  const inlineStylesByClass: Record<string, Record<string, string>> = {}
  const headCssByClass: Record<string, string> = {}
  const renamedClasses: Record<string, string> = {}
  const discoveredClasses: string[] = []
  const discoveredClassSet = new Set<string>()
  const droppedClassSet = new Set<string>()

  const registerClass = (classToken: string): void => {
    if (!discoveredClassSet.has(classToken)) {
      discoveredClassSet.add(classToken)
      discoveredClasses.push(classToken)
    }
  }

  const processNodes = (nodes: csstree.CssNode[], activeMediaQuery?: string): void => {
    for (const node of nodes) {
      if (node.type === 'Atrule') {
        if (node.name.toLowerCase() === 'media') {
          processNodes(childNodes(node), normalizeMediaQuery(getParams(node)))
        } else {
          processNodes(childNodes(node), activeMediaQuery)
        }
        continue
      }

      if (node.type !== 'Rule') {
        continue
      }

      const selector = parseSelector(csstree.generate(node.prelude))
      if (selector.kind === 'unsupported') {
        if (selector.token) {
          registerClass(selector.token)
          droppedClassSet.add(selector.token)
        }
        continue
      }

      const classToken = selector.token
      registerClass(classToken)

      const directDeclarations: Record<string, string> = {}
      for (const child of childNodes(node)) {
        if (child.type === 'Declaration') {
          directDeclarations[child.property] = csstree.generate(child.value)
          continue
        }

        if (child.type === 'Atrule' && child.name.toLowerCase() === 'media') {
          const nestedMediaQuery = normalizeMediaQuery(getParams(child))
          const nestedDeclarations = normalizeDeclarations(
            extractDeclarationsFromNodes(childNodes(child)),
            cssVariables,
          )
          if (Object.keys(nestedDeclarations).length > 0) {
            appendMediaRuleByClass(headCssByClass, classToken, nestedMediaQuery, nestedDeclarations)
          }
        }
      }

      const normalizedDirectDeclarations = normalizeDeclarations(directDeclarations, cssVariables)
      if (Object.keys(normalizedDirectDeclarations).length === 0) {
        continue
      }

      if (selector.kind === 'pseudo') {
        const renamedToken = renameVariantToken(classToken)
        renamedClasses[classToken] = renamedToken
        appendPseudoRuleByClass(
          headCssByClass,
          classToken,
          renamedToken,
          selector.pseudo,
          normalizedDirectDeclarations,
        )
        continue
      }

      if (activeMediaQuery) {
        appendMediaRuleByClass(
          headCssByClass,
          classToken,
          activeMediaQuery,
          normalizedDirectDeclarations,
        )
      } else {
        mergeStylesByClass(inlineStylesByClass, classToken, normalizedDirectDeclarations)
      }
    }
  }

  processNodes(rootNodes)

  for (const classToken of Object.keys(headCssByClass)) {
    const existingCss = headCssByClass[classToken]
    if (existingCss?.includes('var(')) {
      headCssByClass[classToken] = resolveCssVariables(existingCss, cssVariables)
    }
  }

  return {
    classes: classes ?? discoveredClasses,
    headCssByClass,
    inlineStylesByClass,
    renamedClasses,
    droppedClasses: Array.from(droppedClassSet),
  }
}

const uniqueClasses = (classes: string[]): string[] =>
  Array.from(
    new Set(classes.map((className) => className.trim()).filter((className) => className !== '')),
  )

/**
 * Collects class tokens from an HTML string.
 *
 * @param html - HTML to scan.
 * @returns Unique class tokens in document order.
 *
 * @example
 * ```ts
 * const classes = await collectTailwindClassesFromHtml(
 *   '<p class="text-brand px-4">Hello</p>',
 * )
 * ```
 */
export const collectTailwindClassesFromHtml = async (html: string): Promise<string[]> => {
  const classTokens = new Set<string>()

  await new HTMLRewriter()
    .on('[class]', {
      element(el) {
        for (const token of (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)) {
          classTokens.add(token)
        }
      },
    })
    .transform(new Response(html))
    .text()

  return Array.from(classTokens)
}

/**
 * Builds a Tailwind artifact from CSS for explicit `<Tailwind artifact={...}>` usage.
 *
 * @param options - CSS and optional class list.
 * @returns Tailwind build artifact consumed by `<Tailwind>`.
 *
 * @example
 * ```ts
 * const artifact = buildTailwindArtifactFromCss({
 *   css: '.text-brand { color: #111827; }',
 * })
 * ```
 */
export const buildTailwindArtifactFromCss = ({
  classes,
  css,
}: BuildTailwindArtifactFromCssOptions): TailwindBuildArtifact => {
  const normalizedClasses = classes ? uniqueClasses(classes) : undefined
  return buildArtifactFromCss(css, normalizedClasses)
}

export const transformTailwindHtml = async (
  html: string,
  artifact: TailwindBuildArtifact,
  options: TransformTailwindHtmlOptions = {},
): Promise<TailwindRenderResult> => {
  const knownClasses = new Set(artifact.classes)
  const droppedClasses = new Set(artifact.droppedClasses)
  const throwOnMissingClass = options.throwOnMissingClass ?? true
  const ignoreMissingClass = options.ignoreMissingClass
  const preserveMarkdownTailwindParentRequiredAttribute =
    options.preserveMarkdownTailwindParentRequiredAttribute ?? false
  const responsiveCss = new Set<string>()
  const usedDroppedClasses = new Set<string>()

  let rewriter = new HTMLRewriter()

  if (!preserveMarkdownTailwindParentRequiredAttribute) {
    rewriter = rewriter.on(`[${MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME}]`, {
      element(el) {
        el.removeAttribute(MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME)
      },
    })
  }

  const transformed = await rewriter
    .on('[class]', {
      element(el) {
        const tokens = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
        const mergedInlineStyle: Record<string, string> = {}
        const outputTokens: string[] = []
        let renamed = false

        for (const token of tokens) {
          if (!knownClasses.has(token)) {
            outputTokens.push(token)
            if (ignoreMissingClass?.(token)) {
              continue
            }
            if (throwOnMissingClass) {
              throw new Error(
                `Tailwind class '${token}' is missing from the build artifact. Rebuild the artifact before rendering with <Tailwind>.`,
              )
            }
            continue
          }

          if (droppedClasses.has(token)) {
            usedDroppedClasses.add(token)
            renamed = true
            continue
          }

          const renamedToken = artifact.renamedClasses[token]
          if (renamedToken) {
            outputTokens.push(renamedToken)
            renamed = true
          } else {
            outputTokens.push(token)
          }

          const inlineStyle = artifact.inlineStylesByClass[token]
          if (inlineStyle) {
            Object.assign(mergedInlineStyle, inlineStyle)
          }

          const mediaRule = artifact.headCssByClass[token]
          if (mediaRule) {
            responsiveCss.add(mediaRule)
          }
        }

        if (renamed) {
          if (outputTokens.length > 0) {
            el.setAttribute('class', outputTokens.join(' '))
          } else {
            el.removeAttribute('class')
          }
        }

        if (Object.keys(mergedInlineStyle).length > 0) {
          el.setAttribute(
            'style',
            mergeStyleAttributes(el.getAttribute('style') ?? undefined, mergedInlineStyle),
          )
        }
      },
    })
    .transform(new Response(html))
    .text()

  return {
    html: transformed,
    headCss: Array.from(responsiveCss).join(''),
    warnings: Array.from(usedDroppedClasses, droppedClassWarning),
  }
}

export const wrapGeneratedHeadCss = (css: string): string =>
  css === '' ? '' : `<style data-hono-email-head="true">${css}</style>`

export const serializeInlineStyle = (style: Record<string, string>): string =>
  serializeStyleAttribute(style)
