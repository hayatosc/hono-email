# hono-email

## 0.6.2

### Patch Changes

- [#110](https://github.com/hayatosc/hono-email/pull/110) [`517b9a6`](https://github.com/hayatosc/hono-email/commit/517b9a6b81413b2e575220e8a36085b25853eda8) Thanks [@hayatosc](https://github.com/hayatosc)! - bundle css-tree ESM dist to eliminate nodejs_compat requirement on Cloudflare Workers

## 0.6.1

### Patch Changes

- [#96](https://github.com/hayatosc/hono-email/pull/96) [`7787799`](https://github.com/hayatosc/hono-email/commit/778779901f9e8614aafeba64c1399581f8641b5c) Thanks [@hayatosc](https://github.com/hayatosc)! - refactor: extract shared utilities to adapter/utils.ts

- [#102](https://github.com/hayatosc/hono-email/pull/102) [`9de37f3`](https://github.com/hayatosc/hono-email/commit/9de37f39e05575783c10409eaac60d6d1d4b5462) Thanks [@hayatosc](https://github.com/hayatosc)! - test: add Preview component nested JSX test

- [#93](https://github.com/hayatosc/hono-email/pull/93) [`319fd93`](https://github.com/hayatosc/hono-email/commit/319fd93c665238bec10e92711536f77390c7c19d) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: move runtime dependencies from devDependencies to dependencies

- [#109](https://github.com/hayatosc/hono-email/pull/109) [`12cd84a`](https://github.com/hayatosc/hono-email/commit/12cd84a79f7262f8dc1bf08296b6fdadfe396c8e) Thanks [@hayatosc](https://github.com/hayatosc)! - perf(cloudflare): build only the payload requested by the connector kind

- [#101](https://github.com/hayatosc/hono-email/pull/101) [`fef5c4b`](https://github.com/hayatosc/hono-email/commit/fef5c4b3d7c50bb0df650cef6a40f2176d7c3851) Thanks [@hayatosc](https://github.com/hayatosc)! - docs: add security warning for markdown sanitize: false option

- [#108](https://github.com/hayatosc/hono-email/pull/108) [`c08f1b0`](https://github.com/hayatosc/hono-email/commit/c08f1b0a0e84da5bf296a4443b10b1ed92fb27ca) Thanks [@hayatosc](https://github.com/hayatosc)! - feat: introduce LinkButton and deprecate Button alias

- [#108](https://github.com/hayatosc/hono-email/pull/108) [`377ba3c`](https://github.com/hayatosc/hono-email/commit/377ba3c834f48b9d9f8d78ff6087d20d31c4ecb5) Thanks [@hayatosc](https://github.com/hayatosc)! - ci: run Node runtime tests with tsx

- [#99](https://github.com/hayatosc/hono-email/pull/99) [`350078f`](https://github.com/hayatosc/hono-email/commit/350078f60f46b21250e9604269104189cd79572c) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: improve SMTP security and error handling

- [#100](https://github.com/hayatosc/hono-email/pull/100) [`95c305d`](https://github.com/hayatosc/hono-email/commit/95c305d8e5c1f766c18007633661a01fed34a6a7) Thanks [@hayatosc](https://github.com/hayatosc)! - fix: core rendering improvements for preview text, CSS escaping, and pretty print

## 0.6.0

### Minor Changes

- [#53](https://github.com/hayatosc/hono-email/pull/53) [`1912f69`](https://github.com/hayatosc/hono-email/commit/1912f69a36c80e89aa4b2bc8ec25a4032e091346) Thanks [@hayatosc](https://github.com/hayatosc)! - Remove README.md symlinks in packages and replace them with dedicated READMEs pointing to the new documentation site. The root README.md is also reorganized to serve as a high-level overview.

### Patch Changes

- [#50](https://github.com/hayatosc/hono-email/pull/50) [`c3577c4`](https://github.com/hayatosc/hono-email/commit/c3577c4168de4e2c4492cb83c929d058831431ce) Thanks [@hayatosc](https://github.com/hayatosc)! - fix css-tree internal use as esm bundles

## 0.5.1

### Patch Changes

- [#47](https://github.com/hayatosc/hono-email/pull/47) [`b7d154d`](https://github.com/hayatosc/hono-email/commit/b7d154d02df0fd6df164179465078c18d184e871) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix Resend adapter sending `contentId` (camelCase) instead of `content_id` (snake_case) in attachment payloads.

  The Resend API requires `content_id` and `content_type` (snake_case) in attachment objects, matching the shape documented in [resend-openapi](https://github.com/resend/resend-openapi) and the official Node SDK. The previous camelCase field was silently ignored by the API, causing inline image embedding via `cid:` references to silently fail.
  - **Fix:** attachment `contentId` is now correctly sent as `content_id`
  - **Fix:** attachment MIME type is now sent as `content_type` (previously omitted)
  - **Fix:** `ResendErrorResponse.type` removed — the Resend API only returns `name`, not `type`

## 0.5.0

### Minor Changes

- [#37](https://github.com/hayatosc/hono-email/pull/37) [`513c9c6`](https://github.com/hayatosc/hono-email/commit/513c9c65f41438606b22e011cece756a54d35971) Thanks [@hayatosc](https://github.com/hayatosc)! - add changeset
