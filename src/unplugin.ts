import path from 'node:path';

import { createUnplugin, type UnpluginFactory, type UnpluginInstance } from 'unplugin';

const PLUGIN_NAME = 'hono-email-tailwind';
const DEFAULT_PACKAGE_NAMES = ['hono-email'] as const;
const ARTIFACT_IMPORT_PREFIX = 'virtual:hono-email-tw-artifact:';
const CSS_IMPORT_PREFIX = 'virtual:hono-email-tw.css:';
const RESOLVED_ARTIFACT_PREFIX = '\0virtual:hono-email-tw-artifact:';
const RESOLVED_CSS_PREFIX = '\0virtual:hono-email-tw-css:';
const RESOLVED_CSS_SUFFIX = '.css';
const SOURCE_MODULE_FILTER: RegExp = /\.[cm]?[jt]sx?$/;
const TAILWIND_COMPONENT_OPEN_TAG_PATTERN: RegExp = /<Tailwind\b([^>]*?)(\/?)>/g;

export type EmailTailwindPluginOptions = {
  configPath?: string;
  css?: string;
  packageNames?: string[];
  runtimeModuleSpecifier?: string;
  safelist?: string[];
};

type ResolvedPluginOptions = {
  configPath?: string;
  css?: string;
  packageNames: string[];
  runtimeModuleSpecifier: string;
  safelist: string[];
};

const normalizePathForCss = (value: string): string => value.replace(/\\/g, '/');

const resolveOptionalPath = (value: string | undefined): string | undefined => (value ? normalizePathForCss(path.resolve(value)) : undefined);

const resolvePluginOptions = (options: EmailTailwindPluginOptions = {}): ResolvedPluginOptions => ({
  configPath: resolveOptionalPath(options.configPath),
  css: options.css?.trim(),
  packageNames: options.packageNames?.length ? [...new Set(options.packageNames)] : [...DEFAULT_PACKAGE_NAMES],
  runtimeModuleSpecifier: options.runtimeModuleSpecifier?.trim() || options.packageNames?.[0] || DEFAULT_PACKAGE_NAMES[0],
  safelist: options.safelist?.length ? [...new Set(options.safelist)] : [],
});

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripQueryAndHash = (id: string): string => id.replace(/[?#].*$/, '');

const hasTailwindImport = (code: string, packageNames: string[]): boolean =>
  packageNames.some(
    (packageName) =>
      new RegExp(`from\\s*['"]${escapeForRegExp(packageName)}['"]`).test(code) &&
      new RegExp(`import\\s*{[\\s\\S]*\\bTailwind\\b[\\s\\S]*}\\s*from\\s*['"]${escapeForRegExp(packageName)}['"]`).test(code),
  );

export const transformTailwindComponentSource = (code: string, id: string, packageNames: string[] = [...DEFAULT_PACKAGE_NAMES]): string | null => {
  if (!hasTailwindImport(code, packageNames) || !code.includes('<Tailwind')) {
    return null;
  }

  let replaced = false;
  const transformedCode = code.replace(TAILWIND_COMPONENT_OPEN_TAG_PATTERN, (fullMatch, attributes: string, selfClosing: string) => {
    if (/\bartifact\s*=/.test(attributes)) {
      return fullMatch;
    }

    replaced = true;
    return `<Tailwind artifact={__EmailTailwindArtifact}${attributes}${selfClosing}>`;
  });

  if (!replaced) {
    return null;
  }

  const encodedPath = encodeURIComponent(normalizePathForCss(id));
  return `import __EmailTailwindArtifact from '${ARTIFACT_IMPORT_PREFIX}${encodedPath}'\n${transformedCode}`;
};

export const buildPerFileCssModule = (sourceFilePath: string, options: EmailTailwindPluginOptions = {}): string => {
  const resolved = resolvePluginOptions(options);
  const lines = ['@import "tailwindcss";'];

  if (resolved.configPath) {
    lines.push(`@config "${resolved.configPath}";`);
  }

  lines.push(`@source "${normalizePathForCss(sourceFilePath)}";`);

  if (resolved.safelist.length > 0) {
    lines.push(`@source inline(${JSON.stringify(resolved.safelist.join(' '))});`);
  }

  if (resolved.css) {
    lines.push(resolved.css);
  }

  return `${lines.join('\n')}\n`;
};

export const buildPerFileArtifactModule = (encodedPath: string, runtimeModuleSpecifier: string = DEFAULT_PACKAGE_NAMES[0]): string =>
  `import tailwindCss from '${CSS_IMPORT_PREFIX}${encodedPath}?inline'\n` +
  `import { buildTailwindArtifactFromCss } from '${runtimeModuleSpecifier}'\n\n` +
  `export default buildTailwindArtifactFromCss({ css: tailwindCss })\n`;

const factory: UnpluginFactory<EmailTailwindPluginOptions | undefined> = (options) => {
  const resolvedOptions = resolvePluginOptions(options);

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(ARTIFACT_IMPORT_PREFIX)) {
        return `${RESOLVED_ARTIFACT_PREFIX}${id.slice(ARTIFACT_IMPORT_PREFIX.length)}`;
      }

      if (id.startsWith(CSS_IMPORT_PREFIX)) {
        const withoutPrefix = id.slice(CSS_IMPORT_PREFIX.length);
        const queryIndex = withoutPrefix.indexOf('?');
        const encodedPath = queryIndex >= 0 ? withoutPrefix.slice(0, queryIndex) : withoutPrefix;
        const query = queryIndex >= 0 ? withoutPrefix.slice(queryIndex) : '';
        return `${RESOLVED_CSS_PREFIX}${encodedPath}${RESOLVED_CSS_SUFFIX}${query}`;
      }

      return null;
    },
    load(id) {
      const bareId = id.replace(/\?.*$/, '');
      if (bareId.startsWith(RESOLVED_CSS_PREFIX) && bareId.endsWith(RESOLVED_CSS_SUFFIX)) {
        const encodedPath = bareId.slice(RESOLVED_CSS_PREFIX.length, -RESOLVED_CSS_SUFFIX.length);
        const sourceFilePath = decodeURIComponent(encodedPath);

        this.addWatchFile(sourceFilePath);

        if (resolvedOptions.configPath) {
          this.addWatchFile(resolvedOptions.configPath);
        }

        return buildPerFileCssModule(sourceFilePath, resolvedOptions);
      }

      if (bareId.startsWith(RESOLVED_ARTIFACT_PREFIX)) {
        const encodedPath = bareId.slice(RESOLVED_ARTIFACT_PREFIX.length);
        return buildPerFileArtifactModule(encodedPath, resolvedOptions.runtimeModuleSpecifier);
      }

      return null;
    },
    transform: {
      filter: {
        id: SOURCE_MODULE_FILTER,
        code: '<Tailwind',
      },
      handler(code, id) {
        const normalizedId = stripQueryAndHash(id);
        if (!SOURCE_MODULE_FILTER.test(normalizedId)) {
          return null;
        }

        return transformTailwindComponentSource(code, normalizedId, resolvedOptions.packageNames);
      },
    },
  };
};

const EmailTailwind: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean> = createUnplugin(factory);

export default EmailTailwind;
export const rollupPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rollup'] = EmailTailwind.rollup;
export const vitePlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['vite'] = EmailTailwind.vite;
export const rolldownPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rolldown'] = EmailTailwind.rolldown;
export const webpackPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['webpack'] = EmailTailwind.webpack;
export const rspackPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['rspack'] = EmailTailwind.rspack;
export const esbuildPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['esbuild'] = EmailTailwind.esbuild;
export const farmPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['farm'] = EmailTailwind.farm;
export const bunPlugin: UnpluginInstance<EmailTailwindPluginOptions | undefined, boolean>['bun'] = EmailTailwind.bun;
export const unpluginFactory: UnpluginFactory<EmailTailwindPluginOptions | undefined> = factory;
