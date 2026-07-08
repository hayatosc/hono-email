import { raw } from 'hono/html'
import type { PropsWithChildren } from 'hono/jsx'
import type { HtmlEscapedString } from 'hono/utils/html'

import { renderFontStyleTag, type FontProps } from '../font'
import {
  renderMarkdownHtml,
  type MarkdownCustomClassNames,
  type MarkdownCustomStyles,
  type MarkdownRenderOptions,
  type MarkdownStyleMode,
} from '../markdown'
import { renderFragmentToHtml } from '../render/html'
import {
  encodeTailwindWarnings,
  transformTailwindHtml,
  type TailwindBuildArtifact,
  wrapGeneratedHeadCss,
} from '../tailwind'

export type {
  FontProps,
  MarkdownCustomClassNames,
  MarkdownCustomStyles,
  MarkdownStyleMode,
  TailwindBuildArtifact,
}

export const TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE: string =
  '<Tailwind> requires a build artifact. Either:\n' +
  '  1. Use the bundler plugin (@hono-email/tailwind-plugin) — it injects the artifact automatically per email file.\n' +
  '  2. Pass it explicitly: <Tailwind artifact={buildTailwindArtifactFromCss({ css })}>'
export const TAILWIND_ARTIFACT_REQUIRED_TAG_NAME: string =
  'hono-email-internal-tailwind-artifact-required'

type TailwindProps = PropsWithChildren<{
  artifact?: TailwindBuildArtifact
}>

type MarkdownProps = MarkdownRenderOptions & {
  children: string
}

type ConditionalProps = PropsWithChildren<{
  mso?: boolean
  notMso?: boolean
}>

type ColorSchemeValue = 'dark' | 'light' | 'light dark'

type ColorSchemeProps = {
  colorScheme?: ColorSchemeValue
  supportedColorSchemes?: ColorSchemeValue
}

/**
 * Renders `@font-face` and fallback font-family CSS for use inside `<Head>`.
 *
 * @param props - Font declaration props.
 * @returns A `<style>` tag for the font declaration.
 *
 * @example
 * ```tsx
 * <Head>
 *   <Font
 *     fallbackFontFamily={['Arial', 'sans-serif']}
 *     fontFamily="Inter"
 *     webFont={{ url: 'https://example.com/inter.woff2', format: 'woff2' }}
 *   />
 * </Head>
 * ```
 */
export const Font = (props: FontProps): HtmlEscapedString | Promise<HtmlEscapedString> =>
  renderFontStyleTag(props)

/**
 * Applies a Tailwind build artifact to descendant class names.
 *
 * @param props - Tailwind wrapper props.
 * @param props.artifact - Build artifact injected by the plugin or passed explicitly.
 * @returns HTML with Tailwind classes converted to inline/head styles.
 *
 * @example
 * ```tsx
 * <Tailwind>
 *   <Body>
 *     <Text className="text-slate-900 px-4">Hello</Text>
 *   </Body>
 * </Tailwind>
 * ```
 */
export const Tailwind = async ({
  artifact,
  children,
}: TailwindProps): Promise<HtmlEscapedString> => {
  if (!artifact) {
    return raw(
      `<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME} hidden=""></${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}>`,
    )
  }

  const renderedChildren = await renderFragmentToHtml(<>{children}</>)
  const transformed = await transformTailwindHtml(renderedChildren, artifact, {
    ignoreMissingClass: (className) => className.startsWith('css-'),
  })
  return raw(
    `${encodeTailwindWarnings(transformed.warnings)}${wrapGeneratedHeadCss(transformed.headCss)}${transformed.html}`,
  )
}

/**
 * Converts Markdown into sanitized email-friendly HTML.
 *
 * @param props - Markdown render options and Markdown string children.
 * @param props.children - Markdown source.
 * @returns Rendered Markdown HTML.
 *
 * @example
 * ```tsx
 * <Markdown
 *   markdownCustomStyles={{ h1: { color: '#111827' } }}
 * >{`
 * # Welcome
 *
 * Thanks for joining.
 * `}</Markdown>
 * ```
 */
export const Markdown = async ({
  children,
  markdownContainerClassName,
  markdownContainerStyles,
  markdownCustomClassNames,
  markdownCustomStyles,
  markdownStyleMode,
  sanitize,
}: MarkdownProps): Promise<HtmlEscapedString> =>
  raw(
    await renderMarkdownHtml(children, {
      ...(markdownContainerClassName !== undefined ? { markdownContainerClassName } : {}),
      ...(markdownContainerStyles !== undefined ? { markdownContainerStyles } : {}),
      ...(markdownCustomClassNames !== undefined ? { markdownCustomClassNames } : {}),
      ...(markdownCustomStyles !== undefined ? { markdownCustomStyles } : {}),
      ...(markdownStyleMode !== undefined ? { markdownStyleMode } : {}),
      ...(sanitize !== undefined ? { sanitize } : {}),
    }),
  )

/**
 * Renders Outlook conditional comment branches.
 *
 * @param props - Conditional rendering props.
 * @param props.mso - Render content inside an Outlook-only conditional comment. Defaults to `true`.
 * @param props.notMso - Render content in a non-Outlook conditional comment.
 * @returns Conditional-comment wrapped HTML.
 *
 * @example
 * ```tsx
 * <Conditional mso>
 *   <Text>This appears in Outlook for Windows.</Text>
 * </Conditional>
 * ```
 */
export const Conditional = async ({
  children,
  mso,
  notMso,
}: ConditionalProps): Promise<HtmlEscapedString> => {
  const renderedChildren = await renderFragmentToHtml(<>{children}</>)

  if (notMso) {
    return raw(`<!--[if !mso]><!-->${renderedChildren}<!--<![endif]-->`)
  }

  if (mso === false) {
    return raw(renderedChildren)
  }

  return raw(`<!--[if mso]>${renderedChildren}<![endif]-->`)
}

/**
 * Declares supported light and dark color schemes for email clients.
 *
 * @param props - Color scheme props.
 * @param props.colorScheme - Declared color scheme. Defaults to `light dark`.
 * @param props.supportedColorSchemes - Supported schemes meta value. Defaults to `colorScheme`.
 * @returns Meta and style tags for color-scheme support.
 *
 * @example
 * ```tsx
 * <Head>
 *   <ColorScheme colorScheme="light dark" />
 * </Head>
 * ```
 */
export const ColorScheme = ({
  colorScheme = 'light dark',
  supportedColorSchemes = colorScheme,
}: ColorSchemeProps): HtmlEscapedString | Promise<HtmlEscapedString> => (
  <>
    <meta name="color-scheme" content={colorScheme} />
    <meta name="supported-color-schemes" content={supportedColorSchemes} />
    <style>{`:root { color-scheme: ${colorScheme}; supported-color-schemes: ${supportedColorSchemes}; }`}</style>
  </>
)
