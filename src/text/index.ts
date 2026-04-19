export type PlainTextRenderOptions = {
  headingStyle?: "preserve" | "uppercase";
  hrSeparator?: string;
  includeImageAlt?: boolean;
  linkFormat?: "href-only" | "text-and-href" | "text-only";
  listBullet?: string;
};

const DEFAULT_PLAIN_TEXT_RENDER_OPTIONS: Required<PlainTextRenderOptions> = {
  headingStyle: "uppercase",
  hrSeparator: "---",
  includeImageAlt: true,
  linkFormat: "text-and-href",
  listBullet: "-",
};

const stripDoctype = (html: string): string => html.replace(/<!DOCTYPE[^>]*>/gi, "");

const collapseWhitespace = (text: string): string => {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const formatLink = (
  label: string,
  href: string,
  linkFormat: Required<PlainTextRenderOptions>["linkFormat"],
): string => {
  const normalizedLabel = label.trim();

  if (linkFormat === "href-only") {
    return href;
  }

  if (linkFormat === "text-only") {
    return normalizedLabel;
  }

  return normalizedLabel === "" ? href : `${normalizedLabel} (${href})`;
};

const formatImage = (attributes: string, includeImageAlt: boolean): string => {
  if (!includeImageAlt) {
    return "";
  }

  const altMatch = attributes.match(/\salt="([^"]*)"/i);
  return altMatch?.[1] ?? "";
};

export const renderPlainText = (html: string, options: PlainTextRenderOptions = {}): string => {
  const resolvedOptions = {
    ...DEFAULT_PLAIN_TEXT_RENDER_OPTIONS,
    ...options,
  };

  let text = stripDoctype(html);

  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<hr\s*\/?>/gi, `\n${resolvedOptions.hrSeparator}\n`);
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<li[^>]*>/gi, `\n${resolvedOptions.listBullet} `);
  text = text.replace(/<\/li>/gi, "");
  text = text.replace(/<img\b([^>]*)\/?>/gi, (_match, attributes: string) =>
    formatImage(attributes, resolvedOptions.includeImageAlt),
  );
  text = text.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => formatLink(label, href, resolvedOptions.linkFormat),
  );
  text = text.replace(/<[^>]+>/g, "");

  const collapsed = collapseWhitespace(text);

  if (resolvedOptions.headingStyle !== "uppercase") {
    return collapsed;
  }

  return collapsed.replace(/(^|\n)([^\n]+)(\n\n)/g, (match, start, line, end) => {
    if (/^[A-Za-z0-9 _-]+$/.test(line) && line === line.trim() && line.length <= 80) {
      return `${start}${line.toUpperCase()}${end}`;
    }

    return match;
  });
};
