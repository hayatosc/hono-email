# @hono-email/tailwind-plugin

## 0.8.2

## 0.8.1

### Patch Changes

- [#128](https://github.com/hayatosc/hono-email/pull/128) [`86d66f3`](https://github.com/hayatosc/hono-email/commit/86d66f371879f9ad4961de7460810c24281f80a9) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix Tailwind inlining so group and peer marker classes render without missing-class errors, CSS rule order is preserved, explicit inline styles win, and warning markers cannot be forged by document content. Markdown element styles no longer override an element's own `style` attribute. Aliased `Tailwind` imports now receive build-time artifact injection.

- [#125](https://github.com/hayatosc/hono-email/pull/125) [`2137954`](https://github.com/hayatosc/hono-email/commit/2137954903bd40977247088d6855104c4b473f9a) Thanks [@hayatosc](https://github.com/hayatosc)! - Update runtime dependencies to pick up security fixes. `@hono/node-server` moves to v2 (fixes the `serve-static` path traversal advisory GHSA-frvp-7c67-39w9), Vite moves to v8, `citty` to 0.2, and `unplugin` to 3.3. `PreviewServerOptions.host` and `.file` now accept an explicit `undefined`.

## 0.8.0

## 0.7.0

### Patch Changes

- [#119](https://github.com/hayatosc/hono-email/pull/119) [`b8c999a`](https://github.com/hayatosc/hono-email/commit/b8c999a67e1939bcea6a53811ddf91f97cbae394) Thanks [@hayatosc](https://github.com/hayatosc)! - Migrate the codebase to TypeScript 7 (native compiler preview).
  - Add `isolatedDeclarations: true` and `declaration: true` to TSConfigs.
  - Add explicit type annotations to exported components, functions, and command definitions to satisfy isolated declarations requirements.
  - Downgrade TypeScript in `docs` package to `^6.0.3` to avoid Astro check crash on native TypeScript.

## 0.6.2

### Patch Changes

- [#113](https://github.com/hayatosc/hono-email/pull/113) [`ebd6c61`](https://github.com/hayatosc/hono-email/commit/ebd6c61d7181491f3310621dff50027599f6751a) Thanks [@hayatosc](https://github.com/hayatosc)! - fix incomplete sanitization (backslash and double quotes escaping) for `@config` and `@source` paths in the CSS module builder

## 0.6.1

### Patch Changes

- [#97](https://github.com/hayatosc/hono-email/pull/97) [`0643326`](https://github.com/hayatosc/hono-email/commit/0643326cc9151f0b400fd1da7cca7a2700a255bc) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: multiple regex and error handling issues in tailwind-plugin

## 0.6.0

### Minor Changes

- [#53](https://github.com/hayatosc/hono-email/pull/53) [`1912f69`](https://github.com/hayatosc/hono-email/commit/1912f69a36c80e89aa4b2bc8ec25a4032e091346) Thanks [@hayatosc](https://github.com/hayatosc)! - Remove README.md symlinks in packages and replace them with dedicated READMEs pointing to the new documentation site. The root README.md is also reorganized to serve as a high-level overview.

### Patch Changes

- [#50](https://github.com/hayatosc/hono-email/pull/50) [`c3577c4`](https://github.com/hayatosc/hono-email/commit/c3577c4168de4e2c4492cb83c929d058831431ce) Thanks [@hayatosc](https://github.com/hayatosc)! - fix css-tree internal use as esm bundles

## 0.5.1

## 0.5.0

### Minor Changes

- [#37](https://github.com/hayatosc/hono-email/pull/37) [`513c9c6`](https://github.com/hayatosc/hono-email/commit/513c9c65f41438606b22e011cece756a54d35971) Thanks [@hayatosc](https://github.com/hayatosc)! - add changeset
