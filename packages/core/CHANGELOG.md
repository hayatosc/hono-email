# hono-email

## 0.10.0

### Minor Changes

- [#170](https://github.com/hayatosc/hono-email/pull/170) [`65514bc`](https://github.com/hayatosc/hono-email/commit/65514bcc1d2fa577990942971ff089b6721d20c8) Thanks [@hayatosc](https://github.com/hayatosc)! - Support `signal?: AbortSignal` and `retry?: RequestRetryOptions | boolean` in `EmailSendOptions` and `SendEmailOptions`, propagating across all built-in delivery adapters (`ResendAdapter`, `SendGridAdapter`, `PostmarkAdapter`, `MailgunAdapter`, `CloudflareEmailAdapter`, `SesAdapter`, `SmtpTransport`, and testing adapters). Includes immediate cancellation during retry sleep (`sleepWithSignal`), full jitter exponential backoff (`jitter: 'full'`), and capping `Retry-After` headers to `maxInterval`.

- [#173](https://github.com/hayatosc/hono-email/pull/173) [`4299688`](https://github.com/hayatosc/hono-email/commit/429968845884a7e878253ba6868e92dc0123a6fc) Thanks [@hayatosc](https://github.com/hayatosc)! - Support display-name formatted string addresses (`'Ada Lovelace <ada@example.com>'`, `'"Orders, Inc." <orders@example.com>'`) across adapters, prevent comma-injection attacks, and encode non-ASCII attachment filenames using RFC 2231 / RFC 5987 (`filename*` and `name*` parameters).

- [#154](https://github.com/hayatosc/hono-email/pull/154) [`77fefcc`](https://github.com/hayatosc/hono-email/commit/77fefcc546972e6c7e984154e3135da8f0ed038e) Thanks [@hayatosc](https://github.com/hayatosc)! - Add `hono-email/aws-ses` with an AWS SDK v3 SES adapter, rendering helpers, per-send configuration sets and tags, attachment support, and SDK error preservation. Keep the SDK optional for non-SES consumers and document a tested SQS-triggered Lambda worker with partial batch failure handling.

- [#174](https://github.com/hayatosc/hono-email/pull/174) [`92f634e`](https://github.com/hayatosc/hono-email/commit/92f634ed6d98aa77b646a82c78da150ba9bb6f66) Thanks [@hayatosc](https://github.com/hayatosc)! - Add `createMailer()` client to configure reusable default sender options (`adapter`, `from`, `replyTo`, `headers`, `render`, `retry`) and type-safe `defineMail()` for defining reusable mailables (`Mailable<TData>`). Includes `mailer.send()` with automatic mailable building or direct drafts, `mailer.render()` for preview and unit testing without delivery, and `isMailable()` runtime type guard.

- [#177](https://github.com/hayatosc/hono-email/pull/177) [`426a4eb`](https://github.com/hayatosc/hono-email/commit/426a4eb46d70eeccc679ebf99d691b75a2435a9b) Thanks [@hayatosc](https://github.com/hayatosc)! - Add delivery rules (`withDeliveryRules`) for staging interception and suppression filtering, `FallbackAdapter` for automatic failover across multiple adapters on transient errors, and RFC 8058 One-Click Unsubscribe options (`unsubscribe: { url, email }`).

- [#176](https://github.com/hayatosc/hono-email/pull/176) [`0cb0780`](https://github.com/hayatosc/hono-email/commit/0cb07809f99822384253fe2b04e497e1502ab080) Thanks [@hayatosc](https://github.com/hayatosc)! - Add email i18n support (`LocaleContext`, `LocaleProvider`, `useLocale()`, `createTranslator()`) with automatic `RenderOptions.locale` injection, and `inlineCidImagesAsDataUrls()` helper to convert inline `cid:...` attachment references into `data:...` URLs for browser previews.

- [#168](https://github.com/hayatosc/hono-email/pull/168) [`24b2802`](https://github.com/hayatosc/hono-email/commit/24b280292b183ad165c3fb1fe358112c12892c4a) Thanks [@hayatosc](https://github.com/hayatosc)! - Support `idempotencyKey` in `EmailMessage` and `EmailDraft`. For SMTP and raw MIME sends, `idempotencyKey` derives a deterministic RFC 5322 `Message-ID` when `messageId` is omitted. For `ResendAdapter`, `idempotencyKey` is forwarded via the `Idempotency-Key` HTTP header with Latin-1 character and length validation (up to 256 characters) for 24-hour deduplication.

- [#175](https://github.com/hayatosc/hono-email/pull/175) [`34fcd69`](https://github.com/hayatosc/hono-email/commit/34fcd6967154a8197a8acf128c225b1d0209ef88) Thanks [@hayatosc](https://github.com/hayatosc)! - Add observability and telemetry support with lifecycle event hooks (`onSent`, `onFailed`, `onEvent`) and automatic `node:diagnostics_channel` integration (`hono-email:sent`, `hono-email:failed`). Telemetry hooks report `durationMs`, `messageId`, `subject`, `recipients`, `permanent`, `receipt`, and `message` across both `sendEmail()` and `createMailer()`.

- [#172](https://github.com/hayatosc/hono-email/pull/172) [`1c81791`](https://github.com/hayatosc/hono-email/commit/1c817919883ccaf4fe5181ae070a03c4708713ed) Thanks [@hayatosc](https://github.com/hayatosc)! - Support XOAUTH2 authentication, connection pool `idleTimeout`, URL connection strings, custom TLS options (`ca`, `rejectUnauthorized`), Ed25519 DKIM signing (RFC 8463), and IDNA / SMTPUTF8 address handling in `SmtpTransport`.

- [#171](https://github.com/hayatosc/hono-email/pull/171) [`0567784`](https://github.com/hayatosc/hono-email/commit/05677849dd56eb8db782041eb494f016f2c10f01) Thanks [@hayatosc](https://github.com/hayatosc)! - Support `recipientRejectionPolicy?: SmtpRecipientRejectionPolicy` (`'deliver-accepted' | 'reject-all'`) in `SmtpTransportOptions` and `SmtpSendOptions`. When set to `'reject-all'`, the SMTP transport issues an `RSET` command and aborts delivery without sending `DATA` if any recipient is rejected during `RCPT TO`, returning a failed receipt with `category: 'recipients_rejected'` to prevent duplicate delivery upon retry.

- [#169](https://github.com/hayatosc/hono-email/pull/169) [`cf953d0`](https://github.com/hayatosc/hono-email/commit/cf953d04852cc8ef95444f57249295e46369640f) Thanks [@hayatosc](https://github.com/hayatosc)! - Add `hono-email/testing` entrypoint with `InMemoryAdapter`, `FileAdapter`, and `LogAdapter`:

  - `InMemoryAdapter`: Records sent emails in memory with `assertSent` and `assertNotSent` helpers, `mail.link()` (with HTML entity decoding and relative URL support), `mail.attachment()`, `failNext()`, and query filters.
  - `FileAdapter`: Writes sent emails as RFC 5322 `.eml` files to disk for local email client preview.
  - `LogAdapter`: Outputs formatted email delivery summaries and optional body contents to the console or a custom logger.

### Patch Changes

- [#178](https://github.com/hayatosc/hono-email/pull/178) [`31983df`](https://github.com/hayatosc/hono-email/commit/31983df18f376f809758689d0855fd65a7c7be09) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix issues in recently added features: Ed25519 DKIM now signs the SHA-256 hash of the header data as RFC 8463 requires; `SmtpTransport` returns a validation receipt instead of throwing for invalid addresses and no longer leaks a pooled connection when a queued send is aborted; `withDeliveryRules` applies suppression and intercept checks to SMTP envelope recipients; `FallbackAdapter` no longer lets errors thrown by `onFallback` break the fallback chain and stops falling back once the send is aborted; header maps (including generated `List-Unsubscribe` headers) merge case-insensitively; single-address parse errors are classified as validation errors; raw MIME messages whose visible `To` is empty but still have Cc, Bcc, or envelope recipients get `To: undisclosed-recipients:;`; and the preview server rejects non-string remote attachment sources and unsafe `contentType` values when inlining `cid:` images.

## 0.9.0

### Patch Changes

- [#142](https://github.com/hayatosc/hono-email/pull/142) [`3dbba17`](https://github.com/hayatosc/hono-email/commit/3dbba17c6e343aacf89e9b9d936d048529929538) Thanks [@hayatosc](https://github.com/hayatosc)! - Keep SMTP connector failures in failed delivery receipts even when their message matches a closed transport error, and document the built-in adapter error contract.

  Export `SmtpTransportClosedError` from `hono-email/smtp` and set its error name so consumers can identify closed-transport lifecycle rejections with `instanceof` and in logs.

- [#139](https://github.com/hayatosc/hono-email/pull/139) [`3767247`](https://github.com/hayatosc/hono-email/commit/3767247f3140a0bcf1970ce240f172070e2f8371) Thanks [@hayatosc](https://github.com/hayatosc)! - Use the shared source-preserving HTML tokenizer for preview relocation, widow prevention, and strict tag validation. Preserve quoted attributes, literal less-than signs, and raw text while retaining tag, URL, and CSS restrictions in Outlook conditional comments. Reject incomplete markup in strict validation instead of hiding restricted content, and keep existing attribute parsing behavior.

- [#137](https://github.com/hayatosc/hono-email/pull/137) [`8beeae6`](https://github.com/hayatosc/hono-email/commit/8beeae62dcfc55add5ca154a4f0d634c6b3a959b) Thanks [@hayatosc](https://github.com/hayatosc)! - Support nested Tailwind wrappers with explicit ownership by the nearest wrapper. Preserve inner artifacts' inline styles, original and renamed classes, head CSS, and dropped-class warnings without outer wrappers revalidating or reapplying processed HTML. Missing classes in each wrapper's own scope still reject rendering.

- [#139](https://github.com/hayatosc/hono-email/pull/139) [`1d1e757`](https://github.com/hayatosc/hono-email/commit/1d1e75703586184b7c0f77aa229a85340e450eef) Thanks [@hayatosc](https://github.com/hayatosc)! - Use the shared HTML tokenizer for plain-text conversion. Respect quoted attribute boundaries, exclude entire nested preview subtrees and unclosed comments or CSS/script content, and preserve literal text while retaining plain-text formatting options and Outlook comment handling.

- [#137](https://github.com/hayatosc/hono-email/pull/137) [`0aaff8f`](https://github.com/hayatosc/hono-email/commit/0aaff8f726746039f25cc4cc781e9faafc82dd8b) Thanks [@hayatosc](https://github.com/hayatosc)! - Reject synchronous and asynchronous JSX rendering failures instead of returning incomplete HTML, including missing Tailwind classes, errors inside Conditional, and rendering callback failures. Preserve the original thrown value and prevent failed drafts from reaching email adapters.

- [#138](https://github.com/hayatosc/hono-email/pull/138) [`c656100`](https://github.com/hayatosc/hono-email/commit/c6561008df0ef4685c0e878dc1e2ccab17590a96) Thanks [@hayatosc](https://github.com/hayatosc)! - Extract CSS artifact building and HTML inlining into shared internal modules. Tailwind keeps its existing artifact API and rendering behavior, while hono/css uses the generic helpers directly. Preserve CSS ordering, class renaming, warnings, and Markdown parent guards.

- [#142](https://github.com/hayatosc/hono-email/pull/142) [`7d116c0`](https://github.com/hayatosc/hono-email/commit/7d116c0f62d5540778336113362007f91f0c6570) Thanks [@hayatosc](https://github.com/hayatosc)! - Add SMTP-specific per-send DKIM configuration through `SmtpTransport.send(message, options)` and export `SmtpSendOptions` from `hono-email/smtp`. Per-send DKIM takes precedence over legacy `message.dkim` and transport defaults without changing later sends.

  Deprecate, but retain, `EmailMessage.dkim` for backward compatibility. Document migration to SMTP send options and clarify that HTTP provider adapters do not apply local DKIM settings; signing is configured with the provider.

- [#139](https://github.com/hayatosc/hono-email/pull/139) [`83af6ee`](https://github.com/hayatosc/hono-email/commit/83af6eecb61d6dc29216d0a62151bedc64bbd3c0) Thanks [@hayatosc](https://github.com/hayatosc)! - Add an internal source-preserving HTML tokenizer and use it in the shared transform walker. Preserve quoted attribute boundaries, literal less-than signs, unclosed comments, and raw text contexts while retaining existing skip-region behavior.

- [#146](https://github.com/hayatosc/hono-email/pull/146) [`7cf21e5`](https://github.com/hayatosc/hono-email/commit/7cf21e5cbb66a533e8f09e52c0bcf3d82821ba35) Thanks [@hayatosc](https://github.com/hayatosc)! - Require Hono 4.5 or newer, which provides the JSX server rendering entry point used by the core, and verify hono/css against the minimum, development, and latest Hono versions in CI.

- [#134](https://github.com/hayatosc/hono-email/pull/134) [`efa7223`](https://github.com/hayatosc/hono-email/commit/efa72234172c6e5c25b3e80dc8f9eef120f0e521) Thanks [@hayatosc](https://github.com/hayatosc)! - Replace non-null assertions in the widow-prevention transform and harden the Cloudflare Workers email connector to fail with a clear error when the workers payload is missing.

## 0.8.1

### Patch Changes

- [#127](https://github.com/hayatosc/hono-email/pull/127) [`0237e03`](https://github.com/hayatosc/hono-email/commit/0237e037a11175108fa58ed2ab80af2f60fa40ed) Thanks [@hayatosc](https://github.com/hayatosc)! - Validate Cloudflare adapter addresses consistently with other providers and report cc/bcc-only messages accurately.

- [#132](https://github.com/hayatosc/hono-email/pull/132) [`ec9fbb7`](https://github.com/hayatosc/hono-email/commit/ec9fbb747df8fecd3145f949dca0db65fd5951c9) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix strict CSS validation misreading selectors as declarations and prevent three-digit hex expansion from changing CSS id selectors.

- [#128](https://github.com/hayatosc/hono-email/pull/128) [`86d66f3`](https://github.com/hayatosc/hono-email/commit/86d66f371879f9ad4961de7460810c24281f80a9) Thanks [@hayatosc](https://github.com/hayatosc)! - Fix Tailwind inlining so group and peer marker classes render without missing-class errors, CSS rule order is preserved, explicit inline styles win, and warning markers cannot be forged by document content. Markdown element styles no longer override an element's own `style` attribute. Aliased `Tailwind` imports now receive build-time artifact injection.

- [#130](https://github.com/hayatosc/hono-email/pull/130) [`de2fe6c`](https://github.com/hayatosc/hono-email/commit/de2fe6c70511bcf628729a3ee8eaeac0877c7bb1) Thanks [@hayatosc](https://github.com/hayatosc)! - Keep generated MIME headers within RFC line limits, compute the correct DKIM hash for empty bodies, and reject oversized SMTP response buffers. Long custom or attachment header values that cannot be folded below the RFC line limit now fail clearly instead of producing malformed messages.

- [#133](https://github.com/hayatosc/hono-email/pull/133) [`3db0b21`](https://github.com/hayatosc/hono-email/commit/3db0b21a60e1f16ce375b882f0f8a99ec88438f9) Thanks [@hayatosc](https://github.com/hayatosc)! - Preserve whitespace-sensitive HTML in pretty output and retain URLs when converting links with single-quoted or unquoted `href` attributes to plain text.

## 0.8.0

### Patch Changes

- [#121](https://github.com/hayatosc/hono-email/pull/121) [`eabf5c6`](https://github.com/hayatosc/hono-email/commit/eabf5c6679095c9c67a1f6f0196feca0e71ccea0) Thanks [@hayatosc](https://github.com/hayatosc)! - fix(core): move Markdown dependencies to devDependencies to avoid leaking Node.js builtins

  The Markdown rendering pipeline (`unified`, `remark-*`, `rehype-*`) is fully bundled into `dist` at build time, so it does not need to be a runtime dependency. Previously declaring them as `dependencies` caused consumers to transitively install `micromark` → `debug`, which pulls in the Node.js builtins `tty` and `util` (`debug/src/node.js`). This tripped "Unexpected Node.js imports" checks and edge-runtime deployments even though the prebuilt output never referenced those builtins.

  Only `htmlrewriter` remains a runtime dependency because it is imported as an external module (and is runtime/platform agnostic: Node.js, browser, Cloudflare Workers, Deno, Bun). The Markdown deps are now `devDependencies`, so `npm i hono-email` no longer drags `debug`/`tty`/`util` into the consumer dependency graph.

## 0.7.0

### Minor Changes

- [#90](https://github.com/hayatosc/hono-email/pull/90) [`ef66d90`](https://github.com/hayatosc/hono-email/commit/ef66d9032974c5c444dd69b38b176da335014701) Thanks [@hayatosc](https://github.com/hayatosc)! - Support dynamic caniemail.com validation for HTML attributes and image formats in strict mode, and add `warningClients` configuration options.

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

- [#119](https://github.com/hayatosc/hono-email/pull/119) [`b8c999a`](https://github.com/hayatosc/hono-email/commit/b8c999a67e1939bcea6a53811ddf91f97cbae394) Thanks [@hayatosc](https://github.com/hayatosc)! - Migrate the codebase to TypeScript 7 (native compiler preview).
  - Add `isolatedDeclarations: true` and `declaration: true` to TSConfigs.
  - Add explicit type annotations to exported components, functions, and command definitions to satisfy isolated declarations requirements.
  - Downgrade TypeScript in `docs` package to `^6.0.3` to avoid Astro check crash on native TypeScript.

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
