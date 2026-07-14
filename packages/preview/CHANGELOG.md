# @hono-email/preview

## 0.8.0

### Minor Changes

- [#124](https://github.com/hayatosc/hono-email/pull/124) [`57ee6b3`](https://github.com/hayatosc/hono-email/commit/57ee6b34e38e4f9ddb117804f89b2a92037b470b) Thanks [@hayatosc](https://github.com/hayatosc)! - Add a `-f, --file <path>` CLI option to `hono-email preview` to explicitly opt in to loading a Vite config file into the preview server. The default remains not loading any config, per the `configFile: false` fix. If the loaded config already registers a Tailwind CSS plugin, the preview server's built-in Tailwind auto-detection is skipped to avoid registering it twice.

### Patch Changes

- [#122](https://github.com/hayatosc/hono-email/pull/122) [`4bbb4fd`](https://github.com/hayatosc/hono-email/commit/4bbb4fd3d1840d01456b592dd3001cd523ed4698) Thanks [@hayatosc](https://github.com/hayatosc)! - Stop the preview server from auto-loading the user's `vite.config.*`. Previously Vite discovered and merged the project's config into the preview server's internal Vite instance, so foreign plugins (e.g. `@cloudflare/vite-plugin`) broke the preview. The preview server now always runs with its own self-contained plugin set (`configFile: false`); settings from the project's Vite config (such as `resolve.alias`) no longer apply to the preview.

## 0.7.0

### Patch Changes

- [#118](https://github.com/hayatosc/hono-email/pull/118) [`d160fdf`](https://github.com/hayatosc/hono-email/commit/d160fdfba6379c2029fb65e48081cf657dd43d5d) Thanks [@hayatosc](https://github.com/hayatosc)! - - Fix HTMLRewriter parsing crash caused by self-closing meta tags in layout components.
  - Fix HTML splitting bug in TOKEN_PATTERN parser when quotes contain `>` characters in Preview relocate logic.
  - Robust case/whitespace-insensitive style property verification in validateStyleTags.
  - Support custom AbortSignal propagation in fetchWithTimeoutAndRetry without overwriting timeouts.
  - Enable HTTP 429 Too Many Requests retry logic and parse Retry-After headers in adapters.
  - Consume and cancel response bodies during retries to prevent connection pinning.
  - Make preventWidows walk through nested inline tags (e.g. `<b>bold</b>`) to join trailing words.
  - Resolve remote and local attachments in parallel using Promise.all during email preparation.
  - Add `--host` option to preview CLI and server to bind to specific interfaces for mobile testing.

- [#118](https://github.com/hayatosc/hono-email/pull/118) [`ce2c139`](https://github.com/hayatosc/hono-email/commit/ce2c139e63ca9b8fd60161805bb7cce824adcfd4) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix the `@hono-email/tailwind-plugin` dependency issue in `@hono-email/preview` by declaring it as an optional peerDependency and adding clean error handling if import fails at runtime.

- [#119](https://github.com/hayatosc/hono-email/pull/119) [`b8c999a`](https://github.com/hayatosc/hono-email/commit/b8c999a67e1939bcea6a53811ddf91f97cbae394) Thanks [@hayatosc](https://github.com/hayatosc)! - Migrate the codebase to TypeScript 7 (native compiler preview).
  - Add `isolatedDeclarations: true` and `declaration: true` to TSConfigs.
  - Add explicit type annotations to exported components, functions, and command definitions to satisfy isolated declarations requirements.
  - Downgrade TypeScript in `docs` package to `^6.0.3` to avoid Astro check crash on native TypeScript.

## 0.6.2

## 0.6.1

### Patch Changes

- [#107](https://github.com/hayatosc/hono-email/pull/107) [`a17d480`](https://github.com/hayatosc/hono-email/commit/a17d480757bf24a50445a0e323bf102a8da76234) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: make prepareClientHtml replacement more robust

- [#106](https://github.com/hayatosc/hono-email/pull/106) [`caaa824`](https://github.com/hayatosc/hono-email/commit/caaa824ea808f78cdc4caeb3cc0943c7f258d662) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: require previewProps marker for named email component exports

- [#105](https://github.com/hayatosc/hono-email/pull/105) [`e1f00f6`](https://github.com/hayatosc/hono-email/commit/e1f00f6eb08189dac2c86d3beec369a2515931e6) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: respect prefers-reduced-motion in preview client styles

- [#98](https://github.com/hayatosc/hono-email/pull/98) [`227a1bc`](https://github.com/hayatosc/hono-email/commit/227a1bc8df6a1b460e7eebd85517c6569ef62abc) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: multiple stability and error handling improvements in preview server

## 0.6.0

### Minor Changes

- [#53](https://github.com/hayatosc/hono-email/pull/53) [`1912f69`](https://github.com/hayatosc/hono-email/commit/1912f69a36c80e89aa4b2bc8ec25a4032e091346) Thanks [@hayatosc](https://github.com/hayatosc)! - Remove README.md symlinks in packages and replace them with dedicated READMEs pointing to the new documentation site. The root README.md is also reorganized to serve as a high-level overview.

### Patch Changes

- [#50](https://github.com/hayatosc/hono-email/pull/50) [`c3577c4`](https://github.com/hayatosc/hono-email/commit/c3577c4168de4e2c4492cb83c929d058831431ce) Thanks [@hayatosc](https://github.com/hayatosc)! - fix css-tree internal use as esm bundles

## 0.5.1

### Patch Changes

- [#45](https://github.com/hayatosc/hono-email/pull/45) [`abfbb08`](https://github.com/hayatosc/hono-email/commit/abfbb08a654d247279f96dec37c9d40fc96682ea) Thanks [@hayatosc](https://github.com/hayatosc)! - Rename the CLI and fix the binary, and stop shipping raw `.tsx` sources.
  - **Breaking:** the CLI is now `hono-email preview` (a `preview` subcommand of the `hono-email` bin) instead of the standalone `hono-email-preview` command. Update scripts to `npx hono-email preview --dir ./emails`.
  - Emit the `#!/usr/bin/env node` shebang from the CLI source so the published bin is executable, and replace the `import.meta.main` guard (only defined on Node 24.2+) with a `realpathSync`-based check that runs on all supported Node versions.
  - Pre-bundle the browser preview UI with Vite into `dist/client` instead of copying raw `.tsx` files. The published package now serves compiled assets, and template live-reload is delivered over a Server-Sent Events channel (`/__live`) rather than Vite's `import.meta.hot`, which is unavailable in the compiled client.

## 0.5.0

### Minor Changes

- [#37](https://github.com/hayatosc/hono-email/pull/37) [`513c9c6`](https://github.com/hayatosc/hono-email/commit/513c9c65f41438606b22e011cece756a54d35971) Thanks [@hayatosc](https://github.com/hayatosc)! - add changeset

- [#39](https://github.com/hayatosc/hono-email/pull/39) [`e21d6fb`](https://github.com/hayatosc/hono-email/commit/e21d6fbd9c959df6c5a974d7cb894b2cfaf70ec0) Thanks [@hayatosc](https://github.com/hayatosc)! - Add structured props editing to the preview form. `previewProps` now supports
  `multiline: true` to edit string props in a textarea, and `item` to describe the
  fields of an object array so each element is edited with add/remove controls
  instead of a single text box. Object arrays and multiline strings no longer break
  the rendered preview when edited.

### Patch Changes

- [#42](https://github.com/hayatosc/hono-email/pull/42) [`2490c16`](https://github.com/hayatosc/hono-email/commit/2490c1634b17cf0ef7c550342726985b9af5d6e0) Thanks [@hayatosc](https://github.com/hayatosc)! - Drive template hot-reload through Vite's Environment API module graph. Editing a shared component imported by a template (outside the templates directory) now refreshes the preview, which the previous `templateDir`-only file check missed.
