# Implementation Plan: Hono JSX Email Renderer

## Overview
`hono/jsx` から HTML メールと plain text を生成するコアライブラリを段階的に実装する。v1 では送信統合を扱わず、`render()` / `renderPretty()` / `renderWithWarnings()` / `toPlainText()` を中心 API とする。加えて、React Email を参考に `Tailwind`, `Markdown`, `Font` を core export として提供し、既存の runtime validator と整合する形で実装する。

## Architecture Decisions
- API の中心は `render(jsx)` と `toPlainText(html)`
  理由: `hono/jsx` に自然で、`react-email` ユーザーにも理解しやすい。
- 追加の warnings は `renderWithWarnings()` に分離する
  理由: `render()` の返り値を string のまま保ちつつ、warning 情報も取得できるようにするため。
- デフォルトは `strict: true`
  理由: HTML メールは silent failure が多く、危険タグを無言で通す設計は悪い。
- validator と normalize を分離する
  理由: 「禁止」と「軽微補正」を分けないと将来拡張が破綻する。
- Tailwind と Markdown は core に入れるが、依存は用途を限定して最小に保つ
  理由: ユーザー要件として core export が必要だが、scope を膨らませすぎないため。
- `Font` は `unifont` を使って provider 差分を吸収する
  理由: Google Fonts や npm/fontsource 由来の CSS 解決を個別実装するより、既存 provider abstraction と cache を使う方が保守しやすい。
- JSX runtime の拡張は行わない
  理由: 通常の Hono JSX 利用までメール制約で縛るのは過剰だから。
- Tailwind の class 解決は初期実装では最終 HTML 要素に限定する
  理由: React Email でも class の扱いに制限があり、component 単位まで広げると複雑化しやすいため。
- Markdown の raw HTML は sanitize と validator を通した上で扱う
  理由: table や既存 HTML を活かしつつ unsafe な内容を通さないため。

## Current Status
### Implemented
- `render()` による HTML 生成
- `renderPretty()` による整形済み HTML 生成
- `renderWithWarnings()` による warning 収集
- `toPlainText()` による plain text 変換
- semantic tag の `div` への normalize
- strict mode の禁止タグチェック
- strict mode の禁止 CSS チェック
- Tier 2 CSS の warning
- `<style>` を `<Head>` 内に限定
- `<a href>` 必須 error
- `<img alt>` 欠落 warning
- `Html`, `Head`, `Body`, `Container`, `Section`, `Row`, `Column`, `Text`, `Heading`, `Button`, `Link`, `Img`, `Preview`, `Hr`, `Font`
- examples と README

### Not Yet Implemented
- CSS inlining の高度化
- provider integration
- Outlook VML generation
- lint script

## Dependency Graph
```text
render core
  ├── output options
  ├── html validator
  │     └── css validator
  ├── normalize rules
  ├── preview relocation
  └── components
         ├── basic primitives
         ├── Font
         ├── Tailwind
         └── Markdown

Font
  ├── unifont provider setup
  ├── font option normalization
  ├── @font-face css generation
  └── fallback stack generation

Tailwind
  ├── Tailwind config resolution
  ├── utility extraction
  ├── inline style mapping
  └── head style generation

Markdown
  ├── markdown parser
  ├── raw HTML sanitize
  ├── custom style mapping
  └── validator integration
```

## Progress by Phase

### Phase 1: Foundation
- [x] Task 1: パッケージ骨格と公開 API の最小形を定義する
- [x] Task 2: JSX を HTML 文字列にする render core を実装する
- [x] Task 3: doctype と document 出力ポリシーを実装する

### Phase 2: Validation Core
- [x] Task 4: HTML タグ validator を実装する
- [x] Task 5: semantic tag normalize ルールを実装する
- [x] Task 6: CSS validator を実装する
- [x] Task 6.1: warning メッセージに代替手段を含める
- [x] Task 6.2: `<style>` の `<Head>` 内配置を strict mode で強制する
- [x] Task 6.3: `<a href>` 必須 error と `<img alt>` warning を追加する

### Phase 3: Output Features
- [x] Task 7: plain text conversion を実装する
- [x] Task 8: 基本 primitives を実装する
- [x] Task 9: `Head` / `Body` / `Preview` の document semantics を安定化する
- [x] Task 9.1: `renderWithWarnings()` を追加する
- [x] Task 9.2: `renderPretty()` の整形出力を追加する

### Phase 4: Tailwind and Markdown
- [x] Task 10: Tailwind / Markdown の期待挙動をテストで固定する
- [x] Task 11: Tailwind component を実装する
- [x] Task 12: Markdown component を実装する
- [x] Task 13: README / examples / spec を実装に合わせて更新する

## Remaining Tasks

現時点で Tailwind / Markdown / Font の最小実装は完了している。次は primitives の互換性の厚みと公開 API の調整を進める。

## Implementation Order
1. 基本 primitives の React Email 互換を厚くする
2. Tailwind utility coverage を広げる
3. plain text / render option を整理する
4. Markdown sanitize policy の将来拡張点を固める

## Task 15: Basic primitives の互換性を厚くする

**Description:**  
現在の `Button`, `Text`, `Hr`, `Heading`, `Link` は薄い wrapper に近い。React Email と比べて移行時の期待値との差が大きい部分を優先し、既定 style とメール向け補正を追加する。

**Acceptance criteria:**
- [ ] `Button` のデフォルト出力にメール向け補正が入る
- [ ] `Text`, `Hr`, `Heading` に最低限の既定 style が付く
- [ ] 破壊的変更になりうる既定 style は docs に明記される
- [ ] React Email からの移行サンプルを 1 つ以上 docs に追加する

**Verification:**
- [ ] `nr test`

**Dependencies:** None

**Files likely touched:**
- `src/components/index.tsx`
- `tests/render/components.test.tsx`
- `README.md`
- `examples/basic/*`

**Estimated scope:** Medium: 3-4 files

## Task 16: Tailwind utility coverage を広げる

**Description:**  
現在の Tailwind は intentionally limited で、主要 utility と responsive class に絞っている。`react-email` の `pixelBasedPreset` を参考に、実運用で使う utility を拡張しつつ docs と tests で非対応範囲も固定する。

**Acceptance criteria:**
- [ ] 現在サポートする utility subset が docs に明文化されている
- [ ] `pixelBasedPreset` 相当の spacing / font-size 方針が決まっている
- [ ] 追加で必要な utility が例とテストから判断できる

**Verification:**
- [ ] Review check: README / examples / tests の API が一致している

**Dependencies:** Task 11

**Files likely touched:**
- `src/tailwind/*`
- `README.md`
- `tests/render/tailwind.test.tsx`

**Estimated scope:** Medium: 2-3 files

## Task 17: render / plain text option を整理する

**Description:**  
現在の `toPlainText()` は簡易実装で、`render()` 側にも plain text 関連 option がない。React Email の utility 群を参考に、別関数中心の設計を維持しつつ option の持ち方を整理する。

**Acceptance criteria:**
- [ ] `toPlainText()` の責務と `render()` options の境界が docs に明文化されている
- [ ] plain text 生成の拡張余地が API 上で確保されている
- [ ] 将来 `html-to-text` 相当の option を受けるかどうかの方針が決まっている

**Verification:**
- [ ] Review check: text conversion API が spec / README / tests で一致している

**Dependencies:** Task 15

**Files likely touched:**
- `src/index.ts`
- `src/text/*`
- `README.md`
- `docs/specs/email-renderer-spec.md`

**Estimated scope:** Small: 2-3 files

## Task 18: Markdown sanitize policy の option 化を検討する

**Description:**  
現在の Markdown sanitize policy は固定。将来 option 化する場合の API と安全境界を整理する。

**Acceptance criteria:**
- [ ] allow list を option 化するか現状維持するか方針が決まっている
- [ ] unsafe HTML を通さない境界が docs に明文化されている

**Verification:**
- [ ] Review check: sanitize と validator の責務が明確

**Dependencies:** Task 12

**Files likely touched:**
- `src/markdown/*`
- `docs/specs/email-renderer-spec.md`
- `README.md`

**Estimated scope:** Small: 1-2 files

## Completed Task 10: Tailwind / Markdown の期待挙動をテストで固定する

**Description:**  
React Email の Tailwind / Markdown docs を参考に、最低限の互換 API とこのライブラリ固有の制約を失敗テストで先に固定する。

**Acceptance criteria:**
- [x] `Tailwind` が `config` を受け取れることをテストで表現できている
- [x] utility class が inline style へ落ちることをテストで表現できている
- [x] media query のような inline 化しない CSS が `<Head>` 配下に寄ることをテストで表現できている
- [x] `Markdown` が table と safe raw HTML を扱えることをテストで表現できている
- [x] `markdownContainerStyles` と `markdownCustomStyles` が HTML 出力に反映されることをテストで表現できている

**Verification:**
- [x] `nr test`

**Dependencies:** None

**Files likely touched:**
- `tests/render/tailwind.test.tsx`
- `tests/render/markdown.test.tsx`

**Estimated scope:** Medium: 2 files

## Completed Task 11: Tailwind component を実装する

**Description:**  
`Tailwind` component を追加し、主要 utility class をメール向け style に変換する。inline 化できない CSS は `<style>` として保持し、最終的に `<Head>` に移動させる。

**Acceptance criteria:**
- [x] `Tailwind` が `config` prop を受ける
- [x] 主要 utility class が inline style として出力される
- [x] responsive / media query CSS は `<style>` として出力され、strict mode を通る
- [x] 生成された HTML / CSS は既存 validator を通る

**Verification:**
- [x] `nr test`
- [x] `nr typecheck`

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/index.tsx`
- `src/index.ts`
- `src/normalize/*`
- `src/validate/html.ts`
- `src/tailwind/*`

**Estimated scope:** Large: 4-5 files

## Completed Task 12: Markdown component を実装する

**Description:**  
`Markdown` component を追加し、Markdown 文字列をメール安全 HTML に変換する。raw HTML は sanitize と validator を通した上で扱い、custom style API を提供する。

**Acceptance criteria:**
- [x] `Markdown` が string children を受ける
- [x] headings, paragraph, list, table, code, blockquote, link, image を出力できる
- [x] safe raw HTML は残り、unsafe raw HTML は除去または error になる
- [x] `markdownContainerStyles` と `markdownCustomStyles` が出力に反映される

**Verification:**
- [x] `nr test`
- [x] `nr typecheck`

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/index.tsx`
- `src/index.ts`
- `src/markdown/*`
- `src/validate/html.ts`

**Estimated scope:** Large: 4-5 files

## Completed Task 13: README / examples / spec を実装に合わせて更新する

**Description:**  
新しい core export と制限事項を README, examples, spec に反映する。

**Acceptance criteria:**
- [x] README に Tailwind / Markdown の使用例がある
- [x] examples に少なくとも Tailwind と Markdown の例が 1 つずつある
- [x] spec / plan が実装と矛盾しない

**Verification:**
- [x] Review check: docs と実装の API 名が一致している
- [x] `nr build`

**Dependencies:** Task 11, Task 12

**Files likely touched:**
- `README.md`
- `docs/specs/email-renderer-spec.md`
- `docs/specs/email-renderer-plan.md`
- `examples/basic/*`

**Estimated scope:** Medium: 3-4 files

## Checkpoints

### Checkpoint: Current
- [x] `nr test`
- [x] `nr typecheck`
- [x] `nr build`
- [x] 最小メールテンプレートが HTML / text の両方へ出る
- [x] strict mode が危険タグ・危険 CSS・属性不足を検知する
- [x] examples と README が存在する

### Checkpoint: Tailwind
- [x] Tailwind class が少なくとも色、spacing、typography、background の代表例で動く
- [x] Tailwind 由来の CSS が strict mode を壊さない

### Checkpoint: Markdown
- [x] Markdown の基本ブロック要素が HTML メールとして出力できる
- [x] raw HTML が sanitize と validator を通る

### Checkpoint: Before v1 release
- [ ] package metadata が npm 公開向けに整っている
- [ ] examples と README が公開用として十分かレビュー済み

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Tailwind 実装が class 解決の複雑さで肥大化する | High | 初期実装は最終 HTML 要素のみ対象に絞り、非対応範囲を docs へ明記する |
| Markdown の raw HTML が unsafe content を通す | High | sanitize と validator の両方を通し、許可タグを明示する |
| Font provider 依存でネットワークやキャッシュ戦略が複雑化する | High | `unifont` の memory cache を既定とし、v1 では provider と option を絞る |
| generated CSS が strict validator と衝突する | High | Tailwind / Markdown 由来の HTML も必ず既存 validator を通す |
| 依存追加で core が重くなる | Medium | parser / transformer の責務を限定し、必要最小限の package に絞る |
| React Email 互換を追いすぎて Hono らしさを失う | Medium | API 名は寄せても中心 API は `render(jsx)` に固定する |

## Open Questions
- Tailwind の warning をどこまで構造化するか
- `Font` の provider option をどこまで public API に出すか
- Markdown の sanitize policy を将来 option 化するか
- `renderPretty()` が Tailwind / Markdown 出力でも十分読みやすい整形を維持できるか

## Human Review Needed
- [x] Tailwind / Markdown を core export として実装する方針
- [x] `Font` を `unifont` ベースで実装する方針
- [x] raw HTML を sanitize + validator 経由で扱う方針
- [x] `markdownCustomStyles` と `markdownContainerStyles` を入れる方針
- [x] component-level class 解決や複雑 selector を初期非対応にする方針
