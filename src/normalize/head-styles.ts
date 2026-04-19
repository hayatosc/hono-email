const GENERATED_HEAD_STYLE_PATTERN =
  /<style\b[^>]*data-hono-email-head="true"[^>]*>[\s\S]*?<\/style>/gi;
const HTML_OPEN_PATTERN = /<html\b[^>]*>/i;
const HEAD_OPEN_PATTERN = /<head\b[^>]*>/i;
const HEAD_CLOSE_PATTERN = /<\/head>/i;
const BODY_OPEN_PATTERN = /<body\b[^>]*>/i;

export const relocateHeadStyles = (html: string): string => {
  const generatedStyles = html.match(GENERATED_HEAD_STYLE_PATTERN);
  if (!generatedStyles || generatedStyles.length === 0) {
    return html;
  }

  let normalizedHtml = html.replace(GENERATED_HEAD_STYLE_PATTERN, "");

  const headClose = normalizedHtml.match(HEAD_CLOSE_PATTERN);
  if (headClose?.index !== undefined) {
    return normalizedHtml.replace(HEAD_CLOSE_PATTERN, `${generatedStyles.join("")}</head>`);
  }

  const headOpen = normalizedHtml.match(HEAD_OPEN_PATTERN);
  if (headOpen?.index !== undefined) {
    return normalizedHtml.replace(HEAD_OPEN_PATTERN, `${headOpen[0]}${generatedStyles.join("")}`);
  }

  const htmlOpen = normalizedHtml.match(HTML_OPEN_PATTERN);
  if (htmlOpen?.index !== undefined) {
    return normalizedHtml.replace(
      HTML_OPEN_PATTERN,
      `${htmlOpen[0]}<head>${generatedStyles.join("")}</head>`,
    );
  }

  const bodyOpen = normalizedHtml.match(BODY_OPEN_PATTERN);
  if (bodyOpen?.index !== undefined) {
    return normalizedHtml.replace(
      BODY_OPEN_PATTERN,
      `<head>${generatedStyles.join("")}</head>${bodyOpen[0]}`,
    );
  }

  return `<head>${generatedStyles.join("")}</head>${normalizedHtml}`;
};
