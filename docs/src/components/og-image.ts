import { createElement, type Child } from 'hono/jsx'

const ACCENT = '#f97316'
const BG = '#0f0f0f'
const TEXT = '#fafafa'
const MUTED = '#a1a1aa'

type OgImageProps = {
  title: string
  description: string
}

function h(tag: string | Function, props: Record<string, unknown> | null, ...children: Child[]) {
  return createElement(tag, props, ...children)
}

export function OgImage({ title, description }: OgImageProps) {
  return h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        backgroundColor: BG,
        backgroundImage:
          'radial-gradient(circle at 80% 20%, rgba(249,115,22,0.18), transparent 35%)',
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: 'border-box',
      },
    },
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '28px' } },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '28px',
            fontWeight: 700,
            color: TEXT,
            letterSpacing: '-0.02em',
          },
        },
        h('div', {
          style: {
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: ACCENT,
          },
        }),
        'hono-email',
      ),
      h(
        'h1',
        {
          style: {
            margin: 0,
            maxWidth: '1000px',
            fontSize: '72px',
            fontWeight: 800,
            lineHeight: 1.1,
            color: TEXT,
            letterSpacing: '-0.03em',
            wordBreak: 'break-word',
          },
        },
        title,
      ),
      h(
        'p',
        {
          style: {
            margin: 0,
            maxWidth: '900px',
            fontSize: '36px',
            lineHeight: 1.4,
            color: MUTED,
          },
        },
        description,
      ),
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '24px',
          color: MUTED,
        },
      },
      h('span', null, 'https://hono-email.hayatosc.dev'),
      h('span', null, 'Open source email toolkit for Hono'),
    ),
  )
}
