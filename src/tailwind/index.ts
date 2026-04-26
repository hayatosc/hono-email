import * as csstree from 'css-tree'
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

export type TailwindBuildArtifact = {
  classes: string[]
  headCssByClass: Record<string, string>
  inlineStylesByClass: Record<string, Record<string, string>>
}

export type BuildTailwindArtifactFromCssOptions = {
  css: string
  classes?: string[]
}

type TailwindRenderResult = {
  html: string
  headCss: string
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

const extractSimpleClassToken = (selector: string): string | undefined => {
  const trimmed = selector.trim()
  if (!trimmed.startsWith('.')) {
    return undefined
  }

  let token = ''
  for (let index = 1; index < trimmed.length; index += 1) {
    const character = trimmed[index]
    if (!character) {
      break
    }

    if (character === '\\') {
      const escaped = trimmed[index + 1]
      if (!escaped) {
        return undefined
      }
      token += `${character}${escaped}`
      index += 1
      continue
    }

    if (
      character === ':' ||
      character === ' ' ||
      character === '>' ||
      character === '+' ||
      character === '~' ||
      character === '['
    ) {
      return undefined
    }

    token += character
  }

  return token === '' ? undefined : decodeEscapedClassToken(token)
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
  const discoveredClasses: string[] = []
  const discoveredClassSet = new Set<string>()

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

      const classToken = extractSimpleClassToken(csstree.generate(node.prelude))
      if (!classToken) {
        continue
      }

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
  }
}

const uniqueClasses = (classes: string[]): string[] =>
  Array.from(
    new Set(classes.map((className) => className.trim()).filter((className) => className !== '')),
  )

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
  const throwOnMissingClass = options.throwOnMissingClass ?? true
  const ignoreMissingClass = options.ignoreMissingClass
  const preserveMarkdownTailwindParentRequiredAttribute =
    options.preserveMarkdownTailwindParentRequiredAttribute ?? false
  const responsiveCss = new Set<string>()

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

        for (const token of tokens) {
          if (!knownClasses.has(token)) {
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

          const inlineStyle = artifact.inlineStylesByClass[token]
          if (inlineStyle) {
            Object.assign(mergedInlineStyle, inlineStyle)
          }

          const mediaRule = artifact.headCssByClass[token]
          if (mediaRule) {
            responsiveCss.add(mediaRule)
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
  }
}

export const wrapGeneratedHeadCss = (css: string): string =>
  css === '' ? '' : `<style data-hono-email-head="true">${css}</style>`

export const serializeInlineStyle = (style: Record<string, string>): string =>
  serializeStyleAttribute(style)
