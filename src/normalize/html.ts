const NORMALIZED_TAGS = ["main", "section", "article", "header", "footer", "nav", "aside"] as const;

export const normalizeHtml = (html: string): string => {
  return NORMALIZED_TAGS.reduce((normalizedHtml, tagName) => {
    const tagPattern = new RegExp(`<(/?)${tagName}\\b`, "gi");
    return normalizedHtml.replace(tagPattern, "<$1div");
  }, html);
};
