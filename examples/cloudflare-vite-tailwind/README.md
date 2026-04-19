# Cloudflare + Vite + Hono + Tailwind Example

`hono-email/vite` を使って、`<Tailwind>` の artifact 注入を build-time に自動化する実行可能 example です。
この example 自体に独立した `package.json` を置き、通常の Tailwind で作った composer page から preview / send まで確認できます。

## Commands

example directory で実行します。

```sh
cd examples/cloudflare-vite-tailwind
ni
nr dev
```

ビルドとプレビュー:

```sh
nr build
nr preview
```

Cloudflare Workers へ deploy:

```sh
nr deploy
```

## Routes

- `GET /`
  - 通常の Tailwind で作った welcome email composer page
- `GET /emails/welcome`
  - welcome email の HTML preview
- `POST /api/emails/welcome/preview`
  - composer が使う preview API
- `POST /api/emails/welcome/send`
  - preview と同じ payload で Cloudflare Email binding 経由の送信

preview 例:

```sh
curl "http://127.0.0.1:5173/emails/welcome?headline=セットアップ完了&ctaUrl=https://example.com/app"
```

preview API 例:

```sh
curl -X POST "http://127.0.0.1:5173/api/emails/welcome/preview" \
  -H "content-type: application/json" \
  -d '{"subject":"セットアップのご案内","headline":"アカウントの準備が完了しました","ctaUrl":"https://example.com/app"}'
```

send 例:

```sh
curl -X POST "http://127.0.0.1:5173/api/emails/welcome/send" \
  -H "content-type: application/json" \
  -d '{"to":"recipient@example.com","subject":"セットアップのご案内","headline":"アカウントの準備が完了しました","ctaUrl":"https://example.com/app"}'
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
