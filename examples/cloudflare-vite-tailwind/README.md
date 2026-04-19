# Cloudflare + Vite + Hono + Tailwind Example

`hono-email/vite` を使って、`<Tailwind>` の artifact 注入を build-time に自動化する実行可能 example です。

## Commands

repo root で実行します。

```sh
ni
nr dev:example:cloudflare
```

ビルドとプレビュー:

```sh
nr build:example:cloudflare
nr preview:example:cloudflare
```

Cloudflare Workers へ deploy:

```sh
nr deploy:example:cloudflare
```

## Routes

- `GET /`
  - example の説明ページ
- `GET /emails/welcome`
  - welcome email の HTML preview
- `POST /api/emails/welcome/send`
  - Cloudflare Email binding が設定されていれば送信

preview 例:

```sh
curl "http://127.0.0.1:5173/emails/welcome?user=Taro&dashboard=https://example.com/app"
```

send 例:

```sh
curl -X POST "http://127.0.0.1:5173/api/emails/welcome/send" \
  -H "content-type: application/json" \
  -d '{"userName":"Taro","dashboardUrl":"https://example.com/app","to":"recipient@example.com"}'
```

## Optional Email Binding

`/api/emails/welcome/send` を使う場合だけ `wrangler.jsonc` の `send_email` と `vars` を設定します。

```jsonc
{
  "send_email": [{ "name": "EMAIL", "destination_address": "recipient@example.com" }],
  "vars": {
    "EMAIL_FROM": "welcome@example.com"
  }
}
```
