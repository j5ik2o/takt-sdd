# Brief: kiro-impl-verification-hardening

> Discovery path: C（新規フォーカス spec）/ Scope: コア4（提案1+2+3+4）
> 名称は仮。spec-init 時に変更可。

## Problem

kiro-impl の autonomous loop は、タスク完了の最終的な可否を「coder が validation を実行し evidence を記録 → AI（reviewers / verify-task-completion）がその evidence を読む」という **LLM 自己申告の連鎖**に依存している（既存 Req 4.2）。このため次の痛みがある。

- **決定論的なグラウンドトゥルース不在**: hallucination / stale evidence により「テスト緑」と誤って `VERIFIED` 判定される経路が構造的に残る。
- **false-consensus リスク**: 4観点レビューは全会一致（`all("approved")`）だが、reviewer が証拠不十分なまま合意収束する failure mode が adversarial review 研究で確認されている。
- **コミット粒度の不一致**: takt 既定 auto-commit は workflow 実行全体で1コミット（`git add -A`）と粗く、kiro の `changed_files`/`baseline_dirty_files` による厳密な scope 追跡とタスク単位の bisect/rollback 意図に粒度が合わない。
- **知識伝播が暗黙**: 先行タスクの学び（`## Implementation Notes`）の後続タスクへの伝播が tasks.md 経由の暗黙依存で、実行者任せ。

結果として maintainer・実装者が「進捗表示が実態と一致する」ことを担保しづらい。

## Current State

- **フロー**: `plan-one-task` → `execute-task` → `ai-quality-gate`(subworkflow) → `reviewers`(parallel×4: coding/arch/qa/testing, `all("approved")`) → `verify-task-completion` → `update-progress` → loop / `validate-impl-final` → COMPLETE。`debug-task` が失敗を集約、`loop_monitors`×2(threshold 2)。
- **検証**: coder の `validation_evidence`（LLM 自己申告）を reviewers / verify が読解。**`quality_gates` は1つも使用していない。**
- **コミット**: ワークフロー側に明示ステップなし（takt 既定の auto-commit に委譲）。
- **所有**: 既存 spec `kiro-iterative-implementation-workflow`（Req 1–9, 実装済み）が本ワークフロー・facet を所有。

## Desired Outcome

- タスク完了の**機械的正しさ（テスト緑・ビルド成功）が command 型 quality_gates の exit code で決定論的に強制**され、reviewers/verify は「判断」に集中する。
- 4観点 reviewer が **adversarial**（既定 reject・承認には証拠引用必須）に振る舞い、false-consensus を構造的に抑止。Req 9 の集約契約（all approved → proceed / any needs_fix → debug）は維持。
- **per-kiro-task のコミット粒度と選択的ステージング**が確保され、bisect・中断再開が効く。
- 先行タスクの Implementation Notes が後続 `execute-task` / `debug-task` に**明示注入**される。
- 上記すべてが **ja/en 両資産 + validate スクリプト + node:test** で検証される。

## Approach

既存 `kiro-iterative-implementation-workflow` を **Extends** する新フォーカス spec として、kiro-impl の「検証の決定論化」と「実行規律」をコア4提案で強化する。adversarial review 研究・fresh-evidence ベストプラクティス・cc-sdd の実行規律を根拠とし、takt 0.45.0 のネイティブ機構（`quality_gates` / `allow_git_commit` / `loop_monitors`）へ写像する。挙動の source of truth は kiro-impl SKILL.md（Req 8）に置き、facet は adapter delta のみとする。

コア4の写像:
1. **提案1**: `execute-task`（および subworkflow 内 `ai-antipattern-fix`）に command 型 quality_gates（TEST/BUILD）を付与し、reviewer 前に緑を機械強制。
2. **提案2**: 4 review facet を adversarial 設計へ。command gate が機械検証を担保するため、reviewer は設計/要件/境界/意図の判断へ純化（Req 9.2 の確認責務自体は維持）。
3. **提案3**: completion verified 後に `allow_git_commit: true` の per-task commit step を追加し、選択的ステージングで粒度確保。既定 auto-commit との重複は design で調停。
4. **提案4**: `execute-task` / `debug-task` facet に「関連 Implementation Notes を着手前に読み再発防止に充てる」を明示。

**推奨理由**: 4提案は全て kiro-impl という単一責務境界（同一ファイル群）に収束し、依存順（gates → reviewer 純化 / commit / 伝播）で段階実装できる。プロジェクト慣習（focused follow-on spec）に整合し、完了済み spec の再オープンを避けつつ cross-boundary touchpoint を明示宣言できる。

## Scope

- **In**:
  - 提案1: command 型 quality_gates 導入（`execute-task` / subworkflow `ai-antipattern-fix`）
  - 提案2: reviewer の adversarial 純化（coding / architecture / qa / testing review facet）
  - 提案3: per-task commit step（`allow_git_commit`・選択的 staging・既定 auto-commit 調停）
  - 提案4: Implementation Notes の明示注入（`execute-task` / `debug-task` facet）
  - ja/en 両資産の対構造維持
  - 対応する validate スクリプト（`scripts/validate-*.mjs`）と node:test（`tests/*.test.mjs`）の更新
  - 挙動変更の kiro-impl SKILL.md（`.claude/skills` / `.agents/skills` 両 source asset）への反映
- **Out**:
  - 提案5（リスク階層化 / model 階層化）: parallel 条件スキップは 0.45.0 非対応、Req 9.8「常時 gate 追加禁止」と要調停、確度低 → **将来 spec**
  - 提案6（loop_monitors threshold 調整）: 自明な数値変更。必要なら design で付随判断、独立 spec 不要
  - 新規 reviewer 観点（security 等）の常時追加（Req 9.8 で禁止）
  - ai-quality-gate サブワークフロー**本体**の責務再設計（kiro-ai-quality-gate* spec 所有。本 spec は呼び出し step / 内部 fix step への gate 付与に留める）
  - requirements/design/tasks 生成・batch orchestration（kiro-impl の boundary 外）

## Boundary Candidates

- 決定論的検証ゲート層（command quality_gates 付与と repo 依存コマンドの橋渡し）
- レビュー判断層（adversarial reviewer facet と既存集約契約）
- 実行規律層（per-task commit と知識伝播）
- 検証層（validate スクリプト + node:test の対更新）

## Out of Boundary

- ai-quality-gate サブワークフロー本体の内部設計（kiro-ai-quality-gate* spec 所有）
- 共有 output contract / skill identity resolver の構造変更（kiro-shared-workflow-contracts 所有。本 spec は review verdict / completion contract を消費するのみ）
- status / validation workflow（kiro-status-validation-workflows 所有）
- kiro-impl 以外のワークフローへの command gates 横展開（必要なら別 spec）

## Upstream / Downstream

- **Upstream**: `kiro-iterative-implementation-workflow`（本体・所有）、`kiro-shared-workflow-contracts`（review/debug/completion output contract、artifact policy、builtin facet inheritance policy）、takt 0.45.0 engine（`quality_gates` / `allow_git_commit` / `loop_monitors`）
- **Downstream**: `takt-sdd-global-cli`（同梱資産の配布・検証）、本ワークフローを使う全 SDD 利用リポジトリ

## Existing Spec Touchpoints

- **Extends**: `kiro-iterative-implementation-workflow`（Req 4.2 を決定論ゲートで補強 / Req 9 の reviewer 振る舞いを adversarial 化 / Req 6.3 にコミット粒度を追加 / Req 5.5・7.6 の loop_monitors 単一原則は維持）
- **Adjacent**: `kiro-ai-quality-gate`（subworkflow 内 `ai-antipattern-fix` への gate 付与のみ、内部責務は侵さない）、`kiro-shared-workflow-contracts`（review verdict / completion contract を消費）

## Constraints

- ja/en 資産は対構造を維持（structure.md）。
- 機械チェック可能な契約は validate スクリプト + node:test を必須（structure.md）。
- 挙動の source of truth は kiro-impl SKILL.md。facet は adapter delta のみ、本文コピー禁止（Req 8）。
- 再実行制御は `loop_monitors` のみ。独自 retry counter / loop-health 管理を facet・validator・frontmatter に持たない（Req 5.5 / 7.6）。
- 常時必須の新規 review gate を追加しない（Req 9.8）。
- builtin facet を継承し差分だけ記述（roadmap Constraints / `BuiltinFacetInheritancePolicy`）。
- `quality_gates` は agent step のみ（`workflow_call` / `system` step は不可）。

## takt 0.45.0 実現可能性確認（node_modules/takt 実体で検証済み）

| 機構 | 結論 | 要点 |
|---|---|---|
| command 型 quality_gates | ✓ CONFIRMED | `steps[].quality_gates: [{type: command, command, cwd?, timeout_ms?, name?}]`。agent step / parallel sub-step に付与可、`workflow_call`/`system` 不可。exit 0=成功、失敗時はコマンド/cwd/exit/64KB stdout・stderr/log path を**同一 agent step へ差し戻し**。後続 gate は実行されない。`workflow_command_gates.custom_scripts: true` 必須 → **`.takt/config.yaml` で既に有効**。 |
| git commit | ✓ 既定 auto-commit | takt は agent に「commit/push/add するな」と注入し、**workflow 完了後に `git add -A` で1コミット（`takt: {taskName}`）+ push**（per workflow run、粗い）。step 単位 opt-in は `allow_git_commit: true`。 |
| parallel 条件スキップ | ✗ 非対応 | sub-step は常に全実行。`when`/`if`/`skip` フィールドなし。条件分岐は別 step path（rules 分岐）でしか表現できない → 提案5 を out-of-scope とする裏付け。 |
| loop_monitors | ✓ CONFIRMED | `cycle`(≥2 step) / `threshold`(int, default 3) / `judge`(persona/instruction/rules、rule は condition+next 必須)。threshold は cycle 反復回数で判定。 |
| per-step model 上書き | ✓ 可 | step / sub-step に `provider` / `model` / `provider_options`（`workflow_call` は不可）→ 将来の model 階層化（提案5）は実現可能。 |

## Design 段階で解くべき未解決の問い（research.md 候補）

1. **command gate のコマンド解決（提案1 の中核）**: `quality_gates.command` は静的文字列。kiro-impl は repo 非依存の汎用ワークフローで、検証コマンドは planner が runtime 検出する（SKILL Preflight の `TEST_COMMANDS`/`BUILD_COMMANDS`）。command にテンプレート変数を使えるか、使えない場合の橋渡し（規約コマンド / ディスパッチャスクリプト / planner 出力連携）をどう設計するか。
2. **auto-commit 調停（提案3 の中核）**: takt 既定の「完了時 `git add -A` 1コミット」と per-task `allow_git_commit` 選択的コミットの共存。既定を抑止できるか、粗いまとめコミットを許容するか。
3. **gate 失敗と debug-task の責務分担**: command gate 失敗は同一 step 差し戻し、`debug-task` は review/verify 失敗を集約。二重化・無限ループを避ける分岐設計。

## 根拠（deep-research, confirmed）

- command 型 quality_gates / loop_monitors（nrslib/takt `docs/workflows.md`, 3-0）
- 1イテレーション1タスク / Implementation Notes 知識伝播（gotalab/cc-sdd `skill-reference.md`, 2-3票）
- false-consensus failure mode と adversarial review（OpenReview `fOHvpLs6zp`, 3-0, ※preprint）
