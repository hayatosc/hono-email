export function patchComponentUrls(html: string): string {
  return html.replace(/component-url="([^"]*)"/g, (match, url: string) => {
    const isUnixAbsolute =
      url.startsWith('/') &&
      !(url.startsWith('/src/') || url.startsWith('/@') || url.startsWith('/_'))
    const isWindowsAbsolute = /^[A-Za-z]:\//.test(url)

    if (!isUnixAbsolute && !isWindowsAbsolute) return match

    return `component-url="/@fs${url}"`
  })
}
