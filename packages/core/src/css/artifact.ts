import * as csstree from './csstree'
import {
  escapeSelector,
  normalizeCssValue,
  normalizeDeclarations,
  normalizeMediaQuery,
  resolveCssVariables,
} from './normalize'

/** Class-indexed inline and head styles, with CSS source order and selector metadata. */
export type CssBuildArtifact = {
  classes: string[]
  headCssByClass: Record<string, string>
  inlineStylesByClass: Record<string, Record<string, string>>
  inlineStyleOrderByClass?: Record<string, Record<string, number>>
  renamedClasses: Record<string, string>
  droppedClasses: string[]
}

/** Optional classes override discovery; CSS rules are still processed in full. */
export type BuildCssArtifactOptions = {
  css: string
  classes?: string[]
}

const uniqueClasses = (classes: string[]): string[] =>
  Array.from(
    new Set(classes.map((className) => className.trim()).filter((className) => className !== '')),
  )

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

const extractClassTokens = (selector: string): string[] => {
  const tokens: string[] = []
  for (let index = 0; index < selector.length; index += 1) {
    if (selector[index] !== '.' || selector[index - 1] === '\\') {
      continue
    }
    const read = readClassToken(selector, index)
    if (read && !tokens.includes(read.token)) {
      tokens.push(read.token)
      index = read.end - 1
    }
  }
  return tokens
}

type ParsedSelector =
  | { kind: 'simple'; token: string }
  | { kind: 'pseudo'; token: string; pseudo: string }
  | { kind: 'unsupported'; token: string | undefined; tokens: string[] }

const unsupportedSelector = (selector: string): ParsedSelector => {
  const tokens = extractClassTokens(selector)
  return { kind: 'unsupported', token: tokens.at(-1), tokens }
}

const parseSelector = (selector: string): ParsedSelector => {
  const trimmed = selector.trim()
  if (!trimmed.startsWith('.')) {
    return unsupportedSelector(trimmed)
  }

  const read = readClassToken(trimmed, 0)
  if (!read) {
    return unsupportedSelector(trimmed)
  }

  const rest = trimmed.slice(read.end)
  if (rest === '') {
    return { kind: 'simple', token: read.token }
  }

  if (PSEUDO_SUFFIX_PATTERN.test(rest)) {
    return { kind: 'pseudo', token: read.token, pseudo: rest }
  }

  return unsupportedSelector(trimmed)
}

const renameVariantToken = (token: string): string => token.replaceAll(':', '-')

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
  orderTarget: Record<string, Record<string, number>>,
  classToken: string,
  declarations: Record<string, string>,
  ruleOrder: number,
): void => {
  target[classToken] = {
    ...target[classToken],
    ...declarations,
  }
  const orderByProperty = orderTarget[classToken] ?? {}
  for (const property of Object.keys(declarations)) {
    orderByProperty[property] = ruleOrder
  }
  orderTarget[classToken] = orderByProperty
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

/** Builds a reusable email CSS artifact without rendering HTML or compiling Tailwind. */
export const buildCssArtifact = ({ css, classes }: BuildCssArtifactOptions): CssBuildArtifact => {
  const normalizedClasses = classes ? uniqueClasses(classes) : undefined
  const parsed = csstree.parse(css)
  assertStyleSheet(parsed)
  const rootNodes = [...parsed.children]
  const cssVariables = collectCssVariables(rootNodes)
  const inlineStylesByClass: Record<string, Record<string, string>> = {}
  const inlineStyleOrderByClass: Record<string, Record<string, number>> = {}
  const headCssByClass: Record<string, string> = {}
  const renamedClasses: Record<string, string> = {}
  const discoveredClasses: string[] = []
  const discoveredClassSet = new Set<string>()
  const droppedClassSet = new Set<string>()
  let ruleOrder = 0

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

      const currentRuleOrder = ruleOrder
      ruleOrder += 1
      const selector = parseSelector(csstree.generate(node.prelude))
      if (selector.kind === 'unsupported') {
        for (const classToken of selector.tokens) {
          registerClass(classToken)
        }
        if (selector.token) {
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
        mergeStylesByClass(
          inlineStylesByClass,
          inlineStyleOrderByClass,
          classToken,
          normalizedDirectDeclarations,
          currentRuleOrder,
        )
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
    classes: normalizedClasses ?? discoveredClasses,
    headCssByClass,
    inlineStylesByClass,
    inlineStyleOrderByClass,
    renamedClasses,
    droppedClasses: Array.from(droppedClassSet),
  }
}
