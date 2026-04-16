---
name: takt-task-builder
description: >
  TAKTのtasks.yaml（タスクメタデータ）とタスクディレクトリ（.takt/tasks/{slug}/order.md）の
  作成・編集を支援するスキル。TaskRecordスキーマに準拠したYAMLエントリの生成、
  order.mdタスク仕様書の作成、ステータス遷移ルールの検証を行う。
  references/taktにあるtaskスキーマ定義・ドキュメントを参照資料として活用する。
  トリガー：「タスクを追加」「tasks.yamlを編集」「taktタスクを作成」
  「タスク仕様書を書く」「order.mdを作成」「takt task」「タスクを定義」
  「pendingタスクを追加」「GitHub Issueからタスク作成」
---

# TAKT Task Creator

TAKTのtasks.yamlエントリとタスクディレクトリ（order.md）を作成・編集する。

> **前提 takt バージョン**: v0.36.0

## 参照資料

taktのタスク管理に関する資料は `references/takt/` にある。必要に応じて以下を参照する。

| 資料 | パス | 用途 |
|------|------|------|
| タスク管理ドキュメント | `references/takt/docs/task-management.ja.md` | タスクワークフロー全体 |
| TaskRecordスキーマ | `references/takt/src/infra/task/taskRecordSchemas.ts` | フィールド定義・バリデーション |
| TaskExecutionConfigスキーマ | `references/takt/src/infra/task/taskExecutionSchemas.ts` | 実行設定フィールド定義 |
| タスク形式仕様 | `references/takt/builtins/project/tasks/TASK-FORMAT` | task_dir形式の詳細 |
| スキーマ詳細 | このスキルの `references/task-schema.md` | フィールド一覧・ステータス遷移 |
| バリデーションスクリプト | このスキルの `validate-order-md.sh` | order.md の構造検証 |

**重要**: TaskRecordのステータス遷移ルールは厳密にバリデーションされる。`references/task-schema.md` を読んで不変条件を把握する。

## ワークフロー

### Step 1: 要件ヒアリング

以下を確認する（不明な点はユーザーに質問）:

1. **タスク内容**: 何を実行するタスクか
2. **ワークフロー**: 使用するworkflow名（`default`, `dual`, カスタム等）
3. **隔離実行**: worktreeの要否（`true` / パス / 省略）
4. **ブランチ**: カスタムブランチ名（省略時は自動生成）
5. **PR自動作成**: `auto_pr` / `draft_pr` の要否
6. **Issue連携**: GitHub Issue番号（該当する場合）

### Step 2: 並列実行戦略の設計

複数タスクを作成する場合、並列実行の可否と分割戦略を設計する。単一タスクの場合はこのステップをスキップする。

#### a) TAKTの並列実行モデル

TAKTは `takt run` 時にワーカープールで複数タスクを並列実行できる。ただし、タスク間の依存関係メカニズム（`depends_on` 等）はない。

| 特性 | 内容 |
|------|------|
| 実行モデル | ワーカープール（`concurrency: 1-10`） |
| 依存関係 | なし（全 pending タスクが即座に実行対象） |
| 隔離 | `worktree: true` で git worktree による隔離 |
| 同期 | タスク間のライブ同期なし（クローン時点のスナップショットで作業） |
| マージ | 各タスク完了後に個別PR → 手動マージ |

**原則: 並列実行するタスクには必ず `worktree: true` を設定する。** 隔離なしの並列は作業ディレクトリの破壊につながる。

#### b) 直列区間の特定（Amdahl's Law 的観点）

タスク群の中に「先に完了しないと後続が作業できない」直列区間があるかを判別する。

| 直列要因 | 例 | 対策 |
|----------|-----|------|
| スキーマ変更 | DB マイグレーション | 先行タスクに統合 |
| 共通型定義 | 共有 interface / struct の新規作成 | 型定義タスクを先行実行 |
| 設定ファイル変更 | CI/CD、ビルド設定 | 先行タスクに統合 |
| API 仕様策定 | OpenAPI スキーマ | 仕様策定を先行実行 |

**ヒアリング質問**: 「タスク間で、あるタスクの成果物が別タスクの入力になる依存関係はありますか？」

#### c) 共有リソース競合の分析（USL: 競合コスト α）

同じリソースを複数タスクが変更すると、マージコンフリクトが発生する。

| 共有リソース | 競合リスク | 推奨対策 |
|-------------|-----------|----------|
| 同一ソースファイル | 高 | **タスクを統合する** |
| 同一設定ファイル | 高 | **タスクを統合する** |
| 同一テストファイル | 中 | 統合を検討 |
| 同一パッケージの異なるファイル | 低 | 並列可（ただし import 追加に注意） |
| 完全に異なるモジュール | なし | 安全に並列可 |

**原則: 「同じファイルを2つのタスクが変更する可能性があるなら統合する」**

#### d) 整合性コストの分析（USL: 整合性コスト β）

タスク間で共有型やインターフェースの一貫性を保つコスト。TAKTではタスク間のライブ同期がないため、クローン時点のスナップショットで各タスクが作業する。

| 整合性要因 | β 影響 | 対策 |
|-----------|--------|------|
| 共有型のフィールド追加 | 高 | 型定義側を先行実行 |
| 共通インターフェースの変更 | 高 | インターフェース変更を先行 |
| 同一モジュールへの export 追加 | 中 | index ファイル競合に注意 |
| 独立モジュール間の型参照 | 低 | 並列可 |

#### e) タスク分割・統合の判断表

| # | シナリオ | ファイル競合 | 直列依存 | 判断 | 推奨 concurrency |
|---|---------|------------|---------|------|-----------------|
| 1 | 独立モジュール A, B, C の実装 | なし | なし | **並列** | `min(タスク数, 5)` |
| 2 | 同一モジュール内の複数機能追加 | あり | なし | **統合** | `1` |
| 3 | API 定義 + その実装 | あり | あり | **統合** | `1` |
| 4 | FE + BE（API 仕様確定済） | なし | なし | **並列** | `2` |
| 5 | FE + BE（API 仕様未確定） | なし | あり | **段階実行** | `1` → マージ → `1` |
| 6 | DB スキーマ + アプリ実装 | なし | あり | **段階実行** | `1` → マージ → 並列 |
| 7 | 独立バグ修正群 | なし | なし | **並列** | `min(タスク数, 5)` |
| 8 | 同一ファイルの複数バグ修正 | あり | なし | **統合** | `1` |
| 9 | リファクタリング + 新機能 | あり | あり | **統合** | `1` |

#### f) 推奨 concurrency 値ガイド

| タスク間関係 | 推奨 concurrency |
|-------------|-----------------|
| 完全独立（ファイル重複なし） | `min(タスク数, 5)` |
| 一部共有（低リスク） | `min(タスク数, 3)` |
| 型定義の消費関係のみ | `1`（段階実行） |
| 同一ファイル変更あり | `1`（統合を検討） |
| 強結合（直列依存 + ファイル共有） | `1` |

**注意**: `concurrency` は `takt run` のグローバル設定であり、タスク単位では指定できない。段階実行が必要な場合は `takt run` を複数回に分ける。

#### g) 並列パターン集

**Pattern A: 完全並列（独立モジュール）**

```yaml
tasks:
  - name: impl-module-a
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-aaaaaa
    worktree: true
    branch: feat/module-a
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-module-b
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-bbbbbb
    worktree: true
    branch: feat/module-b
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-module-c
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-cccccc
    worktree: true
    branch: feat/module-c
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
```

`takt run --concurrency 3` で並列実行。

**Pattern B: 依存統合（スキーマ + 実装を1タスクに）**

依存関係のあるタスクは1つに統合する。tasks.yaml のエントリはStep 4の最小構成と同じ。order.md 内にスキーマ変更と実装の両方を記述する。

**Pattern C: 段階実行（先行タスク → マージ → 後続並列）**

第1段階: 共通基盤

```yaml
tasks:
  - name: define-shared-types
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-eeeeee
    worktree: true
    branch: feat/shared-types
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
```

`takt run` で実行 → PR マージ後、第2段階のタスクを追加:

```yaml
tasks:
  - name: impl-consumer-x
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-110000-ffffff
    worktree: true
    branch: feat/consumer-x
    auto_pr: true
    created_at: "2026-03-01T11:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-consumer-y
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-110000-gggggg
    worktree: true
    branch: feat/consumer-y
    auto_pr: true
    created_at: "2026-03-01T11:00:00.000Z"
    started_at: null
    completed_at: null
```

`takt run --concurrency 2` で並列実行。

### Step 3: タスクディレクトリの作成

推奨形式: `task_dir`（order.md分離型）

#### slug生成

`{YYYYMMDD}-{HHmmss}-{random6}` 形式で生成する。

```
例: 20260223-143000-ab12cd
```

#### ディレクトリ構造

```
.takt/tasks/{slug}/
├── order.md          # タスク仕様（必須）
├── schema.sql        # 参考資料（任意）
└── wireframe.png     # 参考資料（任意）
```

#### order.md テンプレート

```markdown
# タスク仕様

## 目的

{1-2文でタスクの目的を記述}

## 要件

- [ ] {要件1}
- [ ] {要件2}
- [ ] {要件3}

## 受け入れ基準

- {基準1}
- {基準2}

## 参考情報

{該当する場合に記述。API仕様、設計ドキュメント等}
```

**注意**: order.md内でテンプレート変数（`{task}`等）は不要。エンジンが自動注入する。

### Step 4: tasks.yamlエントリの生成

`.takt/tasks.yaml` に新しいタスクレコードを追加する。ファイルが存在しない場合は以下で初期化する:

```yaml
tasks: []
```

#### 最小構成（task_dir形式）

```yaml
tasks:
  - name: add-auth-feature
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260223-143000-ab12cd
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### フル構成

```yaml
tasks:
  - name: add-auth-feature
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260223-143000-ab12cd
    slug: 20260223-143000-ab12cd
    worktree: true
    branch: feat/auth-feature
    auto_pr: true
    draft_pr: false
    issue: 28
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### content形式（レガシー、非推奨）

```yaml
tasks:
  - name: fix-login-bug
    status: pending
    workflow: default
    content: >-
      ログイン画面で認証エラーが発生する問題を修正する。
      原因: セッショントークンの有効期限チェックが不正。
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### コンテンツソースの排他制約

`content`, `content_file`, `task_dir` のいずれか**正確に1つ**が必須。複数指定はバリデーションエラー。

| 形式 | フィールド | 推奨度 |
|------|-----------|--------|
| タスクディレクトリ | `task_dir` | 推奨 |
| インライン | `content` | レガシー |
| 外部ファイル | `content_file` | レガシー |

### Step 5: 検証

作成したタスクの整合性を確認する（詳細は `references/task-schema.md` を参照）:

- [ ] `task_dir` が `.takt/tasks/<slug>` 形式か
- [ ] `task_dir` 指定時に `order.md` が実在するか
- [ ] `status: pending` で `started_at: null`, `completed_at: null` か
- [ ] `created_at` がISO8601形式か
- [ ] `content`, `content_file`, `task_dir` のいずれか1つのみ指定されているか
- [ ] `workflow` 名が既存のワークフロー（ビルトインまたはカスタム）と一致するか
- [ ] 既存タスクの `tasks.yaml` 全体構造が壊れていないか

#### 並列整合性チェック（複数タスク作成時）

- [ ] 同一ファイルを変更するタスクが分離されていないか（統合すべき）
- [ ] 共有型の定義タスクが消費タスクより先に実行される構成か（段階実行）
- [ ] 並列実行タスク全てに `worktree: true` が設定されているか
- [ ] 推奨 `concurrency` 値をユーザーに伝えたか

#### order.md 構造バリデーション

このスキルに同梱されている `scripts/validate-order-md.sh` を実行して order.md の構造を機械的に検証できる。
スキルの配置先（`.agents/skills/`, `.claude/skills/`, `.codex/skills/` 等）に応じたパスで実行する:

```bash
bash <このスキルのディレクトリ>/scripts/validate-order-md.sh
```

検証項目:
- slug フォーマット（`YYYYMMDD-HHmmss-xxxxxx`）
- `## 目的` セクションの存在と内容
- `## 要件` セクションの `- [ ]` チェックボックスアイテム（1件以上）
- `## 受け入れ基準` セクションの項目（1件以上）
- `tasks.yaml` の `task_dir` → `order.md` 存在クロスチェック

#### ワークフロー変更時の追加ゲート（必須）

このタスクで `.takt/workflows/*.yaml` を編集した場合は、完了判定前に `takt-workflow-builder` スキルのバリデーションスクリプトを実行する。
スキルの配置先に応じたパスで実行する:

```bash
bash <takt-workflow-builderスキルのディレクトリ>/scripts/validate-takt-files.sh --workflows
```

追加で、次の2点を確認する:
- loop monitor の健全時 `next` が `cycle` 先頭ノードと一致
- loop monitor の `{report:...}` 参照が cycle 内 step 生成物に限定されている

上記のどちらかが満たせない場合、そのタスクは `completed` にしない。

### ステータス遷移チェック（既存タスク編集時）

| 遷移 | 有効 |
|------|------|
| pending → running | YES |
| running → completed | YES |
| running → failed | YES |
| running → exceeded | YES（max_steps超過時） |
| running → pr_failed | YES（PR作成失敗時） |
| pending → completed | NO（runningを経由する必要あり） |
| completed → pending | NO（新規タスクとして再作成） |
| exceeded → pending | NO（新規タスクとして再作成） |
| pr_failed → pending | NO（新規タスクとして再作成） |
