# @hono-email/preview

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
