# プロジェクト構成

## 構成の方針

takt-sdd は、配布対象のワークフロー資産を、インストーラーのコードや検証コードから分離します。TAKT ワークフローの挙動は `.takt/` 配下、インストーラーの挙動は `installer/` 配下、リポジトリレベルの検証は `scripts/` および `tests/` 配下に置きます。

## ディレクトリのパターン

### TAKT ワークフロー資産

**配置場所**: `.takt/{en,ja}/`

**目的**: 言語ごとのワークフロー YAML とファセットファイル。

**パターン**: ワークフローは `workflows/` に、プロンプトのファセットは `facets/<facet-kind>/` に置きます。あるワークフローが両言語で提供される場合、英語版と日本語版の資産は構造的に揃っているべきです。

### グローバル CLI

**配置場所**: `bin/` および `cli/`

**目的**: `takt-sdd` コマンドのエントリポイント（`bin/takt-sdd.mjs`）と、catalog・dispatch・workflow 実行・init 連携の各モジュール。

**パターン**: command の分類は `cli/command-catalog.mjs` の静的 catalog に集約します。dispatch は init → run 正規化 → 退役判定 → catalog 照合 → 未知、の順で分類します。installer（TypeScript）は CLI 層を import せず、CLI は `installer/dist/` のみを参照します。

### インストーラー

**配置場所**: `installer/src/`

**目的**: `create-takt-sdd` の CLI とインストール処理。

**パターン**: CLI の引数解析は、インストール処理やローカライズされたメッセージとは分離して保ちます。配布物の出力は `installer/dist/` 配下に生成されます。

### 検証（Validation）

**配置場所**: `scripts/validate-*.mjs` および `tests/*.test.mjs`

**目的**: ワークフローの形状、スクリプトカタログの整合性、ファセット参照、契約のセマンティクスを検証します。

**パターン**: 主要な Kiro ワークフロー領域ごとに、対となる検証スクリプトと `node:test` のテストスイートを用意します。

### Kiro ワークスペース

**配置場所**: `.kiro/`

**目的**: このリポジトリ向けの、Kiro 互換の仕様（spec）およびステアリング（steering）のワークスペース。

**パターン**: `.kiro/steering/` はプロジェクトメモリです。`.kiro/specs/<feature>/` には、`requirements.md`・`design.md`・`tasks.md` などの機能成果物を格納します。

## 命名規約

- **npm スクリプト**: `kiro:spec:tasks` や `validate:kiro-workflow-surface` のような、コロン区切りの名前。
- **ワークフロー識別子**: `kiro-spec-tasks` のような、ケバブケースの名前。
- **検証スクリプト**: `scripts/validate-<area>.mjs`。
- **テストファイル**: `tests/<area>.test.mjs`。
- **ファセットファイル**: ファセット種別ごとにグループ化された、ケバブケースの Markdown ファイル。

## コード構成の原則

- 同梱するワークフロー資産は「SUPPORTED（kiro-* 公開）∪ internal（検証用）」のみとすること。退役した `cc-sdd-*` / `opsx-*` は catalog の RETIRED 分類と検証の不在強制で再混入を防ぐこと（v2.0.0 退役）。
- 機械的にチェックできるワークフロー契約については、ドキュメントだけに頼らず、検証スクリプトを優先すること。
- `.takt/en` と `.takt/ja` の資産は、両方が存在する場合は言語ペアの構造を保つこと。
- ステアリングは永続的なプロジェクトメモリとして扱うこと。網羅的なファイル一覧ではなく、パターンや意思決定を記録すること。

---
_ファイルツリーではなくパターンを記録すること。パターンに従った新規ファイルの追加で、ステアリングの更新が必要になるべきではない。_
_updated_at: 2026-06-11 — v2.0.0 退役を反映: グローバル CLI（bin/・cli/）のパターンを追記し、旧 CC-SDD/OpenSpec 分離原則を RETIRED 分類の原則へ更新。_
