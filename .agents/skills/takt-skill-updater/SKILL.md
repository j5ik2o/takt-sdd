---
name: takt-skill-updater
description: >
  references/taktサブモジュール更新時に、takt-*スキル群（takt-task-builder, takt-workflow-builder,
  takt-facet-builder, takt-analyzer, takt-optimizer）を最新のtaktバージョンに追従させるスキル。
  TypeScriptスキーマ（schema.ts）、ワークフローYAML、ファセットMarkdownの差分を検出し、
  SKILL.md・参照ドキュメント（task-schema.md等）を体系的に更新する。
  トリガー：「taktスキルを更新」「takt-*スキルの鮮度チェック」「taktバージョンアップ対応」
  「スキルが古くないか確認」「takt skill updater」
---

# TAKT Skill Updater

references/taktサブモジュール更新後に、takt-*スキル群を最新バージョンに追従させる。

> **前提 takt バージョン**: v0.35.4

## パス表記について

本スキルでは `skills/` で始まるパスを使用する。実際のパスは実行環境に応じて読み替える：

| 環境 | プレフィックス |
|------|---------------|
| Claude Code | `.claude/skills/` |
| Codex CLI | `.codex/skills/` |
| 共通（実体） | `.agents/skills/` |

## 対象スキル

| スキル | 実体パス | チェック対象 |
|--------|---------|-------------|
| takt-task-builder | `skills/takt-task-builder/SKILL.md` | TaskRecordスキーマ、ステータス遷移、フィールド一覧 |
| takt-workflow-builder | `skills/takt-workflow-builder/SKILL.md` | ビルトインワークフロー一覧、YAML構造、新機能フィールド |
| takt-facet-builder | `skills/takt-facet-builder/SKILL.md` | ファセット種別、スタイルガイド参照パス |
| takt-analyzer | `skills/takt-analyzer/SKILL.md` | エンジン仕様参照、ビルトインパス |
| takt-optimizer | `skills/takt-optimizer/SKILL.md` | ログ形式、最適化パラメータ |

## ワークフロー

### Step 1: takt バージョン確認

references/taktの現在のバージョンと、各スキルが前提とするバージョンを比較する。

```bash
# 現在のサブモジュールバージョン
NEW_VERSION=$(cd references/takt && git describe --tags --abbrev=0)
echo "現在のtaktバージョン: ${NEW_VERSION}"

# 各スキルの前提バージョン（旧バージョンの特定に使う）
grep -r "前提 takt バージョン" skills/takt-*-builder/SKILL.md skills/takt-analyzer/SKILL.md skills/takt-optimizer/SKILL.md
```

各スキルの前提バージョンから旧バージョン（`OLD_VERSION`）を特定する。全スキルが同じバージョンであればその値を使う。異なる場合は最も古いバージョンを `OLD_VERSION` とする。

`OLD_VERSION` と `NEW_VERSION` が一致していれば更新不要。差分がある場合は Step 1.5 に進む。

### Step 1.5: リファレンスファイルの同期

サブモジュール更新後、各スキルの `references/takt/` ディレクトリにリファレンスファイルを同期する。
`rsync --delete` により、サブモジュール側で削除されたファイルもスキル側から自動的に削除される。

```bash
# dry-run で確認
scripts/sync-takt-references.sh --dry-run

# 問題なければ実行
scripts/sync-takt-references.sh
```

各スキルには自身が参照する takt リソースのサブセットのみが同期される。
同期対象の定義は `scripts/sync-takt-references.sh` 内の各スキルセクションを参照。

### Step 2: タグ間差分の取得

旧バージョンと現バージョン間の差分を取得し、どのスキルに影響があるかを判定する。

```bash
cd references/takt

# 変更されたファイル一覧
git diff --name-only ${OLD_VERSION}..${NEW_VERSION}

# 変更の統計（追加/削除行数）
git diff --stat ${OLD_VERSION}..${NEW_VERSION}

# 変更履歴（コミットメッセージ）
git log --oneline ${OLD_VERSION}..${NEW_VERSION}
```

#### 影響スキルの判定

変更されたファイルパスから影響スキルを判定する。該当しないスキルは以降のステップをスキップする。

| 変更ファイルのパスパターン | 影響スキル |
|---------------------------|-----------|
| `src/infra/task/schema.ts` | takt-task-builder |
| `builtins/**/pieces/*.yaml`, `builtins/**/workflows/*.yaml` | takt-workflow-builder |
| `builtins/**/facets/**` | takt-facet-builder |
| `builtins/**/*STYLE_GUIDE*.md` | takt-facet-builder |
| `builtins/skill/references/engine.md` | takt-analyzer, takt-workflow-builder |
| `builtins/skill/references/yaml-schema.md` | takt-workflow-builder |
| `src/**/log*`, `src/**/trace*` | takt-optimizer |

### Step 3: 影響スキルの詳細チェック

影響ありと判定されたスキルについて、タグ間差分の詳細を確認し、各スキルへの反映内容を特定する。

```bash
cd references/takt

# 影響ファイルの詳細差分を確認（例）
git diff ${OLD_VERSION}..${NEW_VERSION} -- src/infra/task/schema.ts
git diff ${OLD_VERSION}..${NEW_VERSION} -- builtins/ja/workflows/
git diff ${OLD_VERSION}..${NEW_VERSION} -- builtins/ja/facets/
git diff ${OLD_VERSION}..${NEW_VERSION} -- builtins/skill/references/
```

以下の領域を、影響ありと判定されたもののみチェックする。

#### a) TaskRecord スキーマ差分（→ takt-task-builder）

差分で `src/infra/task/schema.ts` の変更を確認し、以下の観点で反映内容を特定する：

| 確認項目 | 参照元 | 更新先 |
|---------|--------|--------|
| ステータス enum 値 | `TaskStatusSchema` | `skills/takt-task-builder/references/task-schema.md` |
| TaskExecutionConfig フィールド | `TaskExecutionConfigSchema` | `skills/takt-task-builder/references/task-schema.md` |
| TaskRecord フィールド | `TaskRecordSchema` | `skills/takt-task-builder/references/task-schema.md` |
| superRefine バリデーション | `TaskRecordSchema.superRefine` | `skills/takt-task-builder/references/task-schema.md` ステータス遷移表 |
| TaskFailure 構造 | `TaskFailureSchema` | `skills/takt-task-builder/references/task-schema.md` |

#### b) ビルトインワークフロー差分（→ takt-workflow-builder）

差分で `builtins/**/workflows/*.yaml`（旧 `builtins/**/pieces/*.yaml`）の変更を確認し、以下の観点で反映内容を特定する：

| 確認項目 | 更新先 |
|---------|--------|
| ワークフロー名のリネーム | `skills/takt-workflow-builder/SKILL.md` ビルトインテーブル |
| 新規追加ワークフロー | `skills/takt-workflow-builder/SKILL.md` ビルトインテーブル |
| 削除されたワークフロー | `skills/takt-workflow-builder/SKILL.md` ビルトインテーブル |
| ワークフローYAML新フィールド | `skills/takt-workflow-builder/SKILL.md` 設計判断ガイド |

#### c) ファセット構造差分（→ takt-facet-builder）

差分で `builtins/**/facets/**` と `*STYLE_GUIDE*.md` の変更を確認し、以下の観点で反映内容を特定する：

| 確認項目 | 更新先 |
|---------|--------|
| スタイルガイドの内容変更 | `skills/takt-facet-builder/SKILL.md` 参照資料テーブル |
| ファセット種別の追加/変更 | `skills/takt-facet-builder/SKILL.md` ファセット作成規約 |
| 新規ビルトインファセット | `skills/takt-facet-builder/SKILL.md` 参照例 |

#### d) エンジン仕様差分（→ takt-analyzer, takt-optimizer）

差分で `builtins/skill/references/` 配下の変更を確認し、以下の観点で反映内容を特定する：

| 確認項目 | 更新先 |
|---------|--------|
| ルール評価方式の変更 | `skills/takt-analyzer/SKILL.md`, `skills/takt-workflow-builder/SKILL.md` |
| 新しいステップ種別 | `skills/takt-workflow-builder/SKILL.md` |
| ログフォーマット変更 | `skills/takt-optimizer/SKILL.md` |
| テンプレート変数の追加 | `skills/takt-task-builder/references/task-schema.md` |

### Step 4: スキル更新の実施

Step 3 で特定した反映内容をもとに、影響のあるスキルを更新する。

#### 更新ルール

1. **バージョン表記**: 各 SKILL.md の `> **前提 takt バージョン**:` を `NEW_VERSION` に更新
2. **フィールド追加**: 新フィールドは既存テーブルの末尾に追加（順序を保持）
3. **リネーム**: 旧名→新名の注意書きを添える（例: 「v0.28.1 で `expert` → `dual` にリネーム」）
4. **削除**: テーブルから削除し、注意書きで言及
5. **参照ドキュメント**: `skills/takt-task-builder/references/task-schema.md` 等のリファレンスファイルも同時に更新

#### 更新対象ファイル一覧

| ファイル | 更新内容 |
|---------|---------|
| `skills/takt-task-builder/SKILL.md` | ステータス遷移表、フィールド参照、ワークフロー名例 |
| `skills/takt-task-builder/references/task-schema.md` | フィールド一覧、ステータス遷移図、不変条件テーブル |
| `skills/takt-workflow-builder/SKILL.md` | ビルトインワークフローテーブル、YAML構造例、設計判断ガイド |
| `skills/takt-facet-builder/SKILL.md` | 参照パス、ファセット作成規約 |
| `skills/takt-analyzer/SKILL.md` | 参照パス、分析基準 |
| `skills/takt-optimizer/SKILL.md` | ログ形式、最適化パラメータ |

#### takt-skill-updater 自身の更新

対象スキルの更新が完了したら、このスキル自身も更新する：

1. 冒頭の `> **前提 takt バージョン**:` を `NEW_VERSION` に更新
2. 末尾の「過去の更新履歴」セクションに今回の変更内容を追記

### Step 5: バリデーション

更新後の整合性を確認する。

#### 自動検証

```bash
# order.md バリデーション（takt-task-builder）
bash skills/takt-task-builder/scripts/validate-order-md.sh

# ピース・ファセット バリデーション（takt-workflow-builder）
bash skills/takt-workflow-builder/scripts/validate-takt-files.sh --pieces
```

#### 手動検証チェックリスト

- [ ] 全 SKILL.md の `前提 takt バージョン` が `NEW_VERSION` に更新されている
- [ ] `task-schema.md` のステータス enum が `skills/takt-task-builder/references/takt/src/infra/task/schema.ts` の `TaskStatusSchema` と一致
- [ ] `task-schema.md` のフィールド一覧が `TaskRecordSchema` と `TaskExecutionConfigSchema` の全フィールドを網羅
- [ ] `task-schema.md` の不変条件テーブルが `superRefine` のバリデーションルールと一致
- [ ] `takt-workflow-builder/SKILL.md` のビルトインテーブルが `skills/takt-workflow-builder/references/takt/builtins/ja/workflows/` の実態と整合
- [ ] `takt-workflow-builder/SKILL.md` で廃止・リネームされたワークフロー名が残っていない
- [ ] `takt-facet-builder/SKILL.md` の参照パスが全て実在する
- [ ] `takt-analyzer/SKILL.md` の参照パスが全て実在する
- [ ] takt-skill-updater 自身の `前提 takt バージョン` と「過去の更新履歴」が更新されている

### Step 6: コミットとPR

更新内容をコミットする。

#### ブランチ命名規約

```
chore/update-takt-skills-for-v{バージョン}
```

例: `chore/update-takt-skills-for-v031`

#### コミットメッセージテンプレート

```
chore: update takt-* skills for takt v{バージョン}

- Add "前提 takt バージョン: v{バージョン}" to all takt-* skills
- takt-task-builder: {変更サマリ}
- takt-workflow-builder: {変更サマリ}
- Update references/takt submodule to v{バージョン}
```

## 過去の更新履歴

今後の更新時に参照できるよう、主要な変更をここに記録する。

### v0.31.0 → v0.35.4（2026-04-13）

| スキル | 変更内容 |
|--------|---------|
| 全スキル | `前提 takt バージョン: v0.35.4` に更新。大規模用語リネーム: `piece` → `workflow`、`movement` → `step`、`pieces/` → `workflows/`、`initial_movement` → `initial_step`、`max_movements` → `max_steps`、`piece_config` → `workflow_config`。旧名はエイリアスとして互換あり |
| takt-task-builder | `piece` → `workflow`（エイリアス互換）、`start_movement` → `start_step`、`exceeded_max_movements` → `exceeded_max_steps`。新フィールド: `run_slug`, `should_publish_branch_to_origin`, `source`（`pr_review`/`issue`/`manual`）, `pr_number`（`source: pr_review` 時必須） |
| takt-workflow-builder | `pieces/` → `workflows/` ディレクトリ移動。ワークフローYAMLの `movements` → `steps`、`initial_movement` → `initial_step`、`max_movements` → `max_steps`。ビルトインテーブル刷新: review系分離（`review-default`, `review-backend` 等）、audit系ワークフロー新規追加（`audit-architecture`, `audit-e2e`, `audit-security`, `audit-unit` 等）。`e2e-test`/`unit-test` 削除→audit系に統合 |
| takt-facet-builder | テンプレートディレクトリ廃止（既存ファセット参照に変更）。新規ファセット大量追加: Instruction（`architecture-audit-*`, `audit-security-*`, `e2e-audit-*`, `e2e-coverage-*`, `unit-audit-*`, `write-tests-first`）、Knowledge（`e2e-testing`, `react`, `unit-testing`）、Output Contract（`architecture-audit-*`, `audit-security`, `e2e-audit-*`, `e2e-coverage-plan`, `plan-frontend`, `test-report`, `unit-audit-*`）、Policy（`design-fidelity`, `design-planning`, `task-decomposition`）、Persona（`architect-planner`, `research-*`, `conductor`, `test-planner`, `ai-antipattern-reviewer`）。`implement-e2e-test`/`plan-e2e-test` 削除 |
| takt-analyzer | `ムーブメント` → `ステップ`、`ピースYAML` → `ワークフローYAML` 用語統一。ビルトイン参照パスを `workflows/` に更新 |
| takt-optimizer | `ムーブメント統合` → `ステップ統合`。全用語を `step`/`workflow` に統一。参照パスを `workflows/` に更新 |

### v0.29.0 → v0.31.0（2026-03-09）

| スキル | 変更内容 |
|--------|---------|
| 全スキル | `前提 takt バージョン: v0.31.0` に更新 |
| takt-task-builder | `pr_failed` ステータス（6番目の終端状態）の遷移テーブルに追加 |
| takt-workflow-builder | ビルトインテーブルを現行ピース一覧に刷新（`expert`/`default-mini`/`review-only` → `dual`/`backend`/`frontend`/`review`/`takt-default` 等）。`allowed_tools` → `provider_options.claude.allowed_tools` 移行例を追加。Loop monitor の `instruction` をビルトインファセット参照へ統一。`takt-default-team-leader` 廃止（`takt-default` に統合） |
| takt-facet-builder | ビルトイン一覧を大幅拡充（Instruction: `dual-team-leader-implement`, `loop-monitor-reviewers-fix`, `team-leader-implement` 等追加。Knowledge: `task-decomposition` 追加。Persona: `supervisor`, `dual-supervisor` 等追加。Output Contract: 各レビュー系追加）。レビュー出力契約に `family_tag`/`reopened` セクション構造追加 |
| takt-analyzer | `provider_options` 構造チェック項目追加。`*-provider-events.jsonl`（別ファイル）と `trace.md` のログ記述追加。`observability` → `logging` リネーム反映 |
| takt-optimizer | `instruction` 参照正規化・`allowed_tools` の `provider_options` 移行の最適化項目追加 |

### v0.29.0 → v0.30.0（2026-03-06、未適用 → v0.31.0 に統合）

| スキル | 変更内容 |
|--------|---------|
| 全スキル | `前提 takt バージョン: v0.30.0` に更新 |
| takt-task-builder | `pr_failed` ステータス（6番目の終端状態）追加。PR作成失敗を `failed` と分離。`failure` は任意（`failed` と異なり必須ではない） |
| takt-workflow-builder | `allowed_tools` → `provider_options.claude.allowed_tools` に移動。Loop monitor の `instruction` をビルトインファセット参照（`loop-monitor-ai-fix`, `loop-monitor-reviewers-fix`）へ統一。設計判断ガイドに `provider_options` 追加 |
| takt-facet-builder | ビルトイン Instruction に `loop-monitor-ai-fix`, `loop-monitor-reviewers-fix` 追加。レビュー出力契約に `family_tag`/`new`/`persists`/`resolved`/`reopened` セクション構造追加 |
| takt-analyzer | `provider_options` 構造チェック項目追加。`*-provider-events.jsonl`（別ファイル）と `trace.md` のログ記述追加。`observability` → `logging` リネーム反映 |
| takt-optimizer | `instruction` 参照正規化の最適化項目追加 |

### v0.22.0 → v0.29.0（2026-03-04）

| スキル | 変更内容 |
|--------|---------|
| 全スキル | `前提 takt バージョン: v0.29.0` を追加 |
| takt-task-builder | `exceeded` ステータス（5番目の終端状態）追加。`base_branch`, `exceeded_max_movements`, `exceeded_current_iteration` フィールド追加 |
| takt-workflow-builder | `expert` → `dual` リネーム（v0.28.1）。`default-mini` 廃止。`review-fix` 系・`backend`/`frontend` 系ピース追加。`quality_gates` フィールド追加 |
| takt-facet-builder | 変更なし |
| takt-analyzer | 変更なし |
| takt-optimizer | `provider-events.jsonl` 追加（minor） |
