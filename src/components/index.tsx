import type { FC, JSX, PropsWithChildren } from 'hono/jsx'
import { raw } from 'hono/html'

import { renderFontStyleTag, type FontProps } from '../font'
import { renderMarkdownHtml, type MarkdownCustomStyles, type MarkdownRenderOptions } from '../markdown'
import { renderFragmentToHtml } from '../render/html'
import { styleObjectFromUnknown } from '../style'
import { transformTailwindHtml, type TailwindBuildArtifact, wrapGeneratedHeadCss } from '../tailwind'

type ElementProps<Tag extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[Tag]

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

type MarginShorthand = number | string | undefined

type HeadingMarginProps = {
  m?: MarginShorthand
  mb?: MarginShorthand
  ml?: MarginShorthand
  mr?: MarginShorthand
  mt?: MarginShorthand
  mx?: MarginShorthand
  my?: MarginShorthand
}

type HeadingProps = PropsWithChildren<
  Omit<ElementProps<'h1'>, 'children'> & {
    as?: HeadingTag
  } & HeadingMarginProps
>

type LinkProps = PropsWithChildren<Omit<ElementProps<'a'>, 'children' | 'href'> & { href: string }>

type ImageProps = Omit<ElementProps<'img'>, 'src' | 'alt'> & { src: string; alt: string }

type TailwindProps = PropsWithChildren<{
  artifact?: TailwindBuildArtifact
}>

type MarkdownProps = MarkdownRenderOptions & {
  children: string
}

const PRESENTATION_TABLE_PROPS = {
  border: 0,
  cellPadding: '0',
  cellSpacing: '0',
  role: 'presentation',
} as const

export const TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE =
  '<Tailwind> requires a build artifact. Either:\n' +
  '  1. Use the bundler plugin (hono-email/vite or hono-email/unplugin) — it injects the artifact automatically per email file.\n' +
  '  2. Pass it explicitly: <Tailwind artifact={buildTailwindArtifactFromCss({ css })}>'
export const TAILWIND_ARTIFACT_REQUIRED_TAG_NAME = 'hono-email-internal-tailwind-artifact-required'

const BOX_DIRECTIONS = ['Top', 'Right', 'Bottom', 'Left'] as const

const isNumericString = (value: string): boolean => /^-?\d+(\.\d+)?$/.test(value.trim())

const toCssSpace = (value: MarginShorthand): string | undefined => {
  if (typeof value === 'number') {
    return `${value}px`
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') {
      return undefined
    }

    return isNumericString(trimmed) ? `${trimmed}px` : trimmed
  }

  return undefined
}

const expandBoxValues = (
  shorthand: string | number | undefined,
  overrides: Partial<Record<(typeof BOX_DIRECTIONS)[number], string | number | undefined>>
): Partial<Record<(typeof BOX_DIRECTIONS)[number], string>> => {
  const shorthandValue =
    typeof shorthand === 'number' ? `${shorthand}px` : typeof shorthand === 'string' ? shorthand.trim() : undefined
  const expanded: Partial<Record<(typeof BOX_DIRECTIONS)[number], string>> = {}

  if (shorthandValue) {
    const parts = shorthandValue.split(/\s+/)
    const [top, right = top, bottom = top, left = right] = parts
    expanded.Top = top
    expanded.Right = right
    expanded.Bottom = bottom
    expanded.Left = left
  }

  for (const direction of BOX_DIRECTIONS) {
    const override = overrides[direction]
    if (override !== undefined) {
      expanded[direction] = typeof override === 'number' ? `${override}px` : `${override}`.trim()
    }
  }

  return expanded
}

const parsePxValue = (value: string | undefined): number => {
  if (!value) {
    return 0
  }

  const trimmed = value.trim()
  if (isNumericString(trimmed)) {
    return Number(trimmed)
  }

  const pxMatch = trimmed.match(/^(-?\d+(\.\d+)?)px$/i)
  if (pxMatch) {
    return Number(pxMatch[1])
  }

  return 0
}

const pxToPt = (value: number): string => `${Math.round(value * 0.75)}px`

const computeFontWidthAndSpaceCount = (expectedWidth: number): readonly [number, number] => {
  if (expectedWidth === 0) {
    return [0, 0] as const
  }

  let spaceCount = 0
  const computeWidth = () => (spaceCount > 0 ? expectedWidth / spaceCount / 2 : Number.POSITIVE_INFINITY)

  while (computeWidth() > 5) {
    spaceCount += 1
  }

  return [computeWidth(), spaceCount] as const
}

const withMargin = ({ m, mx, my, mt, mr, mb, ml }: HeadingMarginProps): JSX.CSSProperties => {
  const styles: JSX.CSSProperties = {}
  const assign = (property: keyof JSX.CSSProperties, value: MarginShorthand) => {
    const space = toCssSpace(value)
    if (space !== undefined) {
      styles[property] = space
    }
  }

  assign('margin', m)
  assign('marginLeft', mx)
  assign('marginRight', mx)
  assign('marginTop', my)
  assign('marginBottom', my)
  assign('marginTop', mt)
  assign('marginRight', mr)
  assign('marginBottom', mb)
  assign('marginLeft', ml)

  return styles
}

export const Html: FC<PropsWithChildren<ElementProps<'html'>>> = (props) => <html {...props} />

export const Head: FC<PropsWithChildren<ElementProps<'head'>>> = (props) => <head {...props} />

export const Body: FC<PropsWithChildren<ElementProps<'body'>>> = (props) => <body {...props} />

export const Container: FC<PropsWithChildren<ElementProps<'table'>>> = ({ children, ...props }) => (
  <table {...PRESENTATION_TABLE_PROPS} width='100%' {...props}>
    <tbody>
      <tr>
        <td>{children}</td>
      </tr>
    </tbody>
  </table>
)

export const Section: FC<PropsWithChildren<ElementProps<'table'>>> = ({ children, ...props }) => (
  <table {...PRESENTATION_TABLE_PROPS} width='100%' {...props}>
    <tbody>
      <tr>{children}</tr>
    </tbody>
  </table>
)

export const Row: FC<PropsWithChildren<ElementProps<'tr'>>> = ({ children, ...props }) => (
  <tr {...props}>{children}</tr>
)

export const Column: FC<PropsWithChildren<ElementProps<'td'>>> = ({ children, ...props }) => (
  <td {...props}>{children}</td>
)

export const Text: FC<PropsWithChildren<ElementProps<'p'>>> = ({ style, ...props }) => {
  const styleObject = styleObjectFromUnknown(style) ?? {}
  const margins = expandBoxValues(styleObject.margin, {
    Bottom: styleObject.marginBottom,
    Left: styleObject.marginLeft,
    Right: styleObject.marginRight,
    Top: styleObject.marginTop,
  })

  return (
    <p
      {...props}
      style={{
        fontSize: '14px',
        lineHeight: '24px',
        ...styleObject,
        marginTop: margins.Top ?? '16px',
        ...(margins.Right ? { marginRight: margins.Right } : {}),
        marginBottom: margins.Bottom ?? '16px',
        ...(margins.Left ? { marginLeft: margins.Left } : {}),
      }}
    />
  )
}

export const Heading: FC<HeadingProps> = ({
  as = 'h1',
  children,
  m,
  mb,
  ml,
  mr,
  mt,
  mx,
  my,
  style,
  ...props
}) => {
  const Tag = as
  return (
    <Tag
      {...props}
      style={{
        ...withMargin({ m, mb, ml, mr, mt, mx, my }),
        ...styleObjectFromUnknown(style),
      }}
    >
      {children}
    </Tag>
  )
}

export const Button: FC<LinkProps> = ({ children, style, target = '_blank', ...props }) => {
  const styleObject = styleObjectFromUnknown(style) ?? {}
  const padding = expandBoxValues(styleObject.padding, {
    Bottom: styleObject.paddingBottom,
    Left: styleObject.paddingLeft,
    Right: styleObject.paddingRight,
    Top: styleObject.paddingTop,
  })

  const paddingTop = parsePxValue(padding.Top)
  const paddingRight = parsePxValue(padding.Right)
  const paddingBottom = parsePxValue(padding.Bottom)
  const paddingLeft = parsePxValue(padding.Left)
  const textRaise = pxToPt(paddingTop + paddingBottom)
  const innerTextRaise = pxToPt(paddingBottom)
  const [leftFontWidth, leftSpaceCount] = computeFontWidthAndSpaceCount(paddingLeft)
  const [rightFontWidth, rightSpaceCount] = computeFontWidthAndSpaceCount(paddingRight)

  return (
    <a
      {...props}
      style={{
        lineHeight: '100%',
        textDecoration: 'none',
        display: 'inline-block',
        maxWidth: '100%',
        msoPaddingAlt: '0px',
        ...styleObject,
        ...(padding.Top ? { paddingTop: padding.Top } : {}),
        ...(padding.Right ? { paddingRight: padding.Right } : {}),
        ...(padding.Bottom ? { paddingBottom: padding.Bottom } : {}),
        ...(padding.Left ? { paddingLeft: padding.Left } : {}),
      } as unknown as JSX.CSSProperties}
      target={target}
    >
      <span>
        {raw(
          `<!--[if mso]><i style="mso-font-width:${leftFontWidth * 100}%;mso-text-raise:${textRaise}" hidden>${'&#8202;'.repeat(leftSpaceCount)}</i><![endif]-->`
        )}
      </span>
      <span
        style={
          {
            maxWidth: '100%',
            display: 'inline-block',
            lineHeight: '120%',
            msoPaddingAlt: '0px',
            ...(paddingBottom > 0 ? { msoTextRaise: innerTextRaise } : {}),
          } as unknown as JSX.CSSProperties
        }
      >
        {children}
      </span>
      <span>
        {raw(
          `<!--[if mso]><i style="mso-font-width:${rightFontWidth * 100}%" hidden>${'&#8202;'.repeat(rightSpaceCount)}&#8203;</i><![endif]-->`
        )}
      </span>
    </a>
  )
}

export const Link: FC<LinkProps> = ({ target = '_blank', ...props }) => <a {...props} target={target} />

export const Img: FC<ImageProps> = (props) => <img {...props} />

export const Preview: FC<PropsWithChildren<ElementProps<'div'>>> = ({ children, style, ...props }) => (
  <div
    {...props}
    data-hono-email-preview='true'
    style={{
      display: 'none',
      overflow: 'hidden',
      maxHeight: '0px',
      maxWidth: '0px',
      opacity: '0',
      ...styleObjectFromUnknown(style),
    }}
  >
    {children}
  </div>
)

export const Hr: FC<ElementProps<'hr'>> = ({ style, ...props }) => (
  <hr
    {...props}
    style={{
      width: '100%',
      border: 'none',
      borderTop: '1px solid #eaeaea',
      ...styleObjectFromUnknown(style),
    }}
  />
)

export const Font = (props: FontProps) => renderFontStyleTag(props)

export const Tailwind = async ({ artifact, children }: TailwindProps) => {
  if (!artifact) {
    return raw(`<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME} hidden=""></${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}>`)
  }

  const renderedChildren = await renderFragmentToHtml(<>{children}</>)
  const transformed = await transformTailwindHtml(renderedChildren, artifact)
  return raw(`${wrapGeneratedHeadCss(transformed.headCss)}${transformed.html}`)
}

export const Markdown = async ({ children, markdownContainerStyles, markdownCustomStyles, sanitize }: MarkdownProps) =>
  raw(
    await renderMarkdownHtml(children, {
      markdownContainerStyles,
      markdownCustomStyles,
      sanitize,
    })
  )

export type { FontProps, MarkdownCustomStyles, TailwindBuildArtifact }
