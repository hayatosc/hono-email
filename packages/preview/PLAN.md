# @hono-email/preview 実装プラン

## 概要

スタンドアロン CLI ツール。ローカルサーバーを立ち上げ、ブラウザ上でメールテンプレートのプレビューと props のリアルタイム編集を行えるようにする。

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│  CLI (npx hono-email-preview)               │
│                                             │
│  ┌─────────┐   ┌────────────────────────┐   │
│  │ Vite    │   │ Preview Server (Hono)  │   │
│  │ Dev     │   │                        │   │
│  │ Server  │   │  GET  /           → UI  │   │
│  │         │   │  GET  /api/templates   │   │
│  │ + TW    │   │  GET  /api/templates/:n│   │
│  │ plugin  │   │  POST /api/render/:n   │   │
│  └────┬────┘   └──────────┬─────────────┘   │
│       │                   │                  │
│       │    ┌──────────────┘                  │
│       │    │                                │
│  ┌────▼────▼─┐                              │
│  │ Renderer   │  render() + renderProps()   │
│  │ Pipeline   │  → { html, text }            │
│  └────────────┘                              │
└─────────────────────────────────────────────┘

ブラウザ側:
  ┌──────────────────────────────────────┐
  │  Preview UI                          │
  │  ┌────────────┐ ┌─────────────────┐ │
  │  │ Template   │ │  Preview Panel  │ │
  │  │ List       │ │  ┌───────────┐  │ │
  │  │            │ │  │ HTML      │  │ │
  │  │            │ │  │ (iframe)  │  │ │
  │  │            │ │  └───────────┘  │ │
  │  │            │ │  ┌───────────┐  │ │
  │  │            │ │  │ Plain Text│  │ │
  │  │            │ │  └───────────┘  │ │
  │  ├────────────┤ ├─────────────────┤ │
  │  │ Props Form │ │  Raw JSON Edit │ │
  │  │ (auto-gen) │ │  (fallback)    │ │
  │  └────────────┘ └─────────────────┘ │
  └──────────────────────────────────────┘
```

## パッケージ構成

```
packages/preview/
├── package.json          # @hono-email/preview
├── tsconfig.json
├── tsdown.config.ts
└── src/
    ├── index.ts          # エクスポート
    ├── cli.ts            # CLI エントリポイント (bin)
    ├── server/
    │   ├── index.ts      # Hono サーバーセットアップ
    │   ├── routes.ts     # API ルート定義
    │   └── renderer.ts   # render() の呼び出し・Tailwind 連携
    ├── discovery/
    │   └── index.ts      # テンプレートファイルの探索・モジュール読み込み
    ├── props/
    │   └── index.ts      # 型→フォームスキーマ変換
    └── client/
        ├── index.html    # プレビュー UI
        ├── app.tsx       # メイン UI コンポーネント
        ├── components/
        │   ├── TemplateList.tsx
        │   ├── PreviewPanel.tsx
        │   ├── PropsForm.tsx
        │   └── JsonEditor.tsx
        └── styles.css
```

## 実装ステップ

### Phase 0: スキャフォールド (v0.1 MVP)

1. `packages/preview/` パッケージ作成
2. `package.json` 設定 (bin: "hono-email-preview", deps: hono, vite, etc.)
3. `tsdown.config.ts` 設定
4. monorepo workspace 追加

### Phase 1: テンプレート探索 & レンダリング

5. **CLI エントリポイント** (`cli.ts`):
   - `commander` or `citty` で CLI 解析
   - オプション: `--dir` (テンプレートディレクトリ, デフォルト `./emails`), `--port` (デフォルト 3000)
   - テンプレート探索: `--dir` から `.tsx` ファイルを glob で検索
   - Vite サーバーを内部で起動 (SSR モード)

6. **テンプレート探索** (`discovery/index.ts`):
   - ディレクトリ内の `.tsx` ファイルを収集
   - 各ファイルの default export を Vite SSR import で動的ロード
   - コンポーネントの props 型を TypeScript compiler API で抽出 (初期 MVP では JSON fallback でも可)

7. **レンダリング** (`server/renderer.ts`):
   - Vite SSR でコンポーネントを import → `render(component, props)` を呼び出し
   - Tailwind は Vite plugin として `@hono-email/tailwind-plugin` を自動注入
   - 結果 `{ html, text }` を返す

### Phase 2: プレビューサーバー

8. **Hono サーバー** (`server/index.ts`):
   - `GET /` → プレビュー UI (SPA)
   - `GET /api/templates` → テンプレート一覧 (名前, ファイルパス)
   - `GET /api/templates/:name/props` → props スキーマ
   - `POST /api/templates/:name/render` → `{ html, text, warnings }`
   - WebSocket → テンプレート変更時の自動リロード通知

9. **Vite 統合**:
   - 内部で Vite dev server を `middlewareMode` で起動
   - `@hono-email/tailwind-plugin` を自動設定
   - HMR: テンプレート変更を検知 → WebSocket で UI に通知 → 再レンダリング

### Phase 3: プレビュー UI

10. **UI 基盤**:
    - Vite でビルドする SPA (React + hono/jsx ではなく、プレーンな React または Preact で非常に軽量に)
    - または Hono SSR でサーバー側レンダリング (クライアント JS 最小限)

11. **テンプレート一覧パネル**:
    - ディレクトリ内の .tsx ファイル一覧を表示
    - クリックでプレビュー切り替え

12. **プレビューパネル**:
    - HTML を iframe で表示
    - プレーンテキストをタブで切り替え表示
    - レスポンシブプレビュー (desktop/mobile width toggle)

13. **Props フォーム**:
    - スキーマから自動生成: string → text input, number → number input, boolean → checkbox, select → radio/dropdown
    - ネストされたオブジェクト → fieldset
    - Raw JSON 編集モード (フォールバック)
    - 変更 → debounce → API 呼び出し → プレビュー更新

### Phase 4: Tailwind 自動連携 ✅

14. **Tailwind 自動検出** ✅:
    - `tailwind.config.*` または `postcss.config.*` の有無で判定
    - 存在すれば `@hono-email/tailwind-plugin` の Vite plugin を自動注入
    - 存在しない場合は Tailwind なしで動作

15. **Tailwind plugin 連携** ✅:
    - Vite dev server 起動時に plugin を動的追加 (dynamic import)
    - `runtimeModuleSpecifier: 'hono-email'` を設定
    - HMR 時の再ビルドを正しくハンドリング

## 命名規則 & テンプレート規約

テンプレートファイルの規約:

```
emails/
├── welcome.tsx       → WelcomeEmail
├── password-reset.tsx → PasswordResetEmail
└── order-confirm.tsx  → OrderConfirmEmail
```

各ファイルの期待する形式:

```tsx
import { Html, Body, Text } from 'hono-email'

// default export がプレビュー対象
export default function WelcomeEmail({ name, company }: { name: string; company: string }) {
  return (
    <Html>
      <Body>
        <Text>
          Hello {name}, welcome to {company}!
        </Text>
      </Body>
    </Html>
  )
}
```

v1 では TypeScript compiler API で props 型を自動抽出。MVP (v0.1) では
JSON 形式で初期値を渡す方式で簡易実装。

## 依存関係

- **hono**: プレビュー用 HTTP サーバー
- **vite**: 内部 dev server (SSR + HMR + Tailwind plugin)
- **@hono-email/tailwind-plugin**: Tailwind CSS 処理
- **hono-email**: render() パイプライン
- **TypeScript compiler API** (or ts-morph): props 型抽出 (v1)
- **citty** or similar: CLI フレームワーク

## スコープ外

- メール送信機能 (既存の adapter で対応済み)
- デスクトップアプリ化
- 複数人コラボレーション
- テンプレートの新規作成 UI (エディタ機能)

## 未決定項目 (実装中に決定)

- クライアント UI フレームワーク (Preact vs React vs Vanilla)
- 型抽出の精度 vs 実装コストのトレードオフ
- CSS framework for the preview UI
