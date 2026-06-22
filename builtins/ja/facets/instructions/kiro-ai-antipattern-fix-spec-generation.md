---
id: kiro-ai-antipattern-fix-spec-generation
kind: instruction
name: Kiro AI Antipattern Fix Spec Generation
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction for generated Kiro spec drafts.
---

{extends: fix}

# Kiro AI Antipattern Fix Spec Generation

current generated Kiro spec draft に対する AI antipattern findings を修正または判定する。

## Inputs

- `kiro-spec-ai-antipattern-review.md` を読み、その report のすべての finding を扱う。
- `.kiro/specs/<feature>/` 配下の current spec files を authoritative な current spec artifact boundary として扱う。
- caller workflow の active phase context から draft が requirements、design、tasks のどれかを判断する。
- design phase の `draft_status: READY_FOR_REVIEW` では、`design.md` / `research.md` がまだ書かれていないことは正常です。Previous Response または caller phase result report の `draft_artifacts.design` / `draft_artifacts.research`、または `## design.md draft` / `## research.md draft` を修正対象にする。
- tasks phase の `draft_status: READY_FOR_REVIEW` では、`tasks.md` がまだ書かれていないことは正常です。Previous Response または caller phase result report の `draft_artifacts.tasks`、`## draft_artifacts.tasks`、または `## Draft tasks.md` を修正対象にする。

## Scope

- current spec artifact boundary に属する files だけを変更する。
- upstream phases、roadmap decomposition、implementation progress、unrelated artifacts を silently edit しない。
- design phase の draft review mode で review target が git diff、current dirty worktree、unrelated workflow/facet changes、または別 phase artifact にずれている finding は current spec draft finding ではないため修正対象にしない。
- tasks phase の draft review mode で review target が git diff、current dirty worktree、unrelated workflow/facet/script/test changes、または別 phase artifact にずれている finding は current spec draft finding ではないため修正対象にしない。
- `tasks.md` implementation progress checkboxes を更新しない。
- implementation work を開始しない。
- finalize 前の design draft を修正する場合は、`.kiro/specs/<feature>/design.md` を新規作成して lifecycle を進めない。修正済み draft を response/report に返し、finalize step に引き渡す。
- finalize 前の tasks draft を修正する場合は、`.kiro/specs/<feature>/tasks.md` を新規作成して lifecycle を進めない。修正済み draft を response/report に返し、finalize step に引き渡す。

## Fix Rules

- finding が valid で current spec artifact boundary 内で修正可能な場合は修正し、`STATUS: FIXED` を報告する。
- すべての finding が inapplicable または concrete evidence により already resolved の場合は `STATUS: NO_FIX_NEEDED` を報告する。
- upstream phase、roadmap decomposition、task boundaries、approved plan の変更が必要な場合は `STATUS: NEED_REPLAN` を報告する。
- required context、files、permissions が利用できない場合は `STATUS: BLOCKED` を報告する。
- `missing_draft_artifact`、`ai_gate_scope_mismatch`、`review_target_scope_mismatch`、または unrelated git diff / current dirty worktree に対する finding は local fix せず `STATUS: NEED_REPLAN` を報告する。
- すべての decision に finding-level evidence を残す。

## Output

`kiro-spec-ai-antipattern-fix-result` contract に従って `kiro-spec-ai-antipattern-fix.md` を書く。
