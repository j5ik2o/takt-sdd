---
name: takt-task
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

## 参照資料

taktのタスク管理に関する資料は `references/takt/` にある。必要に応じて以下を参照する。

| 資料 | パス | 用途 |
|------|------|------|
| タスク管理ドキュメント | `references/takt/docs/task-management.ja.md` | タスクワークフロー全体 |
| TaskRecordスキーマ | `references/takt/src/infra/task/schema.ts` | フィールド定義・バリデーション |
| タスク形式仕様 | `references/takt/builtins/project/tasks/TASK-FORMAT` | task_dir形式の詳細 |
| スキーマ詳細 | このスキルの `references/task-schema.md` | フィールド一覧・ステータス遷移 |
| バリデーションスクリプト | このスキルの `validate-order-md.sh` | order.md の構造検証 |

**重要**: TaskRecordのステータス遷移ルールは厳密にバリデーションされる。`references/task-schema.md` を読んで不変条件を把握する。

## ワークフロー

### Step 1: 要件ヒアリング

以下を確認する（不明な点はユーザーに質問）:

1. **タスク内容**: 何を実行するタスクか
2. **ピース**: 使用するpiece名（`default`, `expert`, カスタム等）
3. **隔離実行**: worktreeの要否（`true` / パス / 省略）
4. **ブランチ**: カスタムブランチ名（省略時は自動生成）
5. **PR自動作成**: `auto_pr` / `draft_pr` の要否
6. **Issue連携**: GitHub Issue番号（該当する場合）

### Step 2: タスクディレクトリの作成

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

### Step 3: tasks.yamlエントリの生成

`.takt/tasks.yaml` に新しいタスクレコードを追加する。ファイルが存在しない場合は以下で初期化する:

```yaml
tasks: []
```

#### 最小構成（task_dir形式）

```yaml
tasks:
  - name: add-auth-feature
    status: pending
    piece: default
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
    piece: default
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
    piece: default
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

### Step 4: 検証

作成したタスクの整合性を確認する（詳細は `references/task-schema.md` を参照）:

- [ ] `task_dir` が `.takt/tasks/<slug>` 形式か
- [ ] `task_dir` 指定時に `order.md` が実在するか
- [ ] `status: pending` で `started_at: null`, `completed_at: null` か
- [ ] `created_at` がISO8601形式か
- [ ] `content`, `content_file`, `task_dir` のいずれか1つのみ指定されているか
- [ ] `piece` 名が既存のピース（ビルトインまたはカスタム）と一致するか
- [ ] 既存タスクの `tasks.yaml` 全体構造が壊れていないか

#### order.md 構造バリデーション

`validate-order-md.sh` を実行して order.md の構造を機械的に検証できる:

```bash
bash .agent/skills/takt-task/scripts/validate-order-md.sh
```

検証項目:
- slug フォーマット（`YYYYMMDD-HHmmss-xxxxxx`）
- `## 目的` セクションの存在と内容
- `## 要件` セクションの `- [ ]` チェックボックスアイテム（1件以上）
- `## 受け入れ基準` セクションの項目（1件以上）
- `tasks.yaml` の `task_dir` → `order.md` 存在クロスチェック

### ステータス遷移チェック（既存タスク編集時）

| 遷移 | 有効 |
|------|------|
| pending → running | YES |
| running → completed | YES |
| running → failed | YES |
| pending → completed | NO（runningを経由する必要あり） |
| completed → pending | NO（新規タスクとして再作成） |
