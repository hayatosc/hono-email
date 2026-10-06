import { HTMLRewriter } from 'htmlrewriter'

import { mergeStyleAttributes } from '../style'
import type { CssBuildArtifact } from './artifact'

export type InlineCssArtifactResult = {
  html: string
  headCss: string
  droppedClasses: string[]
}

export type InlineCssArtifactOptions = {
  onMissingClass?: (className: string) => void
  removeAttribute?: string | undefined
}

/** Collects unique class tokens in document order. */
export const collectCssClassesFromHtml = async (html: string): Promise<string[]> => {
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

/** Applies inline/head styles, reporting used unsupported classes to the caller. */
export const inlineCssArtifact = async (
  html: string,
  artifact: CssBuildArtifact,
  options: InlineCssArtifactOptions = {},
): Promise<InlineCssArtifactResult> => {
  const knownClasses = new Set(artifact.classes)
  const droppedClasses = new Set(artifact.droppedClasses)
  const removeAttribute = options.removeAttribute
  const responsiveCss = new Set<string>()
  const usedDroppedClasses = new Set<string>()

  let rewriter = new HTMLRewriter()

  if (removeAttribute) {
    rewriter = rewriter.on(`[${removeAttribute}]`, {
      element(el) {
        el.removeAttribute(removeAttribute)
      },
    })
  }

  const transformed = await rewriter
    .on('[class]', {
      element(el) {
        const tokens = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
        const mergedInlineStyle: Record<string, string> = {}
        const inlineDeclarations: Array<{
          property: string
          value: string
          sourceOrder: number
          tokenIndex: number
          declarationIndex: number
        }> = []
        const outputTokens: string[] = []
        let renamed = false

        for (const [tokenIndex, token] of tokens.entries()) {
          if (!knownClasses.has(token)) {
            outputTokens.push(token)
            options.onMissingClass?.(token)
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
            const orderByProperty = artifact.inlineStyleOrderByClass?.[token]
            for (const [declarationIndex, [property, value]] of Object.entries(
              inlineStyle,
            ).entries()) {
              inlineDeclarations.push({
                property,
                value,
                sourceOrder: orderByProperty?.[property] ?? Number.MAX_SAFE_INTEGER,
                tokenIndex,
                declarationIndex,
              })
            }
          }

          const mediaRule = artifact.headCssByClass[token]
          if (mediaRule) {
            responsiveCss.add(mediaRule)
          }
        }

        inlineDeclarations.sort(
          (left, right) =>
            left.sourceOrder - right.sourceOrder ||
            left.tokenIndex - right.tokenIndex ||
            left.declarationIndex - right.declarationIndex,
        )
        for (const { property, value } of inlineDeclarations) {
          delete mergedInlineStyle[property]
          mergedInlineStyle[property] = value
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
    droppedClasses: Array.from(usedDroppedClasses),
  }
}

export const wrapGeneratedHeadCss = (css: string): string =>
  css === '' ? '' : `<style data-hono-email-head="true">${css}</style>`
