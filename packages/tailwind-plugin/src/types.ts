/**
 * Options for the `@hono-email/tailwind-plugin` Tailwind integration.
 *
 * @property configPath - Optional Tailwind config path to include in generated CSS.
 * @property css - Additional CSS, including imports and theme directives, compiled at build time.
 * @property packageNames - Package names whose `Tailwind` imports should be transformed.
 * @property runtimeModuleSpecifier - Deprecated compatibility option; artifacts have no runtime helper imports.
 * @property safelist - Tailwind classes to always include in the generated artifact.
 */
export type EmailTailwindPluginOptions = {
  configPath?: string
  css?: string
  packageNames?: string[]
  /** @deprecated Artifacts are serialized at build time; no runtime helper is imported. */
  runtimeModuleSpecifier?: string
  safelist?: string[]
}
