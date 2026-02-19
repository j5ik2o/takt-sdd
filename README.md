# takt-sdd

[takt](https://github.com/nrslib/takt) を用いた Spec-Driven Development（SDD: 仕様駆動開発）ワークフロー定義リポジトリ。

要件定義から設計・タスク分解・実装・レビュー・検証までの開発フローを、takt のピース（YAML ワークフロー）とファセット群で自動化する。

## インスパイア元

本プロジェクトは以下のプロジェクトにインスパイアされている：

- [Kiro](https://github.com/kirodotdev/Kiro) - Amazon による SDD ベースの AI 開発環境
- [cc-sdd](https://github.com/gotalab/cc-sdd) - 複数の AI コーディングエージェントに対応した SDD ツール

takt-sdd は cc-sdd の仕様フォーマット（`.kiro/specs/`）と互換性があるため、併用が可能。

## 特徴

takt-sdd は [takt](https://github.com/nrslib/takt) のステートマシンベースのワークフロー制御により、AI エージェントの実行パスを決定論的に管理する。

- **宣言的ワークフロー制御** — AI エージェントの実行順序・遷移条件をピース（YAML）で宣言的に定義する。AI の出力自体は非決定的だが、「どのステップを、どの順序で、どの条件で遷移するか」は YAML のルールで決定論的に制御される。自由形式のチャットではなく、ステートマシンとしてワークフローが進行する。
- **Faceted Prompting** — プロンプトを 5 つの独立した関心事（Persona / Policy / Instruction / Knowledge / Output Contract）に分離する。各ファセットは再利用・差し替え可能で、ピース間で共有できる。モノリシックなプロンプトの重複を排除し、保守性を向上させる。
- **多段階バリデーション** — 要件・設計・実装の各フェーズにバリデーションゲートを配置する。ギャップ分析、設計レビュー（GO/NO-GO 判定）、アーキテクチャ / QA / 実装の並列レビューにより、品質問題を早期に検出し手戻りを最小化する。
- **ループ検出と監督制御** — plan→implement、review→fix などの反復パターンを自動検出する。閾値超過時にスーパーバイザーが介入して進捗の有無を判定し、非生産的なループを自動的にエスカレーションする。
- **適応型バッチ実装** — タスク間の依存関係を分析し、逐次実行と並列実行を自動選択する。独立したタスクは複数ワーカーで並列処理される。
- **プロバイダ非依存** — 同じピース定義が Claude / Codex 等の異なるプロバイダで動作する。

## 前提条件

- [takt](https://github.com/nrslib/takt) がインストール済みであること

## インストール

自分のプロジェクトに SDD ワークフローを導入するには、プロジェクトルートで以下を実行する：

```bash
npx create-takt-sdd
```

日本語メッセージで実行する場合：

```bash
npx create-takt-sdd --lang ja
```

`.takt/` ディレクトリにピースとファセット群がインストールされる。
既存の `.takt/` がある場合は `--force` で上書きできる。

## 概要

SDD は以下のフェーズを順に実行する：

| Phase | ピース | 内容 |
|-------|--------|------|
| 1 | `sdd-requirements` | EARS 形式による要件ドキュメント生成 |
| 1.5 | `sdd-validate-gap` | 要件と既存コードベースのギャップ分析 |
| 2 | `sdd-design` | 要件に基づく技術設計と発見ログの生成 |
| 2.5 | `sdd-validate-design` | 設計の品質レビューと GO/NO-GO 判定 |
| 3 | `sdd-tasks` | 実装タスクリストの生成 |
| 4 | `sdd-impl` | 適応型バッチ実装（逐次/並列ワーカー対応） |
| 5 | `sdd-validate-impl` | アーキテクチャ・QA・実装の並列レビュー |

フルオートピース `sdd` を使うと、Phase 1〜5 を自動遷移で一括実行できる。

## 使い方

### フルオート実行

要件定義→ギャップ分析→設計→設計検証→実装→実装検証 を一括で実行します。

```bash
takt --pipeline --skip-git --create-worktree no -w sdd -t "要件の説明..."
# 対話的なら
# takt -w sdd
```

### フェーズ別実行

各フェーズのワークフローを実行した後に、人間の介入を挟むことができます。

```bash
# Phase 1: 要件生成
takt --pipeline --skip-git --create-worktree no -w sdd-requirements -t "要件の説明..."
# 対話的なら
# takt -w sdd-requirements
# .kiro/specs/{feature} の ｛feature}を確認すること

# Phase 1.5: ギャップ分析（既存コードがある場合のみ）
takt --pipeline --skip-git --create-worktree no -w sdd-validate-gap -t "feature={feature}"
# 対話的なら
# takt -w sdd-validate-gap

# Phase 2: 設計生成
takt --pipeline --skip-git --create-worktree no -w sdd-design -t "feature={feature}"
# 対話的なら
# takt -w sdd-design

# Phase 2.5: 設計検証
takt --pipeline --skip-git --create-worktree no -w sdd-validate-design -t "feature={feature}"
# 対話的なら
# takt -w sdd-validate-design

# Phase 3: タスク生成
takt --pipeline --skip-git --create-worktree no -w sdd-tasks -t "feature={feature}"
# 対話的なら
# takt -w sdd-tasks

# Phase 4: 実装
takt --pipeline --skip-git --create-worktree no -w sdd-impl -t "feature={feature}"
# 対話的なら
# takt -w sdd-impl

# Phase 5: 実装検証
takt --pipeline --skip-git --create-worktree no -w sdd-validate-impl -t "feature={feature}"
# 対話的なら
# takt -w sdd-validate-impl
```

### 出力ファイル

各フェーズの成果物は `.kiro/specs/{feature}/` に出力される。cc-sdd の仕様フォーマットと互換性がある。

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

```bash
takt --pipeline --skip-git --create-worktree no -w steering -t "steeringを同期" 
# 対話的なら
# takt -w steering
```

### steering-custom

API 標準、テスト戦略、セキュリティなど、特定ドメインのsteeringファイルを作成する。`.takt/knowledge/steering-custom-template-files/` にテンプレートが用意されている。

```bash
takt --pipeline --skip-git --create-worktree no -w steering-custom -t "api-standards"
# .takt/knowledge/steering-custom-template-files/{name}.mdの{name}を指定する
# 対話的なら
# takt -w steering-custom
```

## プロジェクト構造

```
.takt/
├── pieces/                  # ピース定義（ワークフロー YAML）
│   ├── sdd.yaml             # フルオート（Phase 1〜5 一括）
│   ├── sdd-requirements.yaml
│   ├── sdd-design.yaml
│   ├── sdd-tasks.yaml
│   ├── sdd-impl.yaml
│   ├── sdd-validate-gap.yaml
│   ├── sdd-validate-design.yaml
│   ├── sdd-validate-impl.yaml
│   ├── steering.yaml            # プロジェクトメモリ管理（Bootstrap/Sync）
│   └── steering-custom.yaml     # カスタムsteering作成
├── personas/                # ペルソナファセット
├── policies/                # ポリシーファセット
├── instructions/            # インストラクションファセット
├── knowledge/               # ナレッジファセット
└── output-contracts/        # 出力契約ファセット
references/
├── takt/                    # takt 本体（submodule）
└── okite-ai/                # AI ルール集（submodule）
scripts/
└── takt.sh                  # takt 実行ラッパー
```
