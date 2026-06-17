# 技術設計

## 概要

**Purpose（目的）**: 本機能は takt-sdd のメンテナと kiro-impl 利用者に対し、タスク完了判定の「機械的正しさ」を agent-reported validation evidence と fresh review で厳格に扱い、レビューを**証拠ベースの不同意（adversarial）**へ、コミットを**タスク単位の粒度**へ、知識伝播を**明示化**することで、進捗表示と実態の乖離を減らす。

**Users（ユーザー）**: kiro-impl を回すメンテナ／実装者と、ワークフロー契約を保守する maintainer。

**Impact（影響）**: 既存 `kiro-iterative-implementation-workflow`（8 step）の**ステップ topology を変えず**、step 属性（`allow_git_commit`）と facet 内容、検証層・skill 正本の拡張で実現する。TAKT command `quality_gates` は agent completion 後に無条件実行されるため、`BLOCKED` / `NEEDS_CONTEXT` ルーティングを持つ `execute-task` / `ai-antipattern-fix` には置かない。

### 目標
- `READY_FOR_REVIEW` へ進む条件を、実行済み command、exit code、fresh output を含む validation evidence に限定する（要件1）。
- `execute-task` / `ai-antipattern-fix` に無条件 command `quality_gates` を置かず、`BLOCKED` / `NEEDS_CONTEXT` / `NEED_REPLAN` ルーティングを保つ（要件1, 2）。
- 4観点レビューを adversarial 化しつつ `all("approved")` 集約と security 非常時を維持（要件3）。
- 検証済みタスク単位の選択的コミットを行う（要件4）。
- Implementation Notes を後続 execute/debug に明示伝播（要件5）。
- 全変更を ja/en・validate・node:test・SKILL 正本へ整合反映（要件6）。
- **成功基準**: `npm run validate:kiro-iterative-implementation-workflow` と該当 node:test が、新契約（無条件 command gate 禁止・commit・adversarial・知識伝播）の drift を検出し、緑であること。

### 非目標
- 提案5（リスク階層化 / model 階層化。takt 0.45.0 は parallel サブステップ条件スキップ非対応）。
- 提案6（loop_monitors threshold 数値変更）。
- ai-quality-gate サブワークフロー本体の責務再設計。
- per-task 単位の検証コマンド自動絞り込み（当面はリポジトリ標準の test/build を実行）。
- 新規 reviewer 観点の常時追加。

## 境界コミットメント

### このスペックが所有するもの
- `kiro-impl.yaml` の `execute-task` / `kiro-ai-quality-gate.yaml` の `ai-antipattern-fix` に無条件 command `quality_gates` を置かない契約と、`update-progress` への `allow_git_commit` + 選択的コミット手順。
- 4 review facet（coding/architecture/qa/testing）の adversarial 振る舞い定義。
- `execute-task` / `debug-task` facet への Implementation Notes 読込手順。
- 検証証跡の規約（実行済み command / exit code / fresh output）と、skill autonomous mode 用の任意フック `.kiro/settings/verify.sh`。
- 上記の ja/en 両資産・SKILL 正本（`.claude` / `.agents`）への反映。

### 境界外
- ai-quality-gate サブワークフローの内部ステップ構成・ループ設計。
- 共有 output contract（review verdict / completion 等）の構造変更。
- インストーラ本体のコピー範囲変更（`.kiro/settings/verify.sh` は利用リポジトリが所有する任意フック）。
- status/validation・spec 生成・batch の各ワークフロー。

### 許可する依存
- takt 0.45.0 engine: `allow_git_commit`、`loop_monitors`、step 単位 `provider_options`。
- `kiro-shared-workflow-contracts`: review verdict / completion / artifact policy contract（消費のみ）。
- `kiro-ai-quality-gate`: `ai-antipattern-fix` step への gate 属性付与（最小の Adjacent 変更）。
- 依存方向: SKILL.md（正本）→ facet（adapter delta）→ workflow YAML → validate/test。`.kiro/settings/verify.sh` は skill autonomous mode の parent-run hook であり、TAKT workflow の無条件 gate にはしない。

### 再検証トリガー
- `allow_git_commit` のスキーマや既定挙動、または TAKT command gate に条件付き実行機能が追加されたとき。
- `expectedSteps`（ステップ topology）を変更せざるを得なくなったとき（validator の固定配列・loop_monitors 文字列の同時更新が必要）。
- インストーラが `.takt/` 資産のコピー範囲を変えたとき（gate コマンドの解決前提が崩れる）。
- review verdict / completion output contract の形状変更。

## アーキテクチャ

### 既存アーキテクチャ分析
- `kiro-impl.yaml` 8 step: `plan-one-task → execute-task → ai-quality-gate(workflow_call) → reviewers(parallel×4) → debug-task → verify-task-completion → update-progress → validate-impl-final`。
- 検証層 `scripts/validate-kiro-iterative-implementation-workflow.mjs` が **step 順序・reviewer 構成・loop_monitors 文字列・ja/en parity・package scripts を厳格固定**。`tests/kiro-iterative-implementation-workflow.test.mjs` が reject ケースを網羅。
- takt 0.45.0 制約（ソース確認済み）: gate コマンドはテンプレート変数なしで `spawn(command, {shell:true})` に逐語渡し、prior-step 出力は env 注入されない。pipeline `--skip-git` で auto-commit 完全無効。`allow_git_commit:true` は「commitするな」指示の抑止のみ（自動 stage しない）。

### アーキテクチャパターンと境界マップ

- **採用パターン**: 既存ステートマシンへの**属性付加（非侵襲拡張）**。新規ステップを作らず、step 属性 + facet 内容で振る舞いを足す。
- **新規コンポーネントの根拠**: `.kiro/settings/verify.sh` 規約のみが新規。skill autonomous mode で parent が `READY_FOR_REVIEW` 後に任意実行できる hook として扱う。
- **ステアリング準拠**: ファセット分離・ja/en parity・検証スクリプト第一級・SKILL 正本（Req 8）。

```mermaid
graph TB
    Plan[plan-one-task] --> Execute[execute-task]
    Execute -->|STATUS READY_FOR_REVIEW with fresh validation evidence| AIGate[ai-quality-gate workflow_call]
    Execute -->|STATUS BLOCKED / NEEDS_CONTEXT| Debug[debug-task]
    AIGate --> Reviewers[reviewers parallel four adversarial]
    Reviewers -->|all approved| Verify[verify-task-completion]
    Reviewers -->|any needs_fix| Debug[debug-task]
    Debug --> Execute
    Verify --> Update[update-progress allow_git_commit selective commit]
    Update -->|REMAINING| Plan
    Update -->|ALL COMPLETE| Final[validate-impl-final]
    Final --> Done[COMPLETE]
```

> TAKT command `quality_gates` はステップ完了後に無条件実行されるため、この workflow では `execute-task` / `ai-antipattern-fix` へ置かない。`READY_FOR_REVIEW` は実行済み validation evidence を持つ場合だけ返し、失敗や context 不足は `debug-task` へ渡す。

### 技術スタック

| レイヤー | 選択／バージョン | 機能内での役割 | メモ |
|-------|------------------|-----------------|-------|
| ワークフローエンジン | takt 0.45.0 | allow_git_commit / loop_monitors | 既存依存。新規依存なし |
| 検証フック | リポジトリ提供 `.kiro/settings/verify.sh`（任意） | skill autonomous mode で parent が READY_FOR_REVIEW 後に実行 | TAKT workflow の無条件 gate にはしない |
| 検証 | Node.js 22 + node:test | validate スクリプト + テスト | 既存ファイルを拡張 |

## ファイル構造計画

### 変更対象ファイル
- `.takt/{ja,en}/workflows/kiro-impl.yaml` — `execute-task` に無条件 command `quality_gates` が無いことを維持し、`update-progress` に `allow_git_commit: true` を追加。**step 名・順序は不変**。
- `.takt/{ja,en}/workflows/kiro-ai-quality-gate.yaml` — `ai-antipattern-fix` に無条件 command `quality_gates` が無いことを維持（BLOCKED / NEED_REPLAN 経路を保つ）。
- `.takt/{ja,en}/facets/instructions/kiro-review-task.md` / `kiro-review-architecture-task.md` / `kiro-review-qa-task.md` / `kiro-review-testing-task.md` — adversarial 振る舞い（既定 reject・証拠引用で承認・機械検証は緑証跡確認に集中）を追記。
- `.takt/{ja,en}/facets/instructions/kiro-impl-execute-task.md` — 着手前の関連 Implementation Notes 読込 + READY_FOR_REVIEW に必要な validation evidence を追記。
- `.takt/{ja,en}/facets/instructions/kiro-debug-task.md` — 関連 Implementation Notes を root cause 入力に追記。
- `.takt/{ja,en}/facets/instructions/kiro-impl-update-progress.md` — VERIFIED 時に選択的 per-task commit（implementation changed files + current AI fix changed files + `.kiro/specs/<feature>/tasks.md`、`git add -A` 禁止）を追記。
- `scripts/validate-kiro-iterative-implementation-workflow.mjs` — 新アサーション（後述）。
- `scripts/validate-kiro-ai-quality-gate-workflow-coverage.mjs` — `ai-antipattern-fix` に無条件 command gate が無いことのアサーション。
- `tests/kiro-iterative-implementation-workflow.test.mjs` / `tests/kiro-ai-quality-gate-workflow-coverage.test.mjs` — reject ケース追加。
- `.claude/skills/kiro-impl/SKILL.md` / `.agents/skills/kiro-impl/SKILL.md` — 正本に「READY_FOR_REVIEW 後の parent-run verification hook・per-task commit・adversarial review・知識伝播」を記述。

### 新規ファイル
- `.kiro/settings/verify.sh` — takt-sdd 自身の dogfooding フック（`npm run validate:kiro-iterative-implementation-workflow` 等を実行）。利用リポジトリ向けには「任意フック規約」の参照実装。

> 各ファイルは単一責務。挙動は SKILL.md（正本）→ facet（差分）→ workflow YAML の順で反映し、本文コピーをしない（Req 8）。

## システムフロー

READY_FOR_REVIEW の検証証跡経路（要件1 / 2）:

```mermaid
flowchart TB
    Edit[execute-task がコード編集] --> Validate[task-local validation commands 実行]
    Validate --> Code{fresh command / exit code / output あり?}
    Code -->|あり| Ready[STATUS READY_FOR_REVIEW]
    Code -->|失敗| Blocked[STATUS BLOCKED]
    Code -->|不足| Needs[STATUS NEEDS_CONTEXT]
    Ready --> Review[AI quality gate / reviewers]
    Blocked --> Debug[debug-task]
    Needs --> Debug
```

> `execute-task` が `BLOCKED` / `NEEDS_CONTEXT` を返した場合は workflow rules が `debug-task` へ進める。無条件 command `quality_gates` はこの rules 評価前に実行されるため、本 workflow では使わない。

## 要件トレーサビリティ

| 要件 | 要約 | 設計要素 |
|---|---|---|
| 1 | READY 経路の検証証跡 | execute-task の validation evidence discipline、skill mode parent-run hook、無条件 command gate 禁止 |
| 2 | loop 一本化整合 | BLOCKED/NEEDS_CONTEXT と debug-task の経路維持、`customLoopSourcePattern` 維持、loop_monitors 文字列温存 |
| 3 | adversarial review | 4 review facet 内容、`all("approved")`/`any("needs_fix")` 集約温存、security 非常時 |
| 4 | per-task commit | `update-progress` の `allow_git_commit` + 選択的コミット facet、auto-commit 調停 |
| 5 | 知識伝播 | `execute-task`/`debug-task` facet の Implementation Notes 読込 |
| 6 | 整合 | 2 validator + 2 test 拡張、ja/en parity、SKILL 正本2箇所、builtin facet 継承維持 |

## コンポーネントとインターフェース

| コンポーネント | レイヤー | 意図 | 要件 | 契約 |
|---|---|---|---|---|
| 検証証跡 discipline | facet + skill | READY_FOR_REVIEW の前提を実行済み証跡に限定 | 1, 2 | State |
| verify.sh 規約 | runtime hook | skill mode の parent-run 検証点 | 1 | Batch |
| adversarial review facets | facet | 証拠ベース不同意 | 3 | State（verdict 消費） |
| per-task commit | workflow 属性 + facet | タスク単位コミット | 4 | Batch（git） |
| 知識伝播 facets | facet | Notes の明示伝播 | 5 | State |
| 検証層拡張 | scripts/tests | 契約 drift 検出 | 6 | Service |

### 検証証跡 discipline（要件1, 2）
**責務**: `execute-task` が `STATUS: READY_FOR_REVIEW` を返す前に、task-local validation commands の command、exit code、fresh output を `validation_evidence` に記録させる。失敗または context 不足は `BLOCKED` / `NEEDS_CONTEXT` として返し、`debug-task` へ渡す。

**禁止契約**:
- `execute-task` と `ai-antipattern-fix` に無条件 command `quality_gates` を置かない。
- 理由: TAKT command gate は agent completion 後に常に実行され、rules 評価前に失敗すると同一 step へ差し戻すため、`BLOCKED` / `NEEDS_CONTEXT` / `NEED_REPLAN` ルーティングを阻害する。
- skill autonomous mode では、parent が `READY_FOR_REVIEW` 後に `.kiro/settings/verify.sh` を存在時のみ実行し、非ゼロなら review へ進めない。

### per-task commit（要件4）
**責務**: `verify-task-completion` が VERIFIED の後、`update-progress` が選択的コミットする。

**契約**:
- `update-progress` に `allow_git_commit: true`（「commitするな」指示を抑止）。
- facet 手順: checkbox を `- [x]` 更新後、implementation `changed_files`、current AI fix `changed_files`、`.kiro/specs/<feature>/tasks.md` の union を `git add` し、`git commit -m "feat(<feature>): <task>"`。`git add -A` 禁止。blocker 経路ではコミットしない。
- 調停（4.4）: pipeline `--skip-git`（canonical）では takt 自動コミットが無いため本コミットが唯一でタスク粒度になる。worktree モードでは末尾 `git add -A` 自動コミットが残るが、per-task で clean tree を保つため残差のみ（実質空）。auto-commit 無効化 config は存在しないため、worktree 末尾コミットは許容として SKILL に明記。

### adversarial review facets（要件3）
**責務**: 4 reviewer が既定 reject・証拠引用で承認。coding review は fresh な validation evidence と実 diff を確認し、コード正当性/境界/diff の判断に集中。
- 構造（reviewer 名・順序・persona・report・`approved`/`needs_fix`・`all("approved")`/`any("needs_fix")`）は不変。security 常時 reviewer 追加禁止（3.5）。

### 知識伝播 facets（要件5）
**責務**: `execute-task` は着手前に関連 Implementation Notes を読み再発防止に充て、`debug-task` は root cause 入力に使う。追記は選択タスク/共有 notes 範囲に限定。

### 検証層拡張（要件6）
**新アサーション（`hasRuleWithTerms`/`containsAll`/`stepScalar` 機構で表現）**:
- `execute-task` に無条件 command `quality_gates:` が存在しない。
- `ai-antipattern-fix` に無条件 command `quality_gates:` が存在しない（ai-quality-gate validator）。
- `update-progress` に `allow_git_commit: true` が存在。
- 4 review facet に adversarial 語彙（既定 reject/証拠引用）を含む。
- `execute-task`/`debug-task` facet に `Implementation Notes` を含む。
- ja/en の `allow_git_commit` と facet terms の parity。
- **新 reject テスト名**を `validateTaskFixtureCoverage` の配列とテストファイルへ追加（例: "validator rejects execute-task with unconditional command quality gate" / "validator rejects update-progress without allow_git_commit" / "validator rejects non-adversarial review facet" / "validator rejects execute-task facet missing implementation notes intake"）。

## エラーハンドリング
- **validation 失敗**: `execute-task` が `STATUS: BLOCKED` を返し、workflow rules で `debug-task` へ渡す。
- **verify.sh 不在（skill mode）**: parent は no-op として継続するが、完了可否は fresh validation evidence と既存 verify-completion 証跡ゲートが担保する（要件1.5）。
- **commit 失敗（衝突・空ステージ等）**: update-progress facet で「stale 時は他 worker を上書きせず停止」（既存 policy 準拠）。worktree 末尾自動コミットの空コミットは無害として扱う。

## テスト戦略

### Unit / Validator Tests（受け入れ基準由来）
- validator が `execute-task` の無条件 command gate 追加を reject（1.3）。
- validator が `ai-antipattern-fix` の無条件 command gate 追加を reject（1.3）。
- validator が `update-progress` の `allow_git_commit` 欠落を reject（4.1）。
- validator が非 adversarial な review facet を reject（3.1）。
- validator が `execute-task`/`debug-task` の Implementation Notes 不在を reject（5.1/5.2）。
- validator が update-progress の実 spec task path 欠落を reject（4.2）。
- validator が既存契約（step 順序・all approved・loop_monitors 文字列・security 非常時）を引き続き保持（2/3/6 の回帰防止）。

### Integration / Runtime Smoke
- 既存 `kiro-ai-quality-gate-runtime-smoke` を維持しつつ、無条件 command gate を使わない workflow routing が validator で固定されることを確認。

### 手動確認
- skill autonomous mode では `.kiro/settings/verify.sh` が存在する場合に parent が実行し、非ゼロなら reviewer へ進めないことを運用手順で確認する。

## Open Questions / Risks
- **R1（低）**: `.kiro/settings/verify.sh` は skill autonomous mode の任意 parent-run hook として扱う。TAKT workflow の無条件 gate には使わないため、配布先 repo で hook が無い場合も workflow は hard error にならない。
- **R2（低）**: task-local validation は当面リポジトリ標準の test/build を実行（per-task 絞り込みなし）。重い場合は feature/task の validation guidance 側で調整する。
- **R3（低）**: worktree モードの末尾 `git add -A` 自動コミットは無効化 config が無いため残存。per-task commit で clean tree を保ち実害を最小化、SKILL に明記。
- **R4（低）**: タスク agent が `.kiro/settings/verify.sh` を改変すると skill-mode hook を骨抜きにできる。タスク境界外編集として scope-guard/レビューで検出する前提。
- **R5（解消済み / PR #104 review 指摘）**: `execute-task` / `ai-antipattern-fix` の command `quality_gates` は無条件実行のため、`BLOCKED` / `NEEDS_CONTEXT` / `NEED_REPLAN` ルーティングを先取りし得る。この PR では該当 gate を撤回し、validator で無条件 command gate の再導入を reject する。
