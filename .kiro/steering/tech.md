# 技術スタック

## アーキテクチャ

本リポジトリは、主にワークフロー資産パッケージとインストーラーで構成されます。ランタイムの挙動は TAKT の YAML ワークフローと Markdown ファセットで表現し、配布と検証は Node.js スクリプトと `node:test` で扱います。

## 中核技術

- **言語**: インストーラーのソースは TypeScript、リポジトリの検証スクリプトは JavaScript の ES モジュール。
- **ランタイム**: リポジトリスクリプトとインストーラー実行のために Node.js 22 以上。
- **ワークフローエンジン**: 開発依存（development dependency）かつインストール後のワークフローランタイムとしての `takt`。SDD 依存は `takt` のみです（v2.0.0 で `@fission-ai/openspec` / `cc-sdd` への依存は退役）。
- **テスト**: ワークフローおよび契約の検証のための、Node.js 組み込みの `node:test` ランナー。

## 開発標準

### ワークフロー契約

Kiro ワークフローの挙動は、`scripts/validate-kiro-*.mjs` 配下のリポジトリ内スクリプトで検証します。これらのスクリプトは、ワークフローの形状、ファセット参照、機械可読な用語、そして英語版と日本語版の TAKT 資産間のずれ（言語ドリフト）をチェックします。

### ファセット設計

TAKT のプロンプトは、種別ごとに分離したファセットとして保ちます。

- `personas`
- `policies`
- `instructions`
- `knowledge`
- `output-contracts`

ワークフロー YAML には、大きなプロンプト本文を直接埋め込むのではなく、これらのファセットを参照させること。

### 互換性

`kiro:*` スクリプトは、正規かつ唯一の Kiro 互換 SDD 基盤です。v2.0.0 で旧 `cc-sdd:*` / `opsx:*` npm scripts と `cc-sdd-*` / `opsx-*` workflow 資産は退役しました。CLI は退役 command を系統別の案内付きで拒否します（cc-sdd: 再提供予定なし / opsx: 将来の再提供を予定）。検証は退役物の「不在」を強制しており、再混入は `validate:all` / `validate:package-artifact` が fail させます。

## 開発環境

### 必要なツール

- Node.js 22 以上
- npm
- ローカルまたはグローバルの `takt` 実行ファイル

### よく使うコマンド

```bash
npm run validate:kiro-workflow-surface
npm run test:kiro-workflow-surface
npm run validate:kiro-discovery-batch-workflows
npm run test:kiro-discovery-batch-workflows
```

## 主要な技術的意思決定

- 公開用の `kiro:*` スクリプトは `scripts/kiro-staged.mjs` を経由し、TAKT を呼び出す前にインストール済みのワークフロー YAML を解決します。
- インストーラーは既存のパッケージスクリプトを保持し、不足している SDD スクリプトのみをマージします。
- 検証スクリプトは、ワークフロー／ファセット契約のずれを防ぐ第一級のセーフガードです。
- グローバル CLI の command 分類は `cli/command-catalog.mjs` の静的 catalog（SUPPORTED / EXCLUDED.internal / RETIRED）で駆動します。退役名は catalog（案内用）と installer の `RETIRED_MANIFEST_KEY_PATTERNS`（update 後始末用）に二重定義され、両者の整合は検証層のクロスチェックが固定します。
- update 時の退役資産後始末は manifest の hash 一致時のみ削除し、カスタマイズ済みは警告して残置します（dry-run は削除予定の表示のみ）。

---
_すべての依存関係ではなく、標準とパターンを記録すること。_
_updated_at: 2026-06-11 — v2.0.0 退役を反映: openspec 依存と cc-sdd:*/opsx:* 存続記述を是正し、catalog 駆動分類と退役後始末の意思決定を追記。_
