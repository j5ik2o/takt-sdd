# 技術スタック

## アーキテクチャ

本リポジトリは、主にワークフロー資産パッケージとインストーラーで構成されます。ランタイムの挙動は TAKT の YAML ワークフローと Markdown ファセットで表現し、配布と検証は Node.js スクリプトと `node:test` で扱います。

## 中核技術

- **言語**: インストーラーのソースは TypeScript、リポジトリの検証スクリプトは JavaScript の ES モジュール。
- **ランタイム**: リポジトリスクリプトとインストーラー実行のために Node.js 22 以上。
- **ワークフローエンジン**: 開発依存（development dependency）かつインストール後のワークフローランタイムとしての `takt`。
- **仕様ツール**: OpenSpec ワークフローをサポートするための `@fission-ai/openspec`。
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

`kiro:*` スクリプトは、正規の Kiro 互換 SDD 基盤です。旧 `cc-sdd:*` スクリプトは後方互換のエントリポイントとして残されており、`kiro:*` のエイリアスではありません。`opsx:*` スクリプトは、独立した OpenSpec エントリポイントのままです。

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

---
_すべての依存関係ではなく、標準とパターンを記録すること。_
