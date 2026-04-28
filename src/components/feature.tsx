import { raw } from 'hono/html'
import type { PropsWithChildren } from 'hono/jsx'

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

export const TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE =
  '<Tailwind> requires a build artifact. Either:\n' +
  '  1. Use the bundler plugin (hono-email/plugin) — it injects the artifact automatically per email file.\n' +
  '  2. Pass it explicitly: <Tailwind artifact={buildTailwindArtifactFromCss({ css })}>'
export const TAILWIND_ARTIFACT_REQUIRED_TAG_NAME = 'hono-email-internal-tailwind-artifact-required'

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

export const Font = (props: FontProps) => renderFontStyleTag(props)

export const Tailwind = async ({ artifact, children }: TailwindProps) => {
  if (!artifact) {
    return raw(
      `<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME} hidden=""></${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}>`,
    )
  }

  const renderedChildren = await renderFragmentToHtml(<>{children}</>)
  const transformed = await transformTailwindHtml(renderedChildren, artifact, {
    ignoreMissingClass: (className) => className.startsWith('css-'),
  })
  return raw(`${wrapGeneratedHeadCss(transformed.headCss)}${transformed.html}`)
}

export const Markdown = async ({
  children,
  markdownContainerClassName,
  markdownContainerStyles,
  markdownCustomClassNames,
  markdownCustomStyles,
  markdownStyleMode,
  sanitize,
}: MarkdownProps) =>
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

export const Conditional = async ({ children, mso, notMso }: ConditionalProps) => {
  const renderedChildren = await renderFragmentToHtml(<>{children}</>)

  if (notMso) {
    return raw(`<!--[if !mso]><!-->${renderedChildren}<!--<![endif]-->`)
  }

  if (mso === false) {
    return raw(renderedChildren)
  }

  return raw(`<!--[if mso]>${renderedChildren}<![endif]-->`)
}

export const ColorScheme = ({
  colorScheme = 'light dark',
  supportedColorSchemes = colorScheme,
}: ColorSchemeProps) => (
  <>
    <meta name="color-scheme" content={colorScheme} />
    <meta name="supported-color-schemes" content={supportedColorSchemes} />
    <style>{`:root { color-scheme: ${colorScheme}; supported-color-schemes: ${supportedColorSchemes}; }`}</style>
  </>
)
