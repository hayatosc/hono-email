import type { Child } from "hono/jsx";

export {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "./components";
import {
  TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE,
  TAILWIND_ARTIFACT_REQUIRED_TAG_NAME,
} from "./components";
export type {
  FontProps,
  MarkdownCustomClassNames,
  MarkdownCustomStyles,
  MarkdownStyleMode,
  TailwindBuildArtifact,
} from "./components";
import { relocateHeadStyles } from "./normalize/head-styles";
import { normalizeHtml } from "./normalize/html";
import { relocatePreview } from "./normalize/preview";
import {
  MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME,
  MARKDOWN_TAILWIND_PARENT_REQUIRED_ERROR_MESSAGE,
} from "./markdown";
import { renderFragmentToHtml } from "./render/html";
import { prettyPrintHtml } from "./render/pretty";
export { buildTailwindArtifactFromCss, collectTailwindClassesFromHtml } from "./tailwind";
export type { BuildTailwindArtifactFromCssOptions } from "./tailwind";
import { renderPlainText, type PlainTextRenderOptions } from "./text";
import { validateHtml } from "./validate/html";

type BaseRenderOptions = {
  doctype?: "html5" | "xhtml-transitional" | false;
  pretty?: boolean;
  strict?: boolean;
};

export type HtmlRenderOptions = BaseRenderOptions & {
  output?: "html";
};

export type TextRenderOptions = BaseRenderOptions & {
  output: "text";
  text?: PlainTextRenderOptions;
};

export type RenderOptions = HtmlRenderOptions | TextRenderOptions;

export type { BaseRenderOptions };

const HTML5_DOCTYPE = "<!DOCTYPE html>";
const XHTML_TRANSITIONAL_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

const resolveDoctype = (doctype: BaseRenderOptions["doctype"]): string => {
  if (doctype === false) {
    return "";
  }

  if (doctype === "xhtml-transitional") {
    return XHTML_TRANSITIONAL_DOCTYPE;
  }

  return HTML5_DOCTYPE;
};

const renderHtml = async (jsx: Child, options: BaseRenderOptions = {}): Promise<string> => {
  const strict = options.strict ?? true;
  let html = relocateHeadStyles(relocatePreview(normalizeHtml(await renderFragmentToHtml(jsx))));

  if (html.includes(MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME)) {
    throw new Error(MARKDOWN_TAILWIND_PARENT_REQUIRED_ERROR_MESSAGE);
  }

  if (html.includes(`<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}`)) {
    throw new Error(TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE);
  }

  if (strict) {
    const warnings = validateHtml(html);
    for (const warning of warnings) {
      console.warn(`[hono-email] ${warning}`);
    }
  }

  const doctype = resolveDoctype(options.doctype);

  if (doctype !== "") {
    html = `${doctype}${html}`;
  }

  if (options.pretty) {
    html = prettyPrintHtml(html);
  }

  return html;
};

export async function render(jsx: Child, options?: HtmlRenderOptions): Promise<string>;
export async function render(jsx: Child, options: TextRenderOptions): Promise<string>;
export async function render(jsx: Child, options: RenderOptions = {}): Promise<string> {
  const html = await renderHtml(jsx, options);

  if (options.output === "text") {
    return renderPlainText(html, options.text);
  }

  return html;
}
