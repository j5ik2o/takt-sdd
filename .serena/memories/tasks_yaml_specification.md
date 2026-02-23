# tasks.yaml構造・仕様 - 詳細レポート

## 概要
takt-sddプロジェクトで使用されるtasks.yamlは、TAKTの**タスク管理ワークフロー**用のメタデータファイル。複数タスクの蓄積・バッチ実行・進捗管理を実現する。

---

## ファイル位置と役割

### ファイルパス
- 標準: `.takt/tasks.yaml`（プロジェクトルート）
- 参照実装: `references/takt/builtins/project/tasks/TASK-FORMAT`

### 役割（3層構造）
1. **tasks.yaml** = メタデータ・ステータス記録（YAML）
2. **.takt/tasks/{slug}/order.md** = 詳細仕様（Markdown、編集可能）
3. **.takt/runs/{slug}/reports/** = 実行結果・レポート（自動生成）

---

## tasks.yaml スキーマ（Zod定義）

### トップレベル
```typescript
TasksFileSchema = z.object({
  tasks: z.array(TaskRecordSchema)
})
```

### TaskRecord フィールド一覧

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| **name** | string | ✓ | タスク名（AI生成スラグ、一意） |
| **status** | enum | ✓ | `pending`\|`running`\|`completed`\|`failed` |
| **piece** | string | - | 実行に使用するピース名（e.g., `default`, `expert`) |
| **task_dir** | string | ※ | `task_dir`OR`content`OR`content_file`のいずれか1つ必須。`.takt/tasks/{slug}`形式 |
| **content** | string | ※ | インラインタスク本文（レガシー） |
| **content_file** | string | ※ | 外部ファイルパス（レガシー） |
| **created_at** | ISO8601 | ✓ | タスク作成時刻 |
| **started_at** | ISO8601\|null | ✓ | 実行開始時刻（pending時はnull） |
| **completed_at** | ISO8601\|null | ✓ | 実行完了時刻（pending/running時はnull） |
| **slug** | string | - | タスク識別子（ディレクトリ名やURLのサフィックス用） |
| **worktree** | bool\|string | - | `true`（自動パス）\|パス文字列\|省略（カレント実行） |
| **branch** | string | - | git branchプリフィックス（自動生成時: `takt/{timestamp}-{slug}`) |
| **auto_pr** | boolean | - | 実行後に自動PR作成するか |
| **draft_pr** | boolean | - | PRをドラフトで作成するか |
| **issue** | int | - | GitHub Issue番号（連携時） |
| **start_movement** | string | - | 開始movement名（デフォルト: ピース指定値） |
| **retry_note** | string | - | リトライ時のメモ |
| **worktree_path** | string | - | 実行時に設定されるworktree実パス |
| **pr_url** | string | - | 生成されたPRのURL |
| **summary** | string | - | 実行後の結果サマリ |
| **owner_pid** | int\|null | - | 実行中プロセスPID（running状態のみ） |
| **failure** | object | - | 失敗情報（failed状態のみ） |

### TaskFailure（失敗情報）
```typescript
TaskFailure = {
  movement?: string;      // 失敗したmovement名
  error: string;          // エラーメッセージ
  last_message?: string;  // 最後の出力
}
```

---

## ステータス遷移と不変条件

### ステータス遷移図
```
pending → running → completed ✓
  ↓        ↓
  └────────→ failed ✗
```

### ステータス別の不変条件（Zod superRefine）

| ステータス | started_at | completed_at | owner_pid | failure |
|----------|----------|----------|---------|---------|
| **pending** | null | null | null | null |
| **running** | NOT null | null | (可能) | null |
| **completed** | NOT null | NOT null | null | null |
| **failed** | NOT null | NOT null | null | NOT null |

### 制約違反例
- `pending`で`started_at`が設定 → バリデーションエラー
- `running`で`owner_pid`がない → バリデーションエラーではないが推奨されない
- `failed`で`failure`がない → バリデーションエラー

---

## 実装例（takt-sddの現状）

### 例1: content形式（レガシー）
```yaml
tasks:
  - piece: default
    auto_pr: false
    name: default
    status: completed
    slug: default
    content: >-
      # タスク指示書（default ピース入力）
      ...（直接インライン記述）...
    created_at: 2026-02-21T03:30:03.630Z
    started_at: 2026-02-21T03:30:03.637Z
    completed_at: 2026-02-21T04:47:32.497Z
    owner_pid: null
```

### 例2: task_dir形式（推奨）
```yaml
tasks:
  - name: add-auth-feature
    status: pending
    piece: default
    task_dir: .takt/tasks/20260201-015714-foptng
    created_at: "2026-02-01T01:57:14.000Z"
    started_at: null
    completed_at: null
    worktree: true
    branch: takt/add-auth-feature
    auto_pr: true
```

### .takt/tasks/{slug}/order.md の内容
```markdown
# Task Specification

## Objective
Add user authentication system

## Requirements
- [ ] OAuth2 support
- [ ] Session management
- [ ] Rate limiting

## Success Criteria
All tests pass, 100% code coverage
```

---

## スキーマ検証（ソースコード参照）

### 検証ロジック
1. **フィールド型チェック** - zod基本型
2. **複合バリデーション** - superRefine で状態遷移ルール適用
3. **条件付き必須チェック**:
   - `content`, `content_file`, `task_dir` のいずれか1つ必須
   - `task_dir` は `.takt/tasks/<slug>` フォーマット必須

### エラーメッセージ例
- "Either content, content_file, or task_dir is required."
- "Exactly one of content, content_file, or task_dir must be set."
- "task_dir must match .takt/tasks/<slug> format."
- "Pending task must not have started_at."

---

## タスク管理ライフサイクル

### `takt add` 実行時
1. ユーザーが要件を入力 or GitHub Issue参照
2. AI が slug を生成・task_dir を決定
3. `.takt/tasks/{slug}/order.md` を自動作成
4. `tasks.yaml` に新規TaskRecordを追加
   - status = `pending`
   - created_at = 現在時刻
   - started_at = null
   - completed_at = null

### `takt run` 実行時
1. `tasks.yaml` から `status: pending` のタスク取得
2. タスクごとに:
   - status = `running`, owner_pid = プロセスPID
   - started_at = 現在時刻 に更新・保存
3. ピース実行（指定された piece を使用）
4. 成功時:
   - status = `completed`
   - completed_at = 現在時刻
   - owner_pid = null
5. 失敗時:
   - status = `failed`
   - completed_at = 現在時刻
   - failure = {movement, error, last_message}
   - owner_pid = null

### `takt list` / `takt watch`
- completed/failedタスクをブランチ単位で一覧
- ユーザーが merge/delete/retry を選択

---

## TaskStore実装（参照）

### 読み書き
```typescript
TaskStore {
  read(): TasksFileData          // 現在のtasks.yaml解析
  update(mutator): TasksFileData // 関数型更新
  withLock()                     // 排他制御（同時更新防止）
}
```

### パース・シリアライズ
- **パース**: YAML → JSON → Zod検証
- **シリアライズ**: Zod出力 → YAML 文字列出力
- **エラー処理**: パース失敗時は古いファイル削除・空の{tasks:[]}から再開

---

## TaskExecutionConfig（実行時設定）

```typescript
TaskExecutionConfigSchema = z.object({
  worktree: z.union([z.boolean(), z.string()]).optional(),
  branch: z.string().optional(),
  piece: z.string().optional(),
  issue: z.number().int().positive().optional(),
  start_movement: z.string().optional(),
  retry_note: z.string().optional(),
  auto_pr: z.boolean().optional(),
  draft_pr: z.boolean().optional(),
})
```
→ TaskRecord は TaskExecutionConfig を extend

---

## ディレクトリ構造（完全図）

```
.takt/
├── tasks.yaml                          # メタデータファイル（このドキュメントの対象）
├── tasks/
│   └── {slug}/
│       ├── order.md                    # タスク仕様（編集可能）
│       ├── schema.sql                  # 参考資料（オプション）
│       └── wireframe.png               # 参考資料（オプション）
├── runs/
│   └── {slug}/
│       ├── reports/
│       │   ├── 00-plan.md              # 計画レポート
│       │   ├── 01-implementation.md    # 実装レポート
│       │   └── 02-review.md            # レビューレポート
│       ├── logs/
│       │   └── {sessionId}.jsonl       # NDJSON形式セッションログ
│       ├── context/
│       │   └── previous_responses.md   # スナップショット
│       └── meta.json                   # 実行メタデータ
├── debug.yaml (optional)               # デバッグ設定
└── agents.yaml (optional)              # カスタムエージェント定義
```

---

## 重要な注記

### content vs content_file vs task_dir
```
推奨度:
1. task_dir（最新推奨）: 外部ファイル参照、柔軟性高い
2. content_file（レガシー）: パス参照、inline不可
3. content（レガシー）: inline記述、管理困難
```

### 並列実行とowner_pid
- `concurrency > 1` の場合、複数タスクが同時 `running` 状態
- owner_pid で実行中プロセスを追跡
- SIGINT時：running タスク → pending に自動復旧

### task_dir フォーマット
```
✓ .takt/tasks/20260201-015714-foptng
✗ .takt/tasks/invalid
✗ tasks/20260201-015714-foptng
```
相対パス必須、`.takt/tasks/` プレフィックス必須

---

## 参照実装ファイル一覧

| ファイル | 役割 |
|---------|------|
| `src/infra/task/schema.ts` | TaskRecordSchema, TaskFailureSchema定義 |
| `src/infra/task/types.ts` | TypeScript型定義（TaskInfo, TaskListItem等） |
| `src/infra/task/mapper.ts` | TaskRecord → TaskInfo変換、コンテンツ解決 |
| `src/infra/task/store.ts` | TaskStore実装（YAML読み書き） |
| `docs/task-management.md` | 英語ドキュメント |
| `docs/task-management.ja.md` | 日本語ドキュメント |
| `builtins/project/tasks/TASK-FORMAT` | タスクディレクトリ形式仕様 |

---

## 制約・制限

- **最大movements**: piece定義の `max_movements` 値（デフォルト30）
- **ステータス値**: 4値のみ（enum制約）
- **タイムスタンプ**: ISO8601形式必須
- **task_dir**: 絶対パス不可、相対パスのみ
- **排他制御**: 単一プロセス用（withLock）、分散ロック未実装

---

## デグレード・レガシー互換

### サポート中のレガシー形式
1. **content フィールド** - インライン記述（v0.2互換）
2. **content_file フィールド** - 外部ファイル参照（v0.3互換）
3. **古いタイムスタンプ形式** - ミリ秒まで対応

### 非推奨
- content形式での新規タスク作成
- 手動でのcontent編集（管理困難）

### 推奨ロードマップ
1. 新規タスク: task_dir形式で作成
2. 既存レガシー: 放置（後方互換性維持）
3. 段階的移行: 必要に応じて変換スクリプト提供

