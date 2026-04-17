# Spec: Hono JSX Email Renderer

## Assumptions
1. v1 の主目的は「送信」ではなく `hono/jsx` から HTML メールと plain text を生成すること。
2. コアパッケージの runtime dependency は原則最小に保つが、Tailwind と Markdown の実装に必要な依存は許容する。
3. API の中心は `await render(<Email />)` に置く。
4. React 互換よりも `hono/jsx` らしさを優先するが、`react-email` ユーザーが読んで理解しやすい component naming は採用する。
5. Tailwind と Markdown は v1 の実装対象に含め、core export として提供する。
6. `Font` は v1 の実装対象に含め、`react-email` 互換を意識した API を保ちつつ内部では `unifont` を使ってフォント定義を解決する。

## Objective
`hono/jsx` だけで HTML メールテンプレートを書き、メールクライアント互換性を考慮した HTML と plain text を生成できるライブラリを作る。

### Target User
- Hono ユーザー
- 特に Cloudflare Workers を含む Web Standard runtime を好むユーザー
- `react-email` から軽量な JSX ベースメールライブラリへ移行したいユーザー

### Success Criteria
- `await render(<Email />)` でメール向け HTML が生成できる
- `await renderWithWarnings(<Email />)` で HTML と warnings が取得できる
- `toPlainText(html)` で最低限読みやすい text が生成できる
- 危険または互換性の低い HTML タグや CSS を strict mode で検知できる
- `Html`, `Head`, `Body`, `Container`, `Section`, `Row`, `Column`, `Text`, `Heading`, `Button`, `Link`, `Img`, `Preview`, `Hr`, `Font`, `Tailwind`, `Markdown` を提供できる
- `Tailwind` が `config` を受け、主要 utility class をメール向け style と `<Head>` 内 CSS に変換できる
- `Markdown` が tables と safe な raw HTML を扱え、`markdownCustomStyles` と `markdownContainerStyles` を提供できる
- `Font` が `unifont` 経由で `@font-face` と fallback font stack を組み立て、`<Head>` 内の `<style>` として安全に出力できる

## Non-Goals
- 送信 API や特定プロバイダー統合
- CSS inlining の完全自動化
- Tailwind 完全互換
- Markdown 完全互換
- Outlook VML の自動生成
- すべてのメールクライアント差分の吸収
- フォントファイルの自前配信基盤やアセットホスティングの内包

## Tech Stack
- TypeScript
- `hono/jsx`
- `unifont`
- Node.js / Bun / Deno / Cloudflare Workers で動く Web Standard API 前提

## Commands
現時点では予定コマンド。

- Install: `ni`
- Dev: `nr dev`
- Build: `nr build`
- Test: `nr test`
- Typecheck: `nr typecheck`
- Lint: `nr lint`

## Project Structure
```text
docs/specs/                仕様書と実装計画
src/
  components/              メール向け primitives
  render/                  JSX -> HTML
  text/                    HTML -> plain text
  validate/                タグと CSS の検証
  normalize/               軽微なタグ変換
  index.ts                 公開 API
tests/
  render/                  HTML 出力テスト
  text/                    plain text 出力テスト
  validate/                strict mode の検証テスト
examples/
  basic/                   最小テンプレート例
```

## Public API
### Core
```ts
const html = await render(<Email />)
const prettyHtml = await renderPretty(<Email />)
const result = await renderWithWarnings(<Email />)
const warnings = result.warnings
const text = toPlainText(html)
```

### Render Options
```ts
type RenderOptions = {
  strict?: boolean
  doctype?: 'html5' | 'xhtml-transitional' | false
  pretty?: boolean
}
```

```ts
type RenderResult = {
  html: string
  warnings: string[]
}
```

### Components
- `Html`
- `Head`
- `Body`
- `Container`
- `Section`
- `Row`
- `Column`
- `Text`
- `Heading`
- `Button`
- `Link`
- `Img`
- `Preview`
- `Hr`
- `Font`
- `Tailwind`
- `Markdown`

### Font
`Font` は `react-email` の利用感を維持しつつ、内部では `unifont` の provider abstraction を使ってフォント情報を解決する。

初期 public API:
```ts
type FontProps = {
  fontFamily: string
  fallbackFontFamily: string | string[]
  fontStyle?: 'normal' | 'italic' | 'oblique'
  fontWeight?: string | number
  webFont?: {
    url: string
    format: 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg'
  }
  source?: {
    provider?: 'google' | 'bunny' | 'fontsource' | 'npm'
    weights?: string[]
    styles?: Array<'normal' | 'italic' | 'oblique'>
    subsets?: string[]
    formats?: Array<'woff2' | 'woff' | 'otf' | 'ttf' | 'eot'>
    providerOptions?: Record<string, unknown>
    familyOptions?: Record<string, unknown>
  }
}
```

設計方針:
- `Font` は `<Head>` 内で使う前提とする
- React Email 互換寄りに `webFont` を直接渡す経路も残す
- `source` 未指定時は `google` provider を既定候補にする
- `unifont` の memory cache を既定利用し、永続 cache は将来 option として検討する
- フォント解決に失敗しても fallback font stack のみで安全にレンダリングできることを優先する
- `throwOnError` のような provider 低レベル制御は v1 では内部に閉じ込める

## Code Style
### Principles
- JSX をそのまま書けることを最優先にする
- 互換性が怪しいものは暗黙補正しすぎず、strict mode で止める
- メールクライアント依存の workaround は validator と docs で説明し、v1 では魔法を増やしすぎない
- Web Standard 型を優先し、Node 固有 API に寄せない
- provider 個別実装を増やすより、既存の抽象化レイヤーで吸収できるものは依存側に寄せる

### Example
```tsx
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'hono-email'

export function WelcomeEmail(props: { url: string; name: string }) {
  return (
    <Html lang="ja">
      <Head />
      <Preview>{props.name}さんへのウェルカムメールです</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', color: '#1f2937' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
          <Heading>ようこそ</Heading>
          <Text>{props.name}さん、登録ありがとうございます。</Text>
          <Button href={props.url}>はじめる</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

## HTML Email Compatibility Baseline
このライブラリは Gmail の公式 CSS サポート情報と Caniemail の互換性データを前提に、v1 では保守的なレンダリング方針を取る。

### Design Policy
- デフォルトは `strict: true`
- 危険タグは error
- 意味論タグの一部は `div` に normalize
- CSS は「強く推奨する安全域」と「条件付きで許可するが warning を出す領域」に分ける
- error / warning には可能な限り代替手段を含める

### Tag Policy
#### Allowed as-is
- `html`
- `head`
- `meta`
- `title`
- `style`
- `body`
- `table`
- `thead`
- `tbody`
- `tfoot`
- `tr`
- `td`
- `th`
- `div`
- `span`
- `p`
- `a`
- `img`
- `br`
- `hr`
- `h1`-`h6`
- `ul`
- `ol`
- `li`
- `strong`
- `b`
- `em`
- `i`
- `u`
- `s`
- `small`
- `code`
- `pre`

補足:
- `style` は許可するが、strict mode では `Head` 内のみ
- `a` は strict mode で `href` 必須
- `img` は strict mode で `alt` 欠落時に warning

#### Normalize to `div`
- `main`
- `section`
- `article`
- `header`
- `footer`
- `nav`
- `aside`

理由:
- JSX では書きやすい
- ただしメールでは意味論より互換性が重要
- `body` 自体も一部クライアントでは `div` に置換されるため、上記の意味論タグに依存する価値が薄い

#### Disallow in strict mode
- `form`
- `input`
- `button`
- `select`
- `option`
- `textarea`
- `label`
- `video`
- `audio`
- `object`
- `embed`
- `iframe`
- `canvas`
- `svg`
- `math`
- `dialog`
- `template`
- `slot`
- `script`

理由:
- `form` は推定 51.22% で、クライアントによっては `<noform>` に変換されたり内容ごと消える
- `input type="text"` は推定 46.34% で挙動が不安定
- `button type="submit"` は推定 68.3% だがフォーム送信前提になりやすく、メールではリンク化が安全
- `video` は推定 24.39%、`audio` は推定 21.43%、`object` は推定 14.64%
- embedded SVG は推定 40.48%
- `script` と `iframe` はメールクライアント側で除去される前提として扱う

### CSS Policy
#### Tier 1: Safe by default
以下は v1 で積極的に許可する。

- `color`
- `background-color`
- `font-family`
- `font-size`
- `font-weight`
- `font-style`
- `line-height`
- `letter-spacing`
- `text-align`
- `text-decoration`
- `white-space`
- `word-break`
- `width`
- `max-width`
- `min-width`
- `height`
- `max-height`
- `min-height`
- `margin`
- `margin-top`
- `margin-right`
- `margin-bottom`
- `margin-left`
- `padding`
- `padding-top`
- `padding-right`
- `padding-bottom`
- `padding-left`
- `border`
- `border-color`
- `border-style`
- `border-width`
- `border-radius`
- `border-collapse`
- `border-spacing`
- `display`
- `vertical-align`
- `table-layout`
- `overflow`
- `opacity`

採用理由:
- Gmail 公式で広くサポートされる
- Caniemail でも `padding`, `margin`, `width`, `max-width` は強い
- `table` は 100% support なのでレイアウト primitives は最終的に table ベースに寄せやすい

#### Tier 2: Allow with warning
- `@media`
- `background-image`
- `background-size`
- `background-position`
- `background-repeat`
- `display:flex`
- `position`

warning の理由:
- `@media` は推定 80.48% だが nested media query 非対応などの制約がある
- `background-image` は推定 90.69% だが Gmail で `url()` を含む style が削除される既知問題がある
- `display:flex` は推定 82.93% だが Gmail の non-Google account で非対応、`inline-flex` も非対応
- `position` は推定 80.49% だが実運用では Outlook 差分が大きい

#### Tier 3: Disallow in strict mode
- `display:grid`
- `display:inline-flex`
- 論理プロパティ
  - `margin-inline`
  - `margin-block`
  - `padding-inline`
  - `padding-block`
  - `border-inline`
  - `border-block`
- `hidden` 属性依存の制御
- `color-scheme` meta 依存の制御

理由:
- `display:grid` は推定 56.1% と弱い
- logical properties は 30%〜50%台で互換性が低い
- `hidden` 属性は推定 26.83%
- `color-scheme` meta は推定 4.88%

### Output Rules
- 既定 doctype は `<!DOCTYPE html>`
- `lang` と `dir` は `Html` component で設定可能
- `Preview` component は preheader 用の非表示テキストを出力する
- `Preview` は最終出力で `body` 直下へ寄せる
- `style` タグは `Head` 内のみ正式対応し、それ以外では strict mode error
- `body` に依存しすぎない。body が `div` に置換されても崩れにくい出力を目指す

## Tailwind Rules
- `Tailwind` component は React Email の Tailwind component に近い mental model を持つ
- `config` prop で Tailwind config を受ける
- 初期実装では class は最終的な HTML 要素に対してのみ解決する
- 主要 utility class は inline style へ落とす
- media query など inline 化できない CSS は `<style>` として生成し、最終的に `<Head>` へ寄せる
- `prose`, 複雑 selector, `space-*`, component 自体への class 解決は初期非対応とする
- 変換後の CSS / style は既存 validator を通す

## Markdown Rules
- `Markdown` component は markdown string を受ける
- markdown から生成された HTML は sanitize と validator を通す
- safe な raw HTML は許可し、unsafe な raw HTML は除去または error にする
- table, list, heading, code, quote, link, image は初期対応する
- `markdownContainerStyles` は外側コンテナ要素へ適用する
- `markdownCustomStyles` は要素ごとの default style override に使う
- custom style も既存 validator を通す
- Markdown 出力の最終 HTML はメール向け safe subset に正規化する

## Font Rules
- `Font` component は `@font-face` と global font-family 指定を `<style>` で出力する
- フォント定義の解決には `unifont` を使う
- v1 の既定 provider は `google` とし、将来拡張で `fontsource`, `npm`, `bunny` を扱える形にする
- `resolveFont()` で得た format, style, weight, subset 情報から必要最小限の CSS を生成する
- メール互換性の観点から、重要情報は custom web font 非依存でも読める fallback を必須にする
- remote font が利用できない環境でも崩れないよう、失敗時は warning を残しつつ fallback stack を優先する

## Testing Strategy
- HTML assertion テストを主軸にする
- plain text 出力テストを行う
- strict mode の error / warning テストを行う
- normalize 対象タグの変換テストを行う
- snapshot 依存は最小限にする

## Boundaries
- Always:
  - `strict: true` 前提で設計する
  - メール互換性の理由を docs に書く
  - 追加 dependency が必要な場合は役割を docs に書く
- Ask first:
  - external dependency の追加
  - VML 自動生成
- Never:
  - 送信プロバイダー統合を core に混ぜる
  - `react` を dependency に入れる
  - 危険タグを無言で通す

## Sources
- Hono JSX docs: https://hono.dev/docs/guides/jsx
- React Email Tailwind docs: https://react.email/docs/components/tailwind
- React Email Markdown docs: https://react.email/docs/components/markdown
- React Email Font docs: https://react.email/docs/components/font
- Gmail CSS Support: https://developers.google.com/workspace/gmail/design/css
- Unifont README: https://github.com/unjs/unifont/blob/81b82f7604aedcda48c62aa5dc380cede5eec332/README.md
- Caniemail `<table>`: https://www.caniemail.com/features/html-table/
- Caniemail `<style>`: https://www.caniemail.com/features/html-style/
- Caniemail `<body>`: https://www.caniemail.com/features/html-body/
- Caniemail `<form>`: https://www.caniemail.com/features/html-form/
- Caniemail `<input type="text">`: https://www.caniemail.com/features/html-input-text/
- Caniemail `<button type="submit">`: https://www.caniemail.com/features/html-button-submit/
- Caniemail embedded SVG: https://www.caniemail.com/features/html-svg
- Caniemail `<video>`: https://www.caniemail.com/features/html-video/
- Caniemail `<audio>`: https://www.caniemail.com/features/html-audio/
- Caniemail `<object>`: https://www.caniemail.com/features/html-object/
- Caniemail `padding`: https://www.caniemail.com/features/css-padding/
- Caniemail `margin`: https://www.caniemail.com/features/css-margin/
- Caniemail `width`: https://www.caniemail.com/features/css-width/
- Caniemail `max-width`: https://www.caniemail.com/features/css-max-width/
- Caniemail `border-radius`: https://www.caniemail.com/features/css-border-radius/
- Caniemail `@media`: https://www.caniemail.com/features/css-at-media/
- Caniemail `background-image`: https://www.caniemail.com/features/css-background-image/
- Caniemail `display:flex`: https://www.caniemail.com/features/css-display-flex/
- Caniemail `display:grid`: https://www.caniemail.com/features/css-display-grid/
- Caniemail `position`: https://www.caniemail.com/features/css-position/
- Caniemail `hidden`: https://www.caniemail.com/features/html-hidden/
- Caniemail `color-scheme meta`: https://www.caniemail.com/features/html-meta-color-scheme/
