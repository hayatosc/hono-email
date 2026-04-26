import {
  buildTailwindArtifactFromCss,
  transformTailwindHtml,
  wrapGeneratedHeadCss,
} from '../tailwind'

const HONO_CSS_STYLE_ID = 'hono-css'
const HONO_CSS_STYLE_TAG_PATTERN = new RegExp(
  `<style\\b(?=[^>]*\\bid=(["'])${HONO_CSS_STYLE_ID}\\1)[^>]*>([\\s\\S]*?)<\\/style>`,
  'gi',
)
const HONO_CSS_RUNTIME_SCRIPT_PATTERN = new RegExp(
  `<script\\b[^>]*>[\\s\\S]*?document\\.querySelector\\((["'])#${HONO_CSS_STYLE_ID}\\1\\)\\.textContent\\+=`,
  'i',
)
const HONO_CSS_RUNTIME_SCRIPT_TAG_PATTERN = new RegExp(
  `<script\\b[^>]*>[\\s\\S]*?document\\.querySelector\\((["'])#${HONO_CSS_STYLE_ID}\\1\\)\\.textContent\\+=(["'])([\\s\\S]*?)\\2;?[\\s\\S]*?<\\/script>`,
  'gi',
)

const HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE =
  'hono/css styles require <Head><Style /></Head> in hono-email. Import Style from "hono/css" and place it inside <Head>.'
const HONO_CSS_STYLE_HEAD_REQUIRED_ERROR_MESSAGE =
  'The hono/css <Style /> tag must be inside <Head> when rendering with hono-email.'

const extractHeadBounds = (html: string): { headOpen: number; headClose: number } => {
  const headOpenMatch = html.match(/<head\b[^>]*>/i)
  const headCloseMatch = html.match(/<\/head>/i)
  return {
    headOpen: headOpenMatch?.index ?? -1,
    headClose: headCloseMatch?.index ?? -1,
  }
}

const decodeHonoCssRuntimeString = (rawCss: string): string =>
  rawCss
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')

const extractHonoCssFromHtml = (
  html: string,
): { css: string; foundStyleTag: boolean; html: string } => {
  const { headClose, headOpen } = extractHeadBounds(html)
  const cssChunks: string[] = []
  let foundStyleTag = false

  const stripped = html.replace(
    HONO_CSS_STYLE_TAG_PATTERN,
    (_fullMatch: string, _quote: string, cssText: string, offset: number) => {
      const insideHead =
        headOpen >= 0 && headClose >= 0 && offset >= headOpen && offset <= headClose
      if (!insideHead) {
        throw new Error(HONO_CSS_STYLE_HEAD_REQUIRED_ERROR_MESSAGE)
      }
      foundStyleTag = true
      cssChunks.push(cssText)
      return ''
    },
  )

  return {
    css: cssChunks.join('\n').trim(),
    foundStyleTag,
    html: stripped,
  }
}

const extractHonoCssRuntimeScripts = (
  html: string,
): { css: string; foundScript: boolean; html: string } => {
  const cssChunks: string[] = []
  let foundScript = false

  const stripped = html.replace(
    HONO_CSS_RUNTIME_SCRIPT_TAG_PATTERN,
    (_fullMatch: string, _selectorQuote: string, _cssQuote: string, rawCssText: string) => {
      foundScript = true
      cssChunks.push(decodeHonoCssRuntimeString(rawCssText))
      return ''
    },
  )

  return {
    css: cssChunks.join('\n').trim(),
    foundScript,
    html: stripped,
  }
}

export const transformHonoCssOutput = async (html: string): Promise<string> => {
  const extracted = extractHonoCssFromHtml(html)
  const runtimeExtracted = extractHonoCssRuntimeScripts(extracted.html)

  if (runtimeExtracted.foundScript && !extracted.foundStyleTag) {
    throw new Error(HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE)
  }

  const css = [extracted.css, runtimeExtracted.css]
    .filter((chunk) => chunk !== '')
    .join('\n')
    .trim()
  if (css === '') {
    if (HONO_CSS_RUNTIME_SCRIPT_PATTERN.test(html)) {
      throw new Error(HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE)
    }
    return runtimeExtracted.html
  }

  const artifact = buildTailwindArtifactFromCss({ css })
  const transformed = await transformTailwindHtml(runtimeExtracted.html, artifact, {
    preserveMarkdownTailwindParentRequiredAttribute: true,
    throwOnMissingClass: false,
  })

  return `${wrapGeneratedHeadCss(transformed.headCss)}${transformed.html}`
}
