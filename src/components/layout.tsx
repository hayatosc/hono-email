import type { FC, JSX, PropsWithChildren } from 'hono/jsx'

import { styleObjectFromUnknown } from '../style'

type ElementProps<Tag extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[Tag]
type SpaceValue = number | string
type FlexDirection = 'column' | 'row'
type FlexAlign = 'baseline' | 'bottom' | 'center' | 'middle' | 'stretch' | 'top'
type FlexJustify = 'center' | 'end' | 'left' | 'right' | 'space-between' | 'start'
type BoxElement = 'div' | 'span' | 'table' | 'tbody' | 'tr' | 'td'

const PRESENTATION_TABLE_PROPS = {
  border: 0,
  cellPadding: '0',
  cellSpacing: '0',
  role: 'presentation',
} as const

type BoxProps<As extends BoxElement = 'div'> = PropsWithChildren<
  Omit<ElementProps<As>, 'children'> & {
    as?: As
  }
>

type SpacerProps = Omit<ElementProps<'div'>, 'children'> & {
  height?: SpaceValue
  width?: SpaceValue
}

type FlexProps = PropsWithChildren<
  Omit<ElementProps<'table'>, 'children'> & {
    align?: FlexAlign
    direction?: FlexDirection
    gap?: SpaceValue
    justify?: FlexJustify
  }
>

type GridProps = PropsWithChildren<
  Omit<ElementProps<'table'>, 'children'> & {
    align?: FlexAlign
    columns?: number
    gap?: SpaceValue
  }
>

type CardProps = PropsWithChildren<
  Omit<ElementProps<'table'>, 'children' | 'width'> & {
    backgroundColor?: string
    borderColor?: string
    borderWidth?: SpaceValue
    contentStyle?: JSX.CSSProperties
    padding?: SpaceValue
    width?: SpaceValue
  }
>

const toCssSpace = (value: SpaceValue | undefined): string | undefined => {
  if (typeof value === 'number') {
    return `${value}px`
  }

  const trimmed = value?.trim()
  return trimmed === '' ? undefined : trimmed
}

const getTableAlign = (
  justify: FlexJustify | undefined,
): 'center' | 'left' | 'right' | undefined => {
  if (justify === 'center') {
    return 'center'
  }

  if (justify === 'end' || justify === 'right') {
    return 'right'
  }

  if (justify === 'left' || justify === 'start') {
    return 'left'
  }

  return undefined
}

const getCellVAlign = (
  align: FlexAlign | undefined,
): 'baseline' | 'bottom' | 'middle' | 'top' | undefined => {
  if (align === 'center' || align === 'middle') {
    return 'middle'
  }

  if (align === 'bottom') {
    return 'bottom'
  }

  if (align === 'baseline') {
    return 'baseline'
  }

  return align === 'stretch' ? undefined : 'top'
}

const renderSpacerCell = (gap: string | undefined, direction: FlexDirection, index: number) => {
  if (!gap || index === 0) {
    return null
  }

  if (direction === 'column') {
    return (
      <tr aria-hidden="true">
        <td height={gap} style={{ fontSize: '0px', lineHeight: '0px' }}>
          &nbsp;
        </td>
      </tr>
    )
  }

  return <td aria-hidden="true" style={{ fontSize: '0px', lineHeight: '0px' }} width={gap} />
}

const chunkChildren = (children: unknown[], columns: number): unknown[][] => {
  const rows: unknown[][] = []
  for (let index = 0; index < children.length; index += columns) {
    rows.push(children.slice(index, index + columns))
  }
  return rows
}

export const Html: FC<PropsWithChildren<ElementProps<'html'>>> = (props) => <html {...props} />

export const Head: FC<PropsWithChildren<ElementProps<'head'>>> = (props) => <head {...props} />

export const Body: FC<PropsWithChildren<ElementProps<'body'>>> = (props) => <body {...props} />

export const Box = <As extends BoxElement = 'div'>({ as, style, ...props }: BoxProps<As>) => {
  const Tag = as ?? 'div'
  return <Tag {...props} style={styleObjectFromUnknown(style)} />
}

export const Spacer: FC<SpacerProps> = ({ height = 16, style, width = '100%', ...props }) => (
  <div
    {...props}
    aria-hidden="true"
    style={{
      fontSize: '0px',
      lineHeight: '0px',
      height: toCssSpace(height),
      width: toCssSpace(width),
      ...styleObjectFromUnknown(style),
    }}
  >
    &nbsp;
  </div>
)

export const Flex: FC<FlexProps> = ({
  align = 'top',
  children,
  direction = 'row',
  gap,
  justify,
  style,
  ...props
}) => {
  const childArray = Array.isArray(children) ? children : [children]
  const gapSpace = toCssSpace(gap)
  const valign = getCellVAlign(align)
  const tableAlign = getTableAlign(justify)
  const tableStyle = {
    ...styleObjectFromUnknown(style),
    ...(justify === 'space-between' ? { width: '100%' } : {}),
  }

  if (direction === 'column') {
    return (
      <table {...PRESENTATION_TABLE_PROPS} {...props} align={tableAlign} style={tableStyle}>
        <tbody>
          {childArray.map((child, index) => (
            <>
              {renderSpacerCell(gapSpace, direction, index)}
              <tr>
                <td valign={valign}>{child}</td>
              </tr>
            </>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <table {...PRESENTATION_TABLE_PROPS} {...props} align={tableAlign} style={tableStyle}>
      <tbody>
        <tr>
          {childArray.map((child, index) => (
            <>
              {renderSpacerCell(gapSpace, direction, index)}
              <td
                style={justify === 'space-between' ? { width: `${100 / childArray.length}%` } : {}}
                valign={valign}
              >
                {child}
              </td>
            </>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

export const Grid: FC<GridProps> = ({
  align = 'top',
  children,
  columns = 2,
  gap,
  style,
  ...props
}) => {
  const childArray = Array.isArray(children) ? children : [children]
  const columnCount = Math.max(1, Math.floor(columns))
  const gapSpace = toCssSpace(gap)
  const rows = chunkChildren(childArray, columnCount)
  const valign = getCellVAlign(align)
  const cellWidth = `${100 / columnCount}%`

  return (
    <table
      {...PRESENTATION_TABLE_PROPS}
      width="100%"
      {...props}
      style={styleObjectFromUnknown(style)}
    >
      <tbody>
        {rows.map((row, rowIndex) => (
          <>
            {gapSpace && rowIndex > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={columnCount * 2 - 1}
                  height={gapSpace}
                  style={{ fontSize: '0px', lineHeight: '0px' }}
                >
                  &nbsp;
                </td>
              </tr>
            ) : null}
            <tr>
              {row.map((child, columnIndex) => (
                <>
                  {gapSpace && columnIndex > 0 ? (
                    <td
                      aria-hidden="true"
                      style={{ fontSize: '0px', lineHeight: '0px' }}
                      width={gapSpace}
                    />
                  ) : null}
                  <td style={{ width: cellWidth }} valign={valign} width={cellWidth}>
                    {child}
                  </td>
                </>
              ))}
            </tr>
          </>
        ))}
      </tbody>
    </table>
  )
}

export const Card: FC<CardProps> = ({
  backgroundColor = '#ffffff',
  borderColor = '#e5e7eb',
  borderWidth = 1,
  children,
  contentStyle,
  padding = 24,
  style,
  width = '100%',
  ...props
}) => {
  const borderSpace = toCssSpace(borderWidth) ?? '1px'
  const cardWidth = toCssSpace(width)

  return (
    <table
      {...PRESENTATION_TABLE_PROPS}
      width={cardWidth}
      {...props}
      style={styleObjectFromUnknown(style)}
    >
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor,
              border: `${borderSpace} solid ${borderColor}`,
              padding: toCssSpace(padding),
              ...styleObjectFromUnknown(contentStyle),
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export const Container: FC<PropsWithChildren<ElementProps<'table'>>> = ({ children, ...props }) => (
  <table {...PRESENTATION_TABLE_PROPS} width="100%" {...props}>
    <tbody>
      <tr>
        <td>{children}</td>
      </tr>
    </tbody>
  </table>
)

export const Section: FC<PropsWithChildren<ElementProps<'table'>>> = ({ children, ...props }) => (
  <table {...PRESENTATION_TABLE_PROPS} width="100%" {...props}>
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
