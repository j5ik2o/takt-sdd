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

## Scope

- current spec artifact boundary に属する files だけを変更する。
- upstream phases、roadmap decomposition、implementation progress、unrelated artifacts を silently edit しない。
- `tasks.md` implementation progress checkboxes を更新しない。
- implementation work を開始しない。

## Fix Rules

- finding が valid で current spec artifact boundary 内で修正可能な場合は修正し、`STATUS: FIXED` を報告する。
- すべての finding が inapplicable または concrete evidence により already resolved の場合は `STATUS: NO_FIX_NEEDED` を報告する。
- upstream phase、roadmap decomposition、task boundaries、approved plan の変更が必要な場合は `STATUS: NEED_REPLAN` を報告する。
- required context、files、permissions が利用できない場合は `STATUS: BLOCKED` を報告する。
- すべての decision に finding-level evidence を残す。

## Output

`kiro-spec-ai-antipattern-fix-result` contract に従って `kiro-spec-ai-antipattern-fix.md` を書く。
