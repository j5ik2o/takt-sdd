{extends: review-requirements}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-tasks` または `/kiro-spec-tasks` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-tasks` または `/kiro-spec-tasks` の `### Step 3: Review Task Plan` section をこの step の source of truth として適用する。
追加で `### Step 3.5: Run Task-Graph Sanity Review` section も読む。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Tasks Review Instruction

## Kiro 固有差分

`tasks.md` と lifecycle metadata を finalize する前に、draft task plan と task graph を review する。この adapter は読み取り専用 (read-only) であり、`tasks.md` の書き込み、`spec.json` の更新、tasks approval、`ready_for_implementation` の設定をしてはならない。

## Review procedure

1. `requirements.md`、`design.md`、`spec.json`、existing `tasks.md` の merge context、前 step の draft task plan、task generation rules を読み込む。
   - 前 step の draft task plan は Previous Response または current run report の `draft_artifacts.tasks`、`## draft_artifacts.tasks`、`## Draft tasks.md`、`kiro-spec-tasks-result.md`、`kiro-spec-tasks-repair-result.md`、`kiro-spec-quick-tasks-result.md`、`kiro-spec-quick-tasks-repair-result.md` から取得する。
   - draft review mode の review target は tasks draft に固定する。git diff、current dirty worktree、workflow/facet/script/test の未コミット差分を task plan review target として扱ってはならない。
   - この review が git diff、current dirty worktree、unrelated workflow/facet/script/test changes、または tasks draft 以外の artifact を対象にした場合は `task_plan_review: "NEEDS_FIXES"`、`fatal_review_issue: "REVIEW_TARGET_SCOPE_MISMATCH"` とし、`review_target_scope_mismatch` を報告する。
   - draft 本文が見つからない場合は `task_plan_review: "NEEDS_FIXES"`、`fatal_review_issue: "MISSING_DRAFT_ARTIFACT"` とし、`missing_draft_artifact` を報告する。既存 `tasks.md`、git diff、別 phase artifact へフォールバックしてはならない。
2. `$kiro-spec-tasks` または `/kiro-spec-tasks` Step 3 の task plan review gate を実行する。
3. `$kiro-spec-tasks` または `/kiro-spec-tasks` Step 3.5 の task-graph sanity review を実行する。
4. 両方の review が通過した場合だけ `task_plan_review: "PASS"` と `task_graph_sanity_review: "PASS"` を返す。
5. findings が task plan 内で修復可能な場合は、該当する review field に `NEEDS_FIXES`、`fatal_review_issue: "NONE"` を返す。
6. requirements/design の実ギャップまたは矛盾が見つかった場合は、該当する review field に `RETURN_TO_DESIGN` を返す。

## Result mapping

- pass 時は coverage、executability、dependency graph、boundary ownership、`(P)` marker evidence を報告し、artifact は変更しない。
- `(P)` marker evidence では、各 `(P)` task が `_Depends:_ none` であることを必ず確認する。non-empty dependencies を持つ `(P)` task は invalid `(P)` marker として `task_graph_sanity_review: "NEEDS_FIXES"` または `"BLOCKED"` を返す。
- needs-fix または blocked 時は具体的な findings を含め、`tasks.md` と `spec.json` を変更しない。

## AI quality gate evidence

- task plan review pass を返す前に、current run の namespaced AI gate review report を確認する:
  `reports/subworkflows/iteration-*--step-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  または `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`。
- AI gate report が `review_target: tasks_draft` または同等の明示 evidence を含むことを確認する。
- AI gate report が git diff、current dirty worktree、unrelated workflow/facet/script/test changes、または別 phase artifact を対象にしている場合は `task_plan_review: "NEEDS_FIXES"`、`fatal_review_issue: "AI_GATE_SCOPE_MISMATCH"` とし、`ai_gate_scope_mismatch` を報告する。この状態を task draft の local repair possible として扱ってはならない。
- AI gate report が `review_target: git_diff`、unscoped git diff、または path filter なしの `git diff` を evidence としている場合も `fatal_review_issue: "AI_GATE_SCOPE_MISMATCH"` とする。
- unresolved AI antipattern findings が残る場合は draft task plan を reject する。
- 対応する namespaced `kiro-spec-ai-antipattern-fix.md` が存在する場合、stale、cross-run、blocked、evidence-free no-fix outcomes を reject する。
- first review が blocking issue を見つけなかった場合だけ、`kiro-spec-ai-antipattern-fix.md` が存在しなくても valid と扱う。これは optional fix report であり、required success artifact ではない。
- rejected AI gate evidence は task graph accept ではなく `NEEDS_FIXES` または `RETURN_TO_DESIGN` へ route する。
