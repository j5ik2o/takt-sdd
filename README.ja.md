# takt-sdd

[![npm version](https://img.shields.io/npm/v/create-takt-sdd)](https://www.npmjs.com/package/create-takt-sdd)
[![CI](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml)
[![Release](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml)
[![Publish takt-sdd](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-takt-sdd.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-takt-sdd.yml)
[![Publish create-takt-sdd](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-create-takt-sdd.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-create-takt-sdd.yml)
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

## Global CLI

`takt-sdd` は npm グローバルパッケージとして提供されており、repo ローカルの npm scripts を使わずに、任意のプロジェクトから `kiro-*` ワークフローを実行できる。

### インストール

```bash
npm install -g takt-sdd
```

### プロジェクトの初期化

```bash
takt-sdd init .
```

`init` は、インストール済みパッケージバージョンと一致したバンドル済み `.takt` 資産（ワークフロー・ファセット）を対象ディレクトリへ配置し、必要な devDependencies を `package.json` にマージする。  
`init` は `npm install` を**自動実行しない**。`init` が完了したら、手動で以下を実行すること：

```bash
npm install
```

### サポートコマンド一覧

| コマンド | 内容 |
|---------|------|
| `kiro-discovery` | feature idea を分類し、必要に応じて brief/roadmap を更新 |
| `kiro-spec-init` | プロジェクト説明を基に新しい spec を初期化 |
| `kiro-spec-requirements` | EARS 形式の要件を生成 |
| `kiro-spec-design` | 技術設計と発見ログを生成 |
| `kiro-spec-tasks` | 実装タスクを生成 |
| `kiro-spec-quick` | requirements / design / tasks を一括生成 |
| `kiro-spec-batch` | roadmap の依存順に複数 spec を生成 |
| `kiro-spec-status` | spec の phase・approval・readiness を報告 |
| `kiro-impl` | review/debug/verify gate 付きで approved task を実装 |
| `kiro-validate-gap` | 要件と既存コードベースの差分を確認 |
| `kiro-validate-design` | 設計品質をレビューし GO/NO-GO を返す |
| `kiro-validate-impl` | 実装 evidence と残る manual check を検証 |

`run` 形式でも実行できる：

```bash
takt-sdd run kiro-spec-design "feature=my-feature"
```

`run` 形式は直接コマンド形式と同等で、同じ supported workflow のみ実行可能。

### グローバルオプション

| オプション | 内容 |
|-----------|------|
| `--cwd <dir>` | 対象プロジェクトのルートディレクトリを指定（デフォルト：カレントディレクトリ） |

### `init` オプション

| オプション | 内容 |
|-----------|------|
| `--lang en\|ja` | 導入資産の言語と初期 language preference（デフォルト：`en`）。`--lang` 未指定時は既存の `.takt/config.yaml` の language 設定を参照する。 |
| `--force` | カスタマイズ済みファイルも上書きする（`create-takt-sdd --force` と同じ意味） |
| `--dry-run` | ファイルを書き込まずに変更予定を表示 |

`--tag` は global CLI では**サポートされていない**。インストール済みパッケージに同梱された資産が常に使用される。

### 退役済みワークフロー

**`cc-sdd-*` ワークフロー（v2.0.0 で退役済み）:** global CLI は `cc-sdd-*` コマンドを明示的なエラーで拒否する：

```bash
takt-sdd cc-sdd-full        # Error: `cc-sdd-*` workflows were retired in v2.0.0 and are no longer available.
takt-sdd run cc-sdd-full    # Error: 同様に拒否
```

**`opsx-*` ワークフロー（退役済み・将来再提供予定）:** global CLI は `opsx-*` コマンドを拒否する：

```bash
takt-sdd opsx-propose       # Error: `opsx-*` workflows have been retired and will be re-provided in a future release.
takt-sdd run opsx-full      # Error: 同様に拒否
```

### `.takt/config.yaml` の所有権

`.takt/config.yaml` は**ユーザー所有**のファイルである。グローバル（`~/.takt/config.yaml`）またはプロジェクト単位でユーザーが作成・管理する。CLI はこのファイルを**読み取るのみ**（`init` 時の language preference 解決やワークフロー解決に使用）。CLI はこのファイルを作成・変更しない。`init` による language preference の記録は `.takt/.manifest.json` に行われる。

## インストール（create-takt-sdd）

自分のプロジェクトに SDD ワークフローをインストーラで導入するには、プロジェクトルートで以下を実行する：

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
- **`package.json`** — 各フェーズの npm scripts と `takt` を devDependency に追加

オプション：

| オプション | 内容 |
|-----------|------|
| `--force` | 既存の `.takt/` を上書き |
| `--tag <version>` | 特定バージョンをインストール（`latest`, `0.2.0` 等） |
| `--lang <en\|ja>` | ファセット・メッセージの言語（デフォルト: `en`） |
| `--dry-run` | ファイルを書き込まずにプレビュー |

既存の `package.json` がある場合は npm scripts のみマージされる（既存のスクリプトは上書きしない）。

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

SDD ワークフローの実行には `kiro:*` scripts を使う。`cc-sdd:*` npm scripts の互換サーフェスは v2.0.0 で終了した。

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

## 既存プロジェクトの更新（v1.x → v2.0.0）

v1.x でインストールされたプロジェクトに対して `takt-sdd init .` を実行すると、インストーラは退役済みワークフロー資産（cc-sdd-* および opsx-* ワークフローファイル）のうちカスタマイズされていないものを自動削除し、manifest から記録を除去する。カスタマイズ済み（変更されている）資産は警告のみを表示して残置する。

`--dry-run` モードでは、削除予定のファイル一覧を表示するだけで実際の変更は行わない。

注意: `openspec/` ディレクトリおよびユーザーが自分で追加したファイルはインストーラが変更しない。

### 残存している `cc-sdd:*` / `opsx:*` scripts の手動削除

`init` は不足している `kiro:*` エントリを追加する以外、`package.json` の scripts を変更しない。プロジェクトに v1.x 時代の `cc-sdd:*` または `opsx:*` scripts が残っている場合は手動で削除すること。これらは存在しなくなったワークフローファイルを参照しているため、実行すると takt の解決エラーになる。

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
