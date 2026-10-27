// Pages built with `StarlightPage` that have no Markdown export (see
// `integrations/markdown-export.ts`), so they must not link to one.
const PAGES_WITHOUT_MARKDOWN = new Set(['/playground'])

/**
 * Resolves the Markdown export URL for a docs page.
 *
 * @param pathname - Page pathname, with or without a trailing slash.
 * @returns The `.md` URL, or `undefined` when the page has no Markdown export.
 */
export const markdownUrlForPathname = (pathname: string): string | undefined => {
  const trimmed = pathname.replace(/\/$/, '')
  if (PAGES_WITHOUT_MARKDOWN.has(trimmed)) return undefined
  return trimmed ? `${trimmed}.md` : '/index.md'
}
