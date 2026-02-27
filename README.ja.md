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

要件定義から設計・タスク分解・実装・レビュー・検証までの開発フローを、takt のピース（YAML ワークフロー）とファセット群で自動化する。

takt-sdd は Kiroと互換性(`.kiro/specs/`)があるため、併用が可能。

## 特徴

takt-sdd は [takt](https://github.com/nrslib/takt) のステートマシンベースのワークフロー制御により、AI エージェントの実行パスを決定論的に管理する。

- **宣言的ワークフロー制御** — AI エージェントの実行順序・遷移条件をピース（YAML）で宣言的に定義する。AI の出力自体は非決定的だが、「どのステップを、どの順序で、どの条件で遷移するか」は YAML のルールで決定論的に制御される。自由形式のチャットではなく、ステートマシンとしてワークフローが進行する。
- **Faceted Prompting** — プロンプトを 5 つの独立した関心事（Persona / Policy / Instruction / Knowledge / Output Contract）に分離する。各ファセットは再利用・差し替え可能で、ピース間で共有できる。モノリシックなプロンプトの重複を排除し、保守性を向上させる。
- **多段階バリデーション** — 要件・設計・実装の各フェーズにバリデーションゲートを配置する。ギャップ分析、設計レビュー（GO/NO-GO 判定）、アーキテクチャ / QA / 実装の並列レビューにより、品質問題を早期に検出し手戻りを最小化する。
- **ループ検出と監督制御** — plan→implement、review→fix などの反復パターンを自動検出する。閾値超過時にスーパーバイザーが介入して進捗の有無を判定し、非生産的なループを自動的にエスカレーションする。
- **適応型バッチ実装** — タスク間の依存関係を分析し、逐次実行と並列実行を自動選択する。独立したタスクは複数ワーカーで並列処理される。
- **プロバイダ非依存** — 同じピース定義が Claude / Codex 等の異なるプロバイダで動作する。

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

- **`.takt/`** — 選択言語（`--lang`）のピース（YAML ワークフロー）とファセット群
- **`.agent/skills/`** — TAKT スキル（takt-analyze, takt-facet, takt-optimize, takt-piece）
- **`.claude/skills/`, `.codex/skills/`** — `.agent/skills/` へのシンボリックリンク（Claude Code / Codex CLI 用）
- **`references/takt/`** — takt のビルトインとドキュメント（インストーラリリース時のサブモジュールコミットに固定）
- **`package.json`** — 各フェーズの npm scripts + takt を devDependency に追加

オプション：

| オプション | 内容 |
|-----------|------|
| `--force` | 既存の `.takt/` を上書き |
| `--without-skills` | スキルと takt リファレンスのインストールをスキップ |
| `--refs-path <path>` | takt リファレンスのパス（デフォルト: `references/takt`） |
| `--tag <version>` | 特定バージョンをインストール（`latest`, `0.2.0` 等） |
| `--lang <en\|ja>` | ファセット・メッセージの言語（デフォルト: `en`） |
| `--dry-run` | ファイルを書き込まずにプレビュー |

既存の `package.json` がある場合は npm scripts のみマージされる（既存のスクリプトは上書きしない）。

## 概要

SDD は以下のフェーズを順に実行する：

| Phase | ピース | 内容 |
|-------|--------|------|
| 1 | `cc-sdd-requirements` | EARS 形式による要件ドキュメント生成 |
| 1.5 | `cc-sdd-validate-gap` | 要件と既存コードベースのギャップ分析 |
| 2 | `cc-sdd-design` | 要件に基づく技術設計と発見ログの生成 |
| 2.5 | `cc-sdd-validate-design` | 設計の品質レビューと GO/NO-GO 判定, NO-GO時の設計の修正も含む |
| 3 | `cc-sdd-tasks` | 実装タスクリストの生成 |
| 4 | `cc-sdd-impl` | 適応型バッチ実装（逐次/並列ワーカー対応） |
| 5 | `cc-sdd-validate-impl` | アーキテクチャ・QA・実装の並列レビュー, NO-GO時の実装の修正も含む |

フルオートピース `cc-sdd-full` を使うと、Phase 1〜5 を自動遷移で一括実行できる。

## 使い方

### フルオート実行

要件定義→ギャップ分析→設計→設計検証→実装→実装検証 を一括で実行する。

```bash
npm run cc-sdd:full -- "要件の説明..."
```

### フェーズ別実行

各フェーズのワークフローを実行した後に、人間の介入を挟むことができる。

```bash
# Phase 1: 要件生成
npm run cc-sdd:requirements -- "要件の説明..."
# .kiro/specs/{feature} の {feature} を確認すること

# Phase 1.5: ギャップ分析（既存コードがある場合のみ）
npm run cc-sdd:validate-gap -- "feature={feature}"

# Phase 2: 設計生成
npm run cc-sdd:design -- "feature={feature}"

# Phase 2.5: 設計検証（NO-GO時は自動修正→再検証）
npm run cc-sdd:validate-design -- "feature={feature}"

# Phase 3: タスク生成
npm run cc-sdd:tasks -- "feature={feature}"

# Phase 4: 実装
npm run cc-sdd:impl -- "feature={feature}"

# Phase 5: 実装検証（不合格時は自動修正→再検証）
npm run cc-sdd:validate-impl -- "feature={feature}"
```

<details>
<summary>takt コマンドを直接使う場合</summary>

```bash
takt --pipeline --skip-git --create-worktree no -w cc-sdd-full -t "要件の説明..."
takt --pipeline --skip-git --create-worktree no -w cc-sdd-requirements -t "要件の説明..."
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-gap -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-design -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-design -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-tasks -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-impl -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-impl -t "feature={feature}"
```

対話モードの場合は `takt -w {ピース名}` で実行できる。

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

SDD ワークフローとは別に、`.kiro/steering/` をプロジェクトメモリとして管理するピースを提供する。

| ピース | 内容 |
|--------|------|
| `steering` | コアsteeringファイル（product.md / tech.md / structure.md）の生成・同期 |
| `steering-custom` | ドメイン固有のカスタムsteeringファイルの作成 |

### steering

コードベースを分析し、プロジェクトの目的・技術スタック・構造パターンを `.kiro/steering/` に記録する。初回実行時はブートストラップモード、以降はコードとの乖離を検出するシンクモードで動作する。

コードがまだないグリーンフィールドプロジェクトでは、プレースホルダ付きのひな型が生成されるので、開発者が方針を記入して使う。

```bash
npm run steering -- "steeringを同期"

# グリーンフィールド: プロダクト方針・技術選定を事前指定
npm run steering -- "TypeScript + Express のREST APIサーバー、PostgreSQL"
```

### steering-custom

アーキテクチャ方針、API 標準、テスト戦略など、特定ドメインのsteeringファイルを作成する。`.takt/knowledge/steering-custom-template-files/` にテンプレートが用意されている。

```bash
npm run steering:custom -- "architecture"
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

`steering` と `steering-custom` の両方がグリーンフィールドプロジェクトに対応している。コードベースが空の状態でもひな型を生成できる。テンプレートの構造をベースに、プレースホルダ（`[選択肢]`、`[理由]` 等）を含んだsteeringファイルが生成されるので、開発者が方針を記入して使う。

方針を事前に指定したい場合は、コマンドに続けて記述する：

```bash
# コアsteering（product.md / tech.md / structure.md）のひな型を生成
npm run steering -- "steeringを生成"

# プロダクト方針・技術選定を事前指定
npm run steering -- "TypeScript + Express のREST APIサーバー、PostgreSQL"

# カスタムsteering: アーキテクチャ方針を指定
npm run steering:custom -- "architecture: ヘキサゴナルアーキテクチャ、アクターモデル"

# カスタムsteering: テスト戦略を指定
npm run steering:custom -- "testing: Vitest、E2Eは Playwright、カバレッジ80%以上"

# カスタムsteering: DB方針を指定
npm run steering:custom -- "database: PostgreSQL、Prisma ORM、マイグレーションは自動"

# カスタムsteering: 方針なしでひな型だけ生成（後で手動記入）
npm run steering:custom -- "testing"
```

生成されたsteeringファイルは設計フェーズ（`sdd:design`, `sdd:validate-design` 等）で自動的に参照される。

## プロジェクト構造

```
.takt/
├── en/                      # 英語版ファセット・ピース
│   ├── pieces/              # Piece definitions (workflow YAML)
│   ├── personas/            # Persona facets
│   ├── policies/            # Policy facets
│   ├── instructions/        # Instruction facets
│   ├── knowledge/           # Knowledge facets
│   └── output-contracts/    # Output contract facets
└── ja/                      # 日本語版ファセット・ピース
    ├── pieces/              # ピース定義（ワークフロー YAML）
    ├── personas/            # ペルソナファセット
    ├── policies/            # ポリシーファセット
    ├── instructions/        # インストラクションファセット
    ├── knowledge/           # ナレッジファセット
    └── output-contracts/    # 出力契約ファセット
.agent/skills/               # TAKT スキル（実体の配置場所）
├── takt-analyze/            # ピース・ファセットの分析と改善提案
├── takt-facet/              # 個別ファセットの作成・編集
├── takt-optimize/           # ワークフローの最適化
└── takt-piece/              # ピース（ワークフロー YAML）の作成
.claude/skills/              # シンボリックリンク → .agent/skills/（Claude Code 用）
.codex/skills/               # シンボリックリンク → .agent/skills/（Codex CLI 用）
references/
├── takt/                    # takt ビルトインとドキュメント（submodule / インストーラ）
└── okite-ai/                # AI ルール集（submodule）
scripts/
└── takt.sh                  # takt 実行ラッパー
```

## 影響を受けたツール

本プロジェクトは以下のプロジェクトにインスパイアされている：

- [Kiro](https://github.com/kirodotdev/Kiro) - Amazon による SDD ベースの AI 開発環境
- [cc-sdd](https://github.com/gotalab/cc-sdd) - 複数の AI コーディングエージェントに対応した SDD ツール
