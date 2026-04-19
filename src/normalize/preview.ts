const PREVIEW_BLOCK_PATTERN = /<div\b[^>]*data-hono-email-preview="true"[^>]*>[\s\S]*?<\/div>/i;
const BODY_OPENING_TAG_PATTERN = /<body\b[^>]*>/i;

export const relocatePreview = (html: string): string => {
  const previewMatch = html.match(PREVIEW_BLOCK_PATTERN);
  const bodyMatch = html.match(BODY_OPENING_TAG_PATTERN);

  if (!previewMatch || !bodyMatch || !previewMatch[0] || !bodyMatch[0]) {
    return html;
  }

  const previewBlock = previewMatch[0];
  const withoutPreview = html.replace(PREVIEW_BLOCK_PATTERN, "");

  return withoutPreview.replace(BODY_OPENING_TAG_PATTERN, `${bodyMatch[0]}${previewBlock}`);
};
