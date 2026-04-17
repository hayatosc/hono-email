const stripDoctype = (html: string): string => html.replace(/<!DOCTYPE[^>]*>/gi, '')

const collapseWhitespace = (text: string): string => {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export const toPlainText = (html: string): string => {
  let text = stripDoctype(html)

  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<li[^>]*>/gi, '\n- ')
  text = text.replace(/<\/li>/gi, '')
  text = text.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => `${label} (${href})`
  )
  text = text.replace(/<[^>]+>/g, '')

  return collapseWhitespace(text).replace(/(^|\n)([^\n]+)(\n\n)/g, (match, start, line, end) => {
    if (/^[A-Za-z0-9 _-]+$/.test(line) && line === line.trim() && line.length <= 80) {
      return `${start}${line.toUpperCase()}${end}`
    }
    return match
  })
}
