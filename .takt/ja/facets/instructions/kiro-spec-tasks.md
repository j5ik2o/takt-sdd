{extends: plan}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-tasks` または `/kiro-spec-tasks` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-tasks` または `/kiro-spec-tasks` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Tasks Instruction

## Kiro 固有差分

approved requirements と design から `.kiro/specs/<feature>/tasks.md` を生成する。成功状態は `tasks-generated` であり、`spec.json` は `approvals.tasks.generated` を true にする。auto-approve mode では `approvals.tasks.approved` と `ready_for_implementation` も true にできる。この phase は TasksGenerationWorkflow の責務に限定する。

## Inputs

- `design-generated` phase または互換性のある後続 phase の `.kiro/specs/<feature>/spec.json`。
- `.kiro/specs/<feature>/requirements.md`。
- `.kiro/specs/<feature>/design.md`。
- task plan を再生成または merge する場合の existing `tasks.md`。
- `.kiro/settings/templates/specs/tasks.md`。
- `kiro-spec-generation`、`kiro-spec-lifecycle`、`kiro-spec-task-annotations` の task generation rules。

## Tasks generation procedure

1. canonical feature directory を `.kiro/specs/<feature>/` として解決する。
2. task output を生成する前に requirements/design approval gate を実行する。requirements または design が approved でない場合、明示的な `-y` または `auto-approve` mode がない限り `validation.verdict: "BLOCKED"` を返す。
3. `-y` または `auto-approve` mode が有効な場合は、成功する tasks phase の finalize step で `approvals.requirements.approved: true` と `approvals.design.approved: true` を明示的に更新する。暗黙の approval として扱わない。
4. `requirements.md`、`design.md`、`spec.json`、existing `tasks.md`、`.kiro/settings/templates/specs/tasks.md` から task generation を行う。
5. `tasks.md` は implementation-ready な plan として作る。すべての executable task は以下を含める。
   - detail bullet に observable completion detail。
   - `_Requirements: ..._` に numeric requirements。
   - canonical boundary annotation label `_Boundary:_`。
   - canonical dependency annotation label `_Depends:_`。
6. dependency がない executable task は `_Depends:_ none` を使う。dependency がある場合は task IDs を使う。
   - `(P)` marker は `_Depends:_ none` の executable task だけに使う。non-empty dependencies を持つ task は boundary が重ならなくても `(P)` を付けてはならない。
7. generate/repair step では final task plan review を実行しない。draft task graph を review 可能にして dedicated read-only review step へ進める。その review step が executable task size、observable completion、numeric requirements、hidden prerequisites、requirement coverage を確認する。
8. dedicated read-only review step は task graph sanity review も実行し、Boundary annotation coverage、Depends annotation coverage、dependency graph validity、boundary overlap、`(P)` marker validity を確認する。
9. `(P)` は non-overlapping boundary と explicit dependency graph の evidence から独立実行可能と判断できる場合だけ使う。
10. hidden prerequisite、boundary overlap、coverage gap、invalid dependency、invalid `(P)` marker が残る場合は `validation.verdict: "BLOCKED"` または `validation.verdict: "NEEDS_FIX"` を返し、`tasks-generated` success state を書かない。
11. finalize step でのみ、両方の review 通過後に `.kiro/specs/<feature>/tasks.md` を accepted tasks artifact として扱う。
12. finalize step でのみ、同じ成功 result で `.kiro/specs/<feature>/spec.json` を更新する。
   - `phase`: `tasks-generated`。
   - `approvals.requirements.approved`: 既存承認がある、または明示的な auto-approve handling がある場合に true。
   - `approvals.design.approved`: 既存承認がある、または明示的な auto-approve handling がある場合に true。
   - `approvals.tasks.generated`: true。
   - `approvals.tasks.approved`: human approval または明示的な `auto-approve` mode の後だけ true。
   - `ready_for_implementation`: `approvals.tasks.approved` が true の場合だけ true。

## Result mapping

- draft generation または repair step では read-only review step が読む draft task plan content を step report に返す。`tasks.md` は書かず、`spec.json` も `tasks-generated` へ promotion してはならない。draft task graph が review に進める場合は `phase: "tasks"`、`validation.verdict: "PASS"`、`draft_status: "READY_FOR_REVIEW"`、`review_gate: "PENDING"`、`featureName`、空の `updatedFiles` array、`draft_artifacts.tasks` または `## draft_artifacts.tasks` / `## Draft tasks.md` という Markdown heading を返す。
- repair step では、review findings が `missing_draft_artifact`、`ai_gate_scope_mismatch`、`review_target_scope_mismatch`、unscoped git diff、または unrelated git diff / current dirty worktree に対する場合、tasks draft の局所修復として扱ってはならない。`validation.verdict: "BLOCKED"` とし、誤った review target を報告して workflow を停止させる。
- task plan review と task graph sanity review の通過後の finalize step では、`phase: "tasks"`、`validation.verdict: "PASS"`、`draft_status: "WRITTEN"`、`review_gate: "PASSED"`、`featureName`、`updatedFiles` に `tasks.md` と `spec.json` を含めて返す。
- 通常 mode では generated `tasks.md` が review 可能でも、tasks approval が存在するまで `ready_for_implementation` は false のままにする。
- auto-approve mode では同じ successful result で tasks approved true と `ready_for_implementation` true を設定する。
- missing requirements、missing design、lifecycle inconsistency、requirements/design approval gate failure、task plan review failure、task graph sanity review failure、hidden prerequisite、boundary overlap、coverage gap がある場合は `BLOCKED` または `NEEDS_FIX` を返し、`spec.json` を `tasks-generated` success state にしない。
- evidence には requirements/design approval gate handling、task generation sources、observable completion checks、numeric requirements checks、`_Boundary:_` checks、`_Depends:_` checks、task plan review result、task graph sanity review result、`ready_for_implementation` を更新したかを記録する。
