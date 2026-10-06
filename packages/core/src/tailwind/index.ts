import {
  buildCssArtifact,
  type BuildCssArtifactOptions,
  type CssBuildArtifact,
} from '../css/artifact'
import { collectCssClassesFromHtml, inlineCssArtifact } from '../css/inline'
import { formatDroppedClassWarning } from '../css/warnings'
import { MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME } from '../markdown'
import { serializeStyleAttribute } from '../style'

export { wrapGeneratedHeadCss } from '../css/inline'
export {
  encodeCssWarnings as encodeTailwindWarnings,
  extractCssWarnings as extractTailwindWarnings,
} from '../css/warnings'

/**
 * Compiled Tailwind CSS data consumed by `<Tailwind>`.
 *
 * @property classes - Class tokens known to the artifact.
 * @property headCssByClass - Responsive, pseudo, or head-only CSS keyed by class token.
 * @property inlineStylesByClass - Inline declarations keyed by class token.
 * @property inlineStyleOrderByClass - CSS rule order for each inline declaration.
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
export type TailwindBuildArtifact = CssBuildArtifact

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
export type BuildTailwindArtifactFromCssOptions = BuildCssArtifactOptions

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
export const collectTailwindClassesFromHtml = async (html: string): Promise<string[]> =>
  collectCssClassesFromHtml(html)

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
export const buildTailwindArtifactFromCss = (
  options: BuildTailwindArtifactFromCssOptions,
): TailwindBuildArtifact => buildCssArtifact(options)

export const transformTailwindHtml = async (
  html: string,
  artifact: TailwindBuildArtifact,
  options: TransformTailwindHtmlOptions = {},
): Promise<TailwindRenderResult> => {
  const throwOnMissingClass = options.throwOnMissingClass ?? true
  const ignoreMissingClass = options.ignoreMissingClass
  const transformed = await inlineCssArtifact(html, artifact, {
    removeAttribute: options.preserveMarkdownTailwindParentRequiredAttribute
      ? undefined
      : MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME,
    onMissingClass(className) {
      if (ignoreMissingClass?.(className) || !throwOnMissingClass) {
        return
      }
      throw new Error(
        `Tailwind class '${className}' is missing from the build artifact. Rebuild the artifact before rendering with <Tailwind>.`,
      )
    },
  })

  return {
    html: transformed.html,
    headCss: transformed.headCss,
    warnings: transformed.droppedClasses.map(formatDroppedClassWarning),
  }
}

export const serializeInlineStyle = (style: Record<string, string>): string =>
  serializeStyleAttribute(style)
