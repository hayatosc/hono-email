import type { FC, JSX, PropsWithChildren } from 'hono/jsx'

type ElementProps<Tag extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[Tag]

const PRESENTATION_TABLE_PROPS = {
  border: 0,
  cellPadding: '0',
  cellSpacing: '0',
  role: 'presentation',
} as const

export const Html: FC<PropsWithChildren<ElementProps<'html'>>> = (props) => <html {...props} />

export const Head: FC<PropsWithChildren<ElementProps<'head'>>> = (props) => <head {...props} />

export const Body: FC<PropsWithChildren<ElementProps<'body'>>> = (props) => <body {...props} />

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
