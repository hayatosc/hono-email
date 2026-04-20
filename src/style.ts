import type { JSX } from "hono/jsx";

export type StyleValue = string | number;
export type StyleRecord = Record<string, StyleValue>;

const kebabCasePattern = /[A-Z]/g;

const toKebabCase = (value: string): string =>
  value.replace(kebabCasePattern, (match) => `-${match.toLowerCase()}`);

export const styleObjectFromUnknown = (style: unknown): StyleRecord | undefined => {
  if (typeof style === "object" && style !== null && !Array.isArray(style)) {
    const normalized: StyleRecord = {};

    for (const [key, value] of Object.entries(style)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
      }

      normalized[key] = value;
    }

    return normalized;
  }

  return undefined;
};

export const normalizeStyleObject = (
  style?: JSX.CSSProperties | StyleRecord,
): Record<string, string> => {
  if (!style) {
    return {};
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    normalized[toKebabCase(key)] = `${value}`;
  }

  return normalized;
};

export const parseStyleAttribute = (style?: string): Record<string, string> => {
  if (!style) {
    return {};
  }

  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (property !== "" && value !== "") {
        accumulator[property] = value;
      }
      return accumulator;
    }, {});
};

export const serializeStyleAttribute = (style: Record<string, string>): string =>
  Object.entries(style)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");

export const mergeStyleAttributes = (
  existingStyle: string | undefined,
  additionalStyle: Record<string, string>,
): string => {
  const merged = {
    ...parseStyleAttribute(existingStyle),
    ...additionalStyle,
  };

  return serializeStyleAttribute(merged);
};
