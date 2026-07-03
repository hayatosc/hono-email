# @hono-email/preview

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
