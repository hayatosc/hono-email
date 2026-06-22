# hono-email

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
