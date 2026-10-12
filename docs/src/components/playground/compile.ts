import * as honoEmail from 'hono-email'
import * as honoCss from 'hono/css'
import * as honoJsx from 'hono/jsx'
import * as honoJsxRuntime from 'hono/jsx/jsx-runtime'
import { transform } from 'sucrase'

/** Modules the playground source can import. */
const PLAYGROUND_MODULES: Record<string, unknown> = {
  'hono-email': honoEmail,
  'hono/css': honoCss,
  'hono/jsx': honoJsx,
  'hono/jsx/jsx-runtime': honoJsxRuntime,
}

const SUPPORTED_IMPORTS = Object.keys(PLAYGROUND_MODULES)
  .filter((id) => id !== 'hono/jsx/jsx-runtime')
  .map((id) => `'${id}'`)
  .join(', ')

export type PlaygroundOptions = {
  strict: boolean
}

export type PlaygroundResult =
  | { ok: true; html: string; prettyHtml: string; text: string; warnings: string[] }
  | { ok: false; error: string }

/**
 * Transpiles playground TSX into CommonJS that `evaluate()` can run.
 *
 * @param source - TSX source written in the editor.
 * @returns CommonJS code using the `hono/jsx` automatic runtime.
 */
export const transpile = (source: string): string =>
  transform(source, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'automatic',
    jsxImportSource: 'hono/jsx',
    production: true,
    filePath: 'email.tsx',
  }).code

/**
 * Runs transpiled playground code and returns its exports.
 *
 * @param code - Output of `transpile()`.
 * @returns The module's `exports` object.
 */
export const evaluate = (code: string): Record<string, unknown> => {
  const module: { exports: Record<string, unknown> } = { exports: {} }
  const require = (id: string): unknown => {
    if (!Object.hasOwn(PLAYGROUND_MODULES, id)) {
      throw new Error(`Cannot import '${id}'. The playground supports ${SUPPORTED_IMPORTS}.`)
    }
    return PLAYGROUND_MODULES[id]
  }
  // Running the editor's code is the playground's purpose; it only ever runs in the visitor's browser.
  // oxlint-disable-next-line typescript/no-implied-eval
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Transpiles, runs, and renders playground source with `hono-email`.
 *
 * The default export may be a component (rendered without props) or a JSX element.
 * `html` and `text` match a default `render()` call; `prettyHtml` is the same email
 * pretty-printed for reading.
 *
 * @param source - TSX source written in the editor.
 * @param options - Render options exposed in the playground UI.
 * @returns Rendered HTML, plain text, and warnings, or the error that stopped rendering.
 */
export const renderPlayground = async (
  source: string,
  options: PlaygroundOptions,
): Promise<PlaygroundResult> => {
  try {
    const { default: template } = evaluate(transpile(source))
    if (template === undefined || template === null) {
      throw new Error(
        'Add a default export, for example `export default function Email() { return <Html>...</Html> }`.',
      )
    }
    const Template = typeof template === 'function' ? template : () => template
    const renderOptions = { strict: options.strict, onWarning: 'silent' } as const
    const result = await honoEmail.render(honoJsx.jsx(Template, {}), renderOptions)
    const pretty = await honoEmail.render(honoJsx.jsx(Template, {}), {
      ...renderOptions,
      pretty: true,
    })
    return {
      ok: true,
      html: result.html,
      prettyHtml: pretty.html,
      text: result.text,
      warnings: result.warnings,
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}
