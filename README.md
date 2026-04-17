# hono-email

`hono/jsx` から HTML メールと plain text を生成するための小さなライブラリです。v1 は render 専用で、送信プロバイダー統合は含みません。

## Status
- Bun で開発
- 中心 API は `await render(<Email />)`
- strict mode は既定で有効
- `Tailwind` と `Markdown` を core export として提供
- `Font` は `unifont` を使ったフォント解決をサポート

## Install
```sh
ni
```

## Basic Usage
```tsx
import { Body, Button, Container, Font, Head, Heading, Html, Preview, Text, render, toPlainText } from 'hono-email'

function WelcomeEmail() {
  return (
    <Html lang='ja'>
      <Head>
        <title>Welcome</title>
        <Font fallbackFontFamily='Arial' fontFamily='Poppins' source={{ subsets: ['latin'], weights: ['400'] }} />
      </Head>
      <Preview>アカウント登録が完了しました。</Preview>
      <Body>
        <Container>
          <Heading as='h1'>ようこそ</Heading>
          <Text>登録ありがとうございます。</Text>
          <Button href='https://example.com/start'>はじめる</Button>
        </Container>
      </Body>
    </Html>
  )
}

const html = await render(<WelcomeEmail />)
const text = toPlainText(html)
```

## Output APIs
```tsx
const html = await render(<WelcomeEmail />)
const prettyHtml = await renderPretty(<WelcomeEmail />)

const result = await renderWithWarnings(<WelcomeEmail />)
result.html
result.warnings
```

- `render()`
  - string を返す標準 API
- `renderPretty()`
  - 改行とインデントを入れた HTML を返す
- `renderWithWarnings()`
  - `{ html, warnings }` を返す
  - Tier 2 の CSS を警告として受け取りたい場合に使う

## Strict Mode
`render()` は既定で `strict: true` です。HTML メールで互換性が低い要素を silent に通しません。

```tsx
await render(
  <Html>
    <Body>
      <div style={{ display: 'grid' }}>Hello</div>
    </Body>
  </Html>
)
// throws: The CSS property 'display:grid' isn't supported in HTML email strict mode.
```

現在の strict mode では主に以下を制御します。

- 禁止タグ
  - `form`, `input`, `button`
    - 代わりに `<Button href="...">` や `<Link href="...">` を使う
  - `video`, `audio`, `iframe`, `object`, `svg`
    - 代わりに `<Img>` とリンクを使う
  - `script`
    - 代わりに事前にレンダリング済みの HTML とリンクを使う
- normalize 対象
  - `main`, `section`, `article`, `header`, `footer`, `nav`, `aside` は `div` に変換
- 必須属性チェック
  - `<a>` に `href` がない場合は error
    - 代わりに `<Link href="...">` や `<Button href="...">` を使う
  - `<img>` に `alt` がない場合は warning
    - 意味のある画像には説明文、装飾画像には `alt=""` を付ける
- 禁止 CSS
  - `display:grid`
    - 代わりに `<Section>`, `<Row>`, `<Column>` や table ベースレイアウトを使う
  - logical properties
    - `padding-inline`
    - `margin-inline`
    - `border-inline`
    - `padding-block`
    - `margin-block`
    - `border-block`
    - 代わりに `padding-left`, `padding-right`, `margin-top`, `margin-bottom` などの physical properties を使う

Tier 2 の CSS は error ではなく warning として返します。

- warning 対象の例
  - `display:flex`
    - 重要なレイアウトでは table ベースへ落とす
  - `position`
    - 位置調整より自然な flow と spacing を優先する
  - `background-image`
    - 重要な情報は `<Img>` か単色背景へ寄せる
  - `@media`
    - media query なしでも読めるベースレイアウトを維持する

## Provided Components
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

補足:
- `Button` と `Link` は既定で `target="_blank"` を付けます
- `Text` は `font-size: 14px`, `line-height: 24px`, 上下 `16px` margin を既定で持ちます
- `Hr` は `border-top: 1px solid #eaeaea` の既定 divider style を持ちます
- `Heading` は `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml` の margin shorthand を受けます

## Font
`Font` は `<Head>` 内で使い、`unifont` 経由で `@font-face` を組み立てます。

```tsx
import { Font, Head, Html, render } from 'hono-email'

const html = await render(
  <Html>
    <Head>
      <Font
        fallbackFontFamily={['Arial', 'sans-serif']}
        fontFamily='Poppins'
        source={{
          provider: 'google',
          subsets: ['latin'],
          weights: ['400', '600'],
        }}
      />
    </Head>
  </Html>
)
```

React Email 互換寄りに `webFont` を直接渡すこともできます。

```tsx
<Font
  fallbackFontFamily='Arial'
  fontFamily='Inter'
  webFont={{ url: 'https://example.com/inter.woff2', format: 'woff2' }}
/>
```

## Tailwind
React Email の `Tailwind` component に近い使い方で、主要 utility class をメール向け style に変換します。

```tsx
import { Body, Head, Html, Tailwind, Text, pixelBasedPreset, renderWithWarnings } from 'hono-email'

const result = await renderWithWarnings(
  <Html>
    <Head />
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: {
              brand: '#0f172a',
            },
          },
        },
      }}
    >
      <Body>
        <Text className='text-brand bg-brand px-4 py-2 sm:text-blue-500'>Hello</Text>
      </Body>
    </Tailwind>
  </Html>
)
```

現在の Tailwind 対応は intentionally limited です。

- base utility は inline style に落とします
- responsive utility は `<Head>` 内の `<style>` に寄せます
- `pixelBasedPreset` を export し、React Email に近い `fontSize` / `spacing` スケールを使えます
- `config.theme.extend.colors` / `spacing` / `screens` / `fontFamily` / `fontSize` を扱います
- 現在の主な対応 utility:
  - spacing: `p-*`, `px-*`, `py-*`, `pt-*`, `pr-*`, `pb-*`, `pl-*`, `m-*`, `mx-*`, `my-*`, `mt-*`, `mr-*`, `mb-*`, `ml-*`
  - typography: `text-*` color and size, `leading-*`, `tracking-*`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-sans`, `font-serif`, `font-mono`, `italic`, `not-italic`, `underline`, `no-underline`, `uppercase`, `lowercase`, `capitalize`, `text-left`, `text-center`, `text-right`
  - box: `w-*`, `h-*`, `min-w-*`, `min-h-*`, `max-w-*`, `max-h-*`, `rounded*`, `border*`, `bg-*`, `bg-transparent`, `block`, `inline`, `inline-block`, `hidden`
- `prose`, 複雑 selector, `space-*`, component 自体への class 解決は初期非対応です

## Markdown
`Markdown` は Markdown 文字列をメール向け HTML に変換します。table と safe raw HTML を扱い、unsafe raw HTML は sanitize で除去します。

```tsx
import { Body, Head, Html, Markdown, render } from 'hono-email'

const html = await render(
  <Html>
    <Head />
    <Body>
      <Markdown
        markdownContainerStyles={{ padding: '12px', border: '1px solid #111827' }}
        markdownCustomStyles={{
          h1: { color: '#dc2626' },
          codeInline: { backgroundColor: '#e5e7eb', padding: '2px 4px' },
        }}
      >{`
# Hello

| Name | Role |
| --- | --- |
| Taro | Builder |

<div><a href="https://example.com">Safe raw link</a></div>
      `}</Markdown>
    </Body>
  </Html>
)
```

`Markdown` は次を前提にしています。

- raw HTML は sanitize と validator を通します
- safe な `table`, `a`, `img`, `div`, `span` などは残します
- `script` など unsafe なタグは削除されます
- `markdownContainerStyles` は外側コンテナへ適用します
- `markdownCustomStyles` は `h1`, `p`, `table`, `codeInline` など要素ごとの style override に使います

## Examples
- [examples/basic/minimal.tsx](./examples/basic/minimal.tsx)
- [examples/basic/welcome.tsx](./examples/basic/welcome.tsx)
- [examples/basic/tailwind.tsx](./examples/basic/tailwind.tsx)
- [examples/basic/markdown.tsx](./examples/basic/markdown.tsx)

## Non-Goals for v1
- 送信プロバイダー統合
- CSS inlining
- Outlook VML 自動生成

## Development
```sh
nr test
nr typecheck
nr build
```

## Docs
- [Spec](./docs/specs/email-renderer-spec.md)
- [Plan](./docs/specs/email-renderer-plan.md)
