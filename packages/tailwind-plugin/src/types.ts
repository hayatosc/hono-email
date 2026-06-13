/**
 * Options for the `@hono-email/tailwind-plugin` Tailwind integration.
 *
 * @property configPath - Optional Tailwind config path to include in generated CSS.
 * @property css - Additional CSS appended to the generated per-file Tailwind CSS module.
 * @property packageNames - Package names whose `Tailwind` imports should be transformed.
 * @property runtimeModuleSpecifier - Module specifier used when generated code imports runtime helpers.
 * @property safelist - Tailwind classes to always include in the generated artifact.
 */
export type EmailTailwindPluginOptions = {
  configPath?: string
  css?: string
  packageNames?: string[]
  runtimeModuleSpecifier?: string
  safelist?: string[]
}
