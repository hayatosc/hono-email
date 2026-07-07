/** @jsxImportSource hono/jsx */

import { Style, css } from 'hono/css'

// Docs design tokens (dark mode zinc scale + landing accent)
const BG = '#09090b'
const TEXT = '#fafafa'
const MUTED = '#8a8a95'
const HAIRLINE = 'hsla(240, 5%, 18%, 0.5)'

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630
const PADDING = 80

const rootClass = css`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: ${CANVAS_WIDTH}px;
  height: ${CANVAS_HEIGHT}px;
  padding: ${PADDING}px;
  box-sizing: border-box;
  background-color: ${BG};
  overflow: hidden;
  font-family:
    'Inter',
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
`

const glowClass = css`
  position: absolute;
  inset: -30% 0 auto 0;
  width: 100%;
  height: 80%;
  background:
    radial-gradient(60% 60% at 70% 0%, hsla(18, 90%, 56%, 0.14), transparent 70%),
    radial-gradient(50% 50% at 20% 10%, hsla(0, 0%, 100%, 0.06), transparent 70%);
  filter: blur(8px);
`

const gridClass = css`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, ${HAIRLINE} 1px, transparent 1px),
    linear-gradient(to bottom, ${HAIRLINE} 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(75% 60% at 50% 0%, #000 0%, transparent 80%);
  mask-image: radial-gradient(75% 60% at 50% 0%, #000 0%, transparent 80%);
`

const watermarkClass = css`
  position: absolute;
  right: -60px;
  top: 90px;
  width: 440px;
  height: 440px;
  opacity: 0.08;
  pointer-events: none;
`

const headerClass = css`
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
`

const logoIconClass = css`
  width: 48px;
  height: 48px;
  flex-shrink: 0;
`

const brandClass = css`
  font-size: 28px;
  font-weight: 700;
  color: ${TEXT};
  letter-spacing: -0.03em;
`

const titleClass = css`
  position: relative;
  margin: 0;
  max-width: 1000px;
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  color: ${TEXT};
  letter-spacing: -0.035em;
  word-break: break-word;
`

const descriptionClass = css`
  position: relative;
  margin: 24px 0 0;
  max-width: 900px;
  font-size: 36px;
  line-height: 1.4;
  color: ${MUTED};
`

const footerClass = css`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24px;
  color: ${MUTED};
`

type OgImageProps = {
  title: string
  description: string
}

// Logo paths copied from docs/src/assets/logo.svg
function LogoPaths() {
  return (
    <>
      <path
        d="M64 6 C 48 6, 30 20, 30 42 C 30 58, 42 72, 52 80 L 58 80 C 50 66, 46 54, 46 40 C 46 24, 54 10, 64 6 Z"
        fill="#C93607"
      />
      <path
        d="M64 6 C 80 6, 98 20, 98 42 C 98 58, 86 72, 76 80 L 70 80 C 78 66, 82 54, 82 40 C 82 24, 74 10, 64 6 Z"
        fill="#E8420A"
      />
      <path
        d="M64 6 C 54 10, 46 24, 46 40 C 46 54, 50 66, 58 80 L 70 80 C 78 66, 82 54, 82 40 C 82 24, 74 10, 64 6 Z"
        fill="#FF7A1A"
      />
      <path d="M53 80 L75 80 L71 90 L57 90 Z" fill="#A32B05" />
      <path
        d="M48 90 H80 A4 4 0 0 1 84 94 V112 A4 4 0 0 1 80 116 H48 A4 4 0 0 1 44 112 V94 A4 4 0 0 1 48 90 Z"
        fill="#FF7A1A"
      />
      <path
        d="M45 91.5 L64 105 L83 91.5 A4 4 0 0 0 80 90 H48 A4 4 0 0 0 45 91.5 Z"
        fill="#C93607"
      />
    </>
  )
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 1)}…`
}

export function OgImage({ title, description }: OgImageProps) {
  const trimmedTitle = truncate(title, 80)
  const trimmedDescription = truncate(description, 160)

  return (
    <div class={rootClass}>
      <Style />
      <div class={glowClass} />
      <div class={gridClass} />
      <svg
        class={watermarkClass}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 128 128"
        width="440"
        height="440"
        aria-hidden="true"
      >
        <LogoPaths />
      </svg>

      <div>
        <div class={headerClass}>
          <svg
            class={logoIconClass}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 128 128"
            width="48"
            height="48"
            aria-hidden="true"
          >
            <LogoPaths />
          </svg>
          <span class={brandClass}>hono-email</span>
        </div>
        <h1 class={titleClass}>{trimmedTitle}</h1>
        <p class={descriptionClass}>{trimmedDescription}</p>
      </div>

      <div class={footerClass}>
        <span>https://hono-email.hayatosc.dev</span>
        <span>Open source email toolkit for Hono</span>
      </div>
    </div>
  )
}
