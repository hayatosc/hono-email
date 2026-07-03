import { raw } from 'hono/html'
import type { Child, FC, JSX, PropsWithChildren } from 'hono/jsx'

import { styleObjectFromUnknown } from '../style'

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
type CodeInlineProps = PropsWithChildren<ElementProps<'code'>>
type CodeBlockProps = PropsWithChildren<ElementProps<'pre'>>
type ListProps = PropsWithChildren<
  Omit<ElementProps<'ul'>, 'children'> & {
    marker?: JSX.CSSProperties['listStyleType']
    ordered?: boolean
  }
>
type ListItemProps = PropsWithChildren<ElementProps<'li'>>

type OutlookCssProperties = JSX.CSSProperties & {
  msoPaddingAlt?: string
  msoTextRaise?: string
}

const BOX_DIRECTIONS = ['Top', 'Right', 'Bottom', 'Left'] as const

const PREVIEW_MAX_LENGTH = 200
const PREVIEW_WHITESPACE = '\u00a0\u200c\u200b\u200d\u200e\u200f\ufeff'

const previewChildrenLength = (children: Child | undefined): number => {
  if (typeof children === 'string') {
    return children.length
  }

  if (Array.isArray(children)) {
    return children.reduce<number>((total, child) => total + previewChildrenLength(child), 0)
  }

  if (children !== null && typeof children === 'object' && 'children' in children) {
    return previewChildrenLength((children as { children?: Child | Child[] }).children)
  }

  return 0
}

const buildPreviewPadding = (children: Child | undefined): string => {
  const remaining = PREVIEW_MAX_LENGTH - previewChildrenLength(children)
  return remaining > 0 ? PREVIEW_WHITESPACE.repeat(remaining) : ''
}

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
  overrides: Partial<Record<(typeof BOX_DIRECTIONS)[number], string | number | undefined>>,
): Partial<Record<(typeof BOX_DIRECTIONS)[number], string>> => {
  const shorthandValue =
    typeof shorthand === 'number'
      ? `${shorthand}px`
      : typeof shorthand === 'string'
        ? shorthand.trim()
        : undefined
  const expanded: Partial<Record<(typeof BOX_DIRECTIONS)[number], string>> = {}

  if (shorthandValue) {
    const parts = shorthandValue.split(/\s+/)
    const [top, right, bottom, left] = parts
    if (top !== undefined) {
      expanded.Top = top
      expanded.Right = right ?? top
      expanded.Bottom = bottom ?? top
      expanded.Left = left ?? right ?? top
    }
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
  const computeWidth = () =>
    spaceCount > 0 ? expectedWidth / spaceCount / 2 : Number.POSITIVE_INFINITY

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

/**
 * Paragraph text with email-friendly font size, line height, and vertical margins.
 *
 * @param props - Standard `<p>` attributes and children.
 * @returns A styled paragraph.
 *
 * @example
 * ```tsx
 * <Text style={{ color: '#374151' }}>
 *   Thanks for signing up.
 * </Text>
 * ```
 */
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

/**
 * Heading element with optional semantic level and margin shorthands.
 *
 * @param props - Heading props.
 * @param props.as - Heading tag to render. Defaults to `h1`.
 * @param props.m - Margin shorthand.
 * @param props.mx - Horizontal margin shorthand.
 * @param props.my - Vertical margin shorthand.
 * @param props.mt - Top margin.
 * @param props.mr - Right margin.
 * @param props.mb - Bottom margin.
 * @param props.ml - Left margin.
 * @returns A heading element.
 *
 * @example
 * ```tsx
 * <Heading as="h2" mb={12}>
 *   Account summary
 * </Heading>
 * ```
 */
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

export type ButtonProps = LinkProps

/**
 * Link rendered with button-friendly defaults and Outlook padding support.
 *
 * @param props - Button link props.
 * @param props.href - Destination URL.
 * @param props.target - Link target. Defaults to `_blank`.
 * @returns An anchor styled as a button.
 *
 * @example
 * ```tsx
 * <LinkButton
 *   href="https://example.com/start"
 *   style={{ backgroundColor: '#111827', color: '#ffffff', padding: '12px 16px' }}
 * >
 *   Get started
 * </LinkButton>
 * ```
 */
export const LinkButton: FC<ButtonProps> = ({ children, style, target = '_blank', ...props }) => {
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
  const buttonStyle: OutlookCssProperties = {
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
  }
  const innerTextStyle: OutlookCssProperties = {
    maxWidth: '100%',
    display: 'inline-block',
    lineHeight: '120%',
    msoPaddingAlt: '0px',
    ...(paddingBottom > 0 ? { msoTextRaise: innerTextRaise } : {}),
  }

  return (
    <a {...props} style={buttonStyle} target={target}>
      <span>
        {raw(
          `<!--[if mso]><i style="mso-font-width:${leftFontWidth * 100}%;mso-text-raise:${textRaise}" hidden>${'&#8202;'.repeat(leftSpaceCount)}</i><![endif]-->`,
        )}
      </span>
      <span style={innerTextStyle}>{children}</span>
      <span>
        {raw(
          `<!--[if mso]><i style="mso-font-width:${rightFontWidth * 100}%" hidden>${'&#8202;'.repeat(rightSpaceCount)}&#8203;</i><![endif]-->`,
        )}
      </span>
    </a>
  )
}

/**
 * Alias for {@link LinkButton}.
 *
 * @deprecated Use `LinkButton` instead. `Button` renders an `<a>` element, which
 *   is confusing for a component named `Button`.
 */
export const Button = LinkButton

/**
 * Anchor element that requires `href` and defaults to `target="_blank"`.
 *
 * @param props - Link props.
 * @param props.href - Destination URL.
 * @param props.target - Link target. Defaults to `_blank`.
 * @returns An anchor element.
 *
 * @example
 * ```tsx
 * <Link href="https://example.com/account">
 *   View your account
 * </Link>
 * ```
 */
export const Link: FC<LinkProps> = ({ target = '_blank', ...props }) => (
  <a {...props} target={target} />
)

/**
 * Image element that requires both `src` and `alt`.
 *
 * @param props - Image props.
 * @param props.src - Image URL.
 * @param props.alt - Alternative text for accessibility and clients that block images.
 * @returns An image element.
 *
 * @example
 * ```tsx
 * <Img src="https://example.com/logo.png" alt="Example" width="120" />
 * ```
 */
export const Img: FC<ImageProps> = (props) => <img {...props} />

/**
 * Inline code text with email-friendly default styling.
 *
 * @param props - Standard `<code>` attributes and children.
 * @returns A styled inline code element.
 *
 * @example
 * ```tsx
 * <Text>
 *   Use <CodeInline>npm run build</CodeInline> before deploying.
 * </Text>
 * ```
 */
export const CodeInline: FC<CodeInlineProps> = ({ style, ...props }) => (
  <code
    {...props}
    style={{
      backgroundColor: '#f3f4f6',
      color: '#111827',
      fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '13px',
      padding: '2px 4px',
      ...styleObjectFromUnknown(style),
    }}
  />
)

/**
 * Preformatted code block with wrapping and monospace defaults.
 *
 * @param props - Standard `<pre>` attributes and children.
 * @returns A styled code block.
 *
 * @example
 * ```tsx
 * <CodeBlock>{`curl https://api.example.com/status`}</CodeBlock>
 * ```
 */
export const CodeBlock: FC<CodeBlockProps> = ({ style, ...props }) => (
  <pre
    {...props}
    style={{
      backgroundColor: '#f3f4f6',
      color: '#111827',
      fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: '13px',
      lineHeight: '20px',
      margin: '16px 0',
      overflowX: 'auto',
      padding: '12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      ...styleObjectFromUnknown(style),
    }}
  />
)

/**
 * Ordered or unordered list with email-oriented spacing defaults.
 *
 * @param props - List props.
 * @param props.marker - CSS list marker style.
 * @param props.ordered - Render an ordered list when `true`; otherwise renders an unordered list.
 * @returns An ordered or unordered list.
 *
 * @example
 * ```tsx
 * <List ordered>
 *   <ListItem>Confirm your address</ListItem>
 *   <ListItem>Open the dashboard</ListItem>
 * </List>
 * ```
 */
export const List: FC<ListProps> = ({ marker, ordered, style, ...props }) => {
  const Tag = ordered ? 'ol' : 'ul'

  return (
    <Tag
      {...props}
      style={{
        margin: '16px 0',
        paddingLeft: '24px',
        ...(marker ? { listStyleType: marker } : {}),
        ...styleObjectFromUnknown(style),
      }}
    />
  )
}

/**
 * List item with default text sizing and spacing.
 *
 * @param props - Standard `<li>` attributes and children.
 * @returns A list item.
 *
 * @example
 * ```tsx
 * <List>
 *   <ListItem>First step</ListItem>
 * </List>
 * ```
 */
export const ListItem: FC<ListItemProps> = ({ style, ...props }) => (
  <li
    {...props}
    style={{
      fontSize: '14px',
      lineHeight: '24px',
      marginBottom: '8px',
      ...styleObjectFromUnknown(style),
    }}
  />
)

/**
 * Hidden preview text that is relocated near the top of the rendered email.
 *
 * @param props - Preview props and preview text children.
 * @returns A hidden preview text container.
 *
 * @example
 * ```tsx
 * <Html>
 *   <Preview>Your receipt is ready.</Preview>
 *   <Body>...</Body>
 * </Html>
 * ```
 */
export const Preview: FC<PropsWithChildren<ElementProps<'div'>>> = ({
  children,
  style,
  ...props
}) => (
  <div
    {...props}
    data-hono-email-preview="true"
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
    {buildPreviewPadding(children)}
  </div>
)

/**
 * Horizontal rule with an email-safe border default.
 *
 * @param props - Standard `<hr>` attributes.
 * @returns A horizontal rule.
 *
 * @example
 * ```tsx
 * <Text>Order details</Text>
 * <Hr />
 * <Text>Total: $42.00</Text>
 * ```
 */
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
