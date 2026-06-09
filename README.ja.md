# takt-sdd

[![npm version](https://img.shields.io/npm/v/create-takt-sdd)](https://www.npmjs.com/package/create-takt-sdd)
[![CI](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml)
[![Release](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml)
[![Publish](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-installer.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-installer.yml)
[![Lines of Code](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/j5ik2o/takt-sdd/refs/heads/main/.github/badges/tokei_badge.json)](https://github.com/j5ik2o/takt-sdd)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![License](https://img.shields.io/badge/License-APACHE2.0-blue.svg)](https://opensource.org/licenses/apache-2-0)

> **仕様を書け。あとは takt が確実に届ける。**

[English](README.md)

[takt](https://github.com/nrslib/takt) を用いた Spec-Driven Development（SDD: 仕様駆動開発）ワークフロー定義リポジトリ。

要件定義から設計・タスク分解・実装・レビュー・検証までの開発フローを、takt のワークフロー（YAML ワークフロー）とファセット群で自動化する。

takt-sdd は Kiroと互換性(`.kiro/specs/`)があるため、併用が可能。

## 特徴

takt-sdd は [takt](https://github.com/nrslib/takt) のステートマシンベースのワークフロー制御により、AI エージェントの実行パスを決定論的に管理する。

- **宣言的ワークフロー制御** — AI エージェントの実行順序・遷移条件をワークフロー（YAML）で宣言的に定義する。AI の出力自体は非決定的だが、「どのステップを、どの順序で、どの条件で遷移するか」は YAML のルールで決定論的に制御される。自由形式のチャットではなく、ステートマシンとしてワークフローが進行する。
- **Faceted Prompting** — プロンプトを 5 つの独立した関心事（Persona / Policy / Instruction / Knowledge / Output Contract）に分離する。各ファセットは再利用・差し替え可能で、ワークフロー間で共有できる。モノリシックなプロンプトの重複を排除し、保守性を向上させる。
- **多段階バリデーション** — 要件・設計・実装の各フェーズにバリデーションゲートを配置する。ギャップ分析、設計レビュー（GO/NO-GO 判定）、アーキテクチャ / QA / 実装の並列レビューにより、品質問題を早期に検出し手戻りを最小化する。
- **ループ検出と監督制御** — plan→implement、review→fix などの反復パターンを自動検出する。閾値超過時にスーパーバイザーが介入して進捗の有無を判定し、非生産的なループを自動的にエスカレーションする。
- **適応型バッチ実装** — タスク間の依存関係を分析し、逐次実行と並列実行を自動選択する。独立したタスクは複数ワーカーで並列処理される。
- **プロバイダ非依存** — 同じワークフロー定義が Claude / Codex 等の異なるプロバイダで動作する。

## 前提条件

- Node.js 22+（takt はインストール時に `devDependencies` へ自動追加される）

## インストール

自分のプロジェクトに SDD ワークフローを導入するには、プロジェクトルートで以下を実行する：

```bash
npx create-takt-sdd
```

日本語のファセットとメッセージで実行する場合：

```bash
npx create-takt-sdd --lang ja
```

特定バージョンや最新リリースをインストールする場合：

```bash
npx create-takt-sdd --tag latest
npx create-takt-sdd --tag 0.1.2
```

インストーラは以下をセットアップする：

- **`.takt/`** — 選択言語（`--lang`）のワークフロー（YAML ワークフロー）とファセット群
- **`openspec/config.yaml`** — OpenSpec `1.3.1` の公式 CLI で初期化されたプロジェクト設定
- **`package.json`** — 各フェーズの npm scripts と `takt` / `@fission-ai/openspec@1.3.1` を devDependencies に追加
- **cc-sdd** — 固定バージョンの `cc-sdd@3.0.2` CLI で、選択した `--lang` を伝播して Kiro 互換のプロジェクト初期化を実行

オプション：

| オプション | 内容 |
|-----------|------|
| `--force` | 既存の `.takt/` を上書き |
| `--tag <version>` | 特定バージョンをインストール（`latest`, `0.2.0` 等） |
| `--lang <en\|ja>` | ファセット・メッセージの言語（デフォルト: `en`） |
| `--dry-run` | ファイルを書き込まずにプレビュー |

既存の `package.json` がある場合は npm scripts のみマージされる（既存のスクリプトは上書きしない）。あわせて `openspec init --tools none --force .` を実行するため、AI ツール向けの追加ファイルを増やさずに OpenSpec を利用できる状態になる。続けて固定バージョンの `cc-sdd@3.0.2` 初期化を同じ `--lang` で実行する。`--dry-run` では cc-sdd 初期化はプレビュー表示のみで実行されない。

### スキルの個別追加

TAKT スキルは [`j5ik2o/ai-tools`](https://github.com/j5ik2o/ai-tools) へ移転済みで、`npx skills add` で個別にインストールできる：

```bash
npx -y skills add j5ik2o/ai-tools --skill takt-analyzer
npx -y skills add j5ik2o/ai-tools --skill takt-facet-builder
npx -y skills add j5ik2o/ai-tools --skill takt-optimizer
npx -y skills add j5ik2o/ai-tools --skill takt-piece-builder
npx -y skills add j5ik2o/ai-tools --skill takt-task-builder
```

## Kiro 互換ワークフロー

新規の SDD ワークフローでは `kiro:*` scripts を使う。旧 `cc-sdd:*` scripts は既存プロジェクト向けの互換入口として残すが、新規の説明と agent guidance では Kiro surface を優先する。

| フェーズ | npm script | workflow identity | 内容 |
|---------|------------|-------------------|------|
| Discovery | `kiro:discovery` | `kiro-discovery` | feature idea を分類し、必要に応じて brief/roadmap を更新 |
| Spec quick path | `kiro:spec:quick` | `kiro-spec-quick` | requirements/design/tasks を closed-loop で生成 |
| Requirements | `kiro:spec:requirements` | `kiro-spec-requirements` | EARS 形式の要件を生成 |
| Gap validation | `kiro:validate:gap` | `kiro-validate-gap` | 要件と既存コードベースの差分を確認 |
| Design | `kiro:spec:design` | `kiro-spec-design` | 技術設計と発見ログを生成 |
| Design validation | `kiro:validate:design` | `kiro-validate-design` | 設計品質をレビューし GO/NO-GO を返す |
| Tasks | `kiro:spec:tasks` | `kiro-spec-tasks` | 実装タスクを生成 |
| Batch specs | `kiro:spec:batch` | `kiro-spec-batch` | roadmap の依存順に複数 spec を生成 |
| Status | `kiro:spec:status` | `kiro-spec-status` | spec phase、approval、readiness を報告 |
| Implementation | `kiro:impl` | `kiro-impl` | review/debug/verify gate 付きで approved task を実装 |
| Implementation validation | `kiro:validate:impl` | `kiro-validate-impl` | 実装 evidence と残る manual check を検証 |

### Quick 実行

requirements → design → tasks を quick path で生成する：

```bash
npm run kiro:spec:quick -- "要件の説明..."
```

### フェーズ別実行

各フェーズのワークフローを実行した後に、人間の介入を挟むことができる。

```bash
# 任意: discovery
npm run kiro:discovery -- "feature idea..."

# 要件生成
npm run kiro:spec:requirements -- "要件の説明..."
# .kiro/specs/{feature} の {feature} を確認すること

# ギャップ分析（既存コードがある場合のみ）
npm run kiro:validate:gap -- "feature={feature}"

# 設計生成
npm run kiro:spec:design -- "feature={feature}"

# 設計検証
npm run kiro:validate:design -- "feature={feature}"

# タスク生成
npm run kiro:spec:tasks -- "feature={feature}"

# 実装
npm run kiro:impl -- "feature={feature}"

# 実装検証
npm run kiro:validate:impl -- "feature={feature}"
```

### Smoke Tests

mock provider の smoke tests は CI で実行される。実 Claude provider で Kiro full lifecycle を流す場合は、明示的に opt-in する：

```bash
KIRO_REAL_PROVIDER_SMOKE=1 npm run test:kiro-real-provider-smoke
```

timeout のデフォルトは workflow ごとに 15 分、`kiro:impl` は 30 分。
実 provider 実行が遅い場合は `KIRO_REAL_PROVIDER_TIMEOUT_MS` または `KIRO_REAL_PROVIDER_IMPL_TIMEOUT_MS` で調整できる。

### 旧 `cc-sdd:*` scripts からの移行

旧 scripts は互換入口として残る。既存の `cc-sdd-*` workflow を呼び続け、`kiro:*` の alias ではない。

| 旧 script | 新しい Kiro script |
|-----------|--------------------|
| `cc-sdd:full` | `kiro:spec:quick` |
| `cc-sdd:requirements` | `kiro:spec:requirements` |
| `cc-sdd:validate-gap` | `kiro:validate:gap` |
| `cc-sdd:design` | `kiro:spec:design` |
| `cc-sdd:validate-design` | `kiro:validate:design` |
| `cc-sdd:tasks` | `kiro:spec:tasks` |
| `cc-sdd:impl` | `kiro:impl` |
| `cc-sdd:validate-impl` | `kiro:validate:impl` |
| `cc-sdd:steering` | `kiro:steering` |
| `cc-sdd:steering-custom` | `kiro:steering-custom` |

<details>
<summary>旧 CC-SDD scripts</summary>

```bash
npm run cc-sdd:full -- "要件の説明..."
npm run cc-sdd:requirements -- "要件の説明..."
npm run cc-sdd:validate-gap -- "feature={feature}"
npm run cc-sdd:design -- "feature={feature}"
npm run cc-sdd:validate-design -- "feature={feature}"
npm run cc-sdd:tasks -- "feature={feature}"
npm run cc-sdd:impl -- "feature={feature}"
npm run cc-sdd:validate-impl -- "feature={feature}"
```

</details>

### 出力ファイル

各フェーズの成果物は `.kiro/specs/{feature}/` に出力される。Kiro の仕様フォーマットと互換性がある。

| Phase | ファイル | 内容 |
|-------|----------|------|
| 1 | `requirements.md` | EARS 形式の要件ドキュメント |
| 1.5 | `gap-analysis.md` | 要件と既存コードベースのギャップ分析 |
| 2 | `design.md` | 技術設計（アーキテクチャ、コンポーネント、データモデル） |
| 2 | `research.md` | 発見ログ（調査結果と設計判断の根拠） |
| 2.5 | `design-review.md` | 設計レビュー結果（GO/NO-GO 判定） |
| 3 | `tasks.md` | 実装タスクリスト（実装中に進捗が更新される） |


## Steering（プロジェクトメモリ管理）

SDD ワークフローとは別に、`.kiro/steering/` をプロジェクトメモリとして管理するワークフローを提供する。

| ワークフロー | 内容 |
|--------|------|
| `kiro-steering` | コアsteeringファイル（product.md / tech.md / structure.md）の生成・同期 |
| `kiro-steering-custom` | ドメイン固有のカスタムsteeringファイルの作成 |

### steering

コードベースを分析し、プロジェクトの目的・技術スタック・構造パターンを `.kiro/steering/` に記録する。初回実行時はブートストラップモード、以降はコードとの乖離を検出するシンクモードで動作する。

コードがまだないグリーンフィールドプロジェクトでは、プレースホルダ付きのひな型が生成されるので、開発者が方針を記入して使う。

```bash
npm run kiro:steering -- "steeringを同期"

# グリーンフィールド: プロダクト方針・技術選定を事前指定
npm run kiro:steering -- "TypeScript + Express のREST APIサーバー、PostgreSQL"
```

### steering-custom

アーキテクチャ方針、API 標準、テスト戦略など、特定ドメインのsteeringファイルを作成する。`.takt/knowledge/steering-custom-template-files/` にテンプレートが用意されている。

```bash
npm run kiro:steering-custom -- "architecture"
# .takt/knowledge/steering-custom-template-files/{name}.mdの{name}を指定する
```

利用可能なテンプレート：

| テンプレート | 内容 |
|-------------|------|
| `architecture` | アーキテクチャスタイル（ヘキサゴナル、クリーンアーキテクチャ等）、レイヤー境界、依存ルール |
| `api-standards` | エンドポイントパターン、リクエスト/レスポンス形式、バージョニング |
| `testing` | テスト構成、テスト種別、カバレッジ |
| `security` | 認証パターン、入力検証、シークレット管理 |
| `database` | スキーマ設計、マイグレーション、クエリパターン |
| `error-handling` | エラー型、ロギング、リトライ戦略 |
| `authentication` | 認証フロー、権限管理、セッション管理 |
| `deployment` | CI/CD、環境構成、ロールバック手順 |

#### グリーンフィールド対応（コードがまだないプロジェクト）

`kiro:steering` と `kiro:steering-custom` の両方がグリーンフィールドプロジェクトに対応している。コードベースが空の状態でもひな型を生成できる。テンプレートの構造をベースに、プレースホルダ（`[選択肢]`、`[理由]` 等）を含んだsteeringファイルが生成されるので、開発者が方針を記入して使う。

方針を事前に指定したい場合は、コマンドに続けて記述する：

```bash
# コアsteering（product.md / tech.md / structure.md）のひな型を生成
npm run kiro:steering -- "steeringを生成"

# プロダクト方針・技術選定を事前指定
npm run kiro:steering -- "TypeScript + Express のREST APIサーバー、PostgreSQL"

# カスタムsteering: アーキテクチャ方針を指定
npm run kiro:steering-custom -- "architecture: ヘキサゴナルアーキテクチャ、アクターモデル"

# カスタムsteering: テスト戦略を指定
npm run kiro:steering-custom -- "testing: Vitest、E2Eは Playwright、カバレッジ80%以上"

# カスタムsteering: DB方針を指定
npm run kiro:steering-custom -- "database: PostgreSQL、Prisma ORM、マイグレーションは自動"

# カスタムsteering: 方針なしでひな型だけ生成（後で手動記入）
npm run kiro:steering-custom -- "testing"
```

生成されたsteeringファイルは設計フェーズ（`kiro:spec:design`, `kiro:validate:design` 等）で自動的に参照される。

## OpenSpec 互換ワークフロー

SDD ワークフローとは別に、OpenSpec ベースの変更管理ワークフローを提供する。提案 → 実装 → アーカイブの各フェーズで構造化された変更を管理する。

`npm run opsx:*` の入口は維持しつつ、内部のワークフロー定義は repo ローカルの補助スクリプトではなく、公式 OpenSpec CLI 契約（`openspec new change` / `openspec status` / `openspec instructions` / `openspec archive --yes`）に合わせている。

| ワークフロー | 内容 |
|--------|------|
| `opsx-propose` | 変更を作成し、全アーティファクト（提案書、設計書、タスク）を生成 |
| `opsx-apply` | 変更のタスクを実装 |
| `opsx-archive` | 完了した変更をアーカイブ |
| `opsx-full` | propose → apply → archive を一括自動実行 |
| `opsx-explore` | 対話的な探索と思考（読み取り専用、full には含まれない） |

### フルオート実行

```bash
npm run opsx:full -- "変更の説明"
```

### フェーズ別実行

```bash
# 変更を作成しアーティファクトを生成
npm run opsx:propose -- "change-name"

# タスクを実装
npm run opsx:apply -- "change-name"

# 完了した変更をアーカイブ
npm run opsx:archive -- "change-name"

# 対話的な探索（独立した思考モード）
npm run opsx:explore
```

### OpenSpec 設定

`openspec/config.yaml` でスキーマとオプションのプロジェクトコンテキストを定義する：

```yaml
schema: spec-driven

# オプション: アーティファクト作成時にAIに提示するプロジェクトコンテキスト
# context: |
#   技術スタック: TypeScript, React, Node.js

# オプション: アーティファクト単位のルール
# rules:
#   proposal:
#     - 提案書は500語以内にする
```

変更は `openspec/changes/<name>/` に保存され、`openspec/changes/archive/` にアーカイブされる。

## プロジェクト構造

```
.takt/
├── en/                      # 英語版ファセット・ワークフロー
│   ├── pieces/              # Workflow definitions (YAML)
│   ├── personas/            # Persona facets
│   ├── policies/            # Policy facets
│   ├── instructions/        # Instruction facets
│   ├── knowledge/           # Knowledge facets
│   └── output-contracts/    # Output contract facets
└── ja/                      # 日本語版ファセット・ワークフロー
    ├── pieces/              # ワークフロー定義（YAML）
    ├── personas/            # ペルソナファセット
    ├── policies/            # ポリシーファセット
    ├── instructions/        # インストラクションファセット
    ├── knowledge/           # ナレッジファセット
    └── output-contracts/    # 出力契約ファセット
references/
└── okite-ai/                # AI ルール集（submodule）
scripts/
└── takt.sh                  # takt 実行ラッパー
```

## 影響を受けたツール

本プロジェクトは以下のプロジェクトにインスパイアされている：

- [Kiro](https://github.com/kirodotdev/Kiro) - Amazon による SDD ベースの AI 開発環境
- [cc-sdd](https://github.com/gotalab/cc-sdd) - 複数の AI コーディングエージェントに対応した SDD ツール
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - AI コーディングアシスタント向け軽量 SDD フレームワーク
