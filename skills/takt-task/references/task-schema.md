# TaskRecord スキーマ詳細

ソース: `references/takt/src/infra/task/schema.ts`

## TaskRecord フィールド一覧

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|---------|------|
| `name` | string | YES | - | タスク識別名（AI自動生成、一意） |
| `status` | enum | YES | - | `pending` / `running` / `completed` / `failed` |
| `piece` | string | - | - | 実行ピース名（例: `default`, `expert`） |
| `task_dir` | string | ※ | - | タスクディレクトリパス（`.takt/tasks/{slug}` 形式） |
| `content` | string | ※ | - | インラインタスク本文（レガシー） |
| `content_file` | string | ※ | - | 外部ファイルパス参照（レガシー） |
| `slug` | string | - | - | 短い一意識別子 |
| `created_at` | ISO8601 | YES | - | タスク作成時刻 |
| `started_at` | ISO8601/null | YES | null | 実行開始時刻 |
| `completed_at` | ISO8601/null | YES | null | 実行完了時刻 |
| `worktree` | bool/string | - | - | `true`（自動）/ パス文字列 / 省略 |
| `branch` | string | - | auto | gitブランチ名（省略時: `takt/{timestamp}-{slug}`） |
| `auto_pr` | boolean | - | false | 実行後にPR自動作成 |
| `draft_pr` | boolean | - | false | PRをドラフト状態で作成 |
| `issue` | int | - | - | GitHub Issue番号 |
| `start_movement` | string | - | - | 開始movement名（pieceのinitial_movementを上書き） |
| `retry_note` | string | - | - | リトライ時のメモ |
| `worktree_path` | string | - | - | 実行時worktree絶対パス（自動設定） |
| `pr_url` | string | - | - | 生成PR URL（自動設定） |
| `summary` | string | - | - | 実行結果サマリ（自動設定） |
| `owner_pid` | int/null | - | null | 実行中プロセスPID（自動設定） |
| `failure` | object | - | - | 失敗情報（自動設定） |

**※ `content`, `content_file`, `task_dir` のいずれか正確に1つが必須。**

推奨: 新規タスクは `task_dir` 形式で作成する。

## TaskFailure オブジェクト

```yaml
failure:
  movement: plan         # 失敗が発生したmovement名（任意）
  error: "エラーメッセージ"  # エラー本体（必須）
  last_message: "..."    # 最後の出力（任意）
```

## ステータス遷移と不変条件

```
pending ──→ running ──→ completed
                └──→ failed
```

| フィールド | pending | running | completed | failed |
|----------|---------|---------|-----------|--------|
| started_at | **null** | 必須 | 必須 | 必須 |
| completed_at | **null** | **null** | 必須 | 必須 |
| owner_pid | **null** | 任意 | **null** | **null** |
| failure | **null** | **null** | **null** | 必須 |

## task_dir パス形式

- 相対パス必須（絶対パス不可）
- `.takt/tasks/<slug>` 形式
- slug例: `20260201-015714-foptng`（`{YYYYMMDD}-{HHmmss}-{random6}`）

## テンプレート変数（order.md内では不要）

order.md自体ではテンプレート変数は不要。エンジンが `{task}` として自動注入する。

ピースの `instruction_template` 内では以下が使用可能:

| 変数 | 説明 |
|------|------|
| `{task}` | タスク内容（自動注入） |
| `{previous_response}` | 前movement出力 |
| `{iteration}` | ピース全体イテレーション数 |
| `{report_dir}` | レポートディレクトリ名 |
| `{report:filename}` | レポートファイル内容 |
