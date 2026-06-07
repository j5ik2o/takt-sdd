---
extends_skill: kiro-spec-tasks
extends_skill_section: "### Step 3: Review Task Plan"
---

{extends: review-requirements}

# Kiro Spec Tasks Review Instruction

## Kiro 固有差分

`tasks.md` と lifecycle metadata を finalize する前に、draft task plan と task graph を review する。この adapter は読み取り専用 (read-only) であり、`tasks.md` の書き込み、`spec.json` の更新、tasks approval、`ready_for_implementation` の設定をしてはならない。

## Review procedure

1. `requirements.md`、`design.md`、`spec.json`、existing `tasks.md` の merge context、前 step の draft task plan、task generation rules を読み込む。
2. `kiro-spec-tasks` Step 3 の task plan review gate を実行する。
3. `kiro-spec-tasks` Step 3.5 の task-graph sanity review を実行する。
4. 両方の review が通過した場合だけ `validation.verdict: "PASS"` を返し、report body に `task plan review PASS` と `task graph sanity review PASS` の evidence を明記する。
5. findings が task plan 内で修復可能な場合は `validation.verdict: "NEEDS_FIX"` を返し、`NEEDS_FIXES` evidence を含める。
6. requirements/design の実ギャップまたは矛盾が見つかった場合は `validation.verdict: "BLOCKED"` を返し、`RETURN_TO_DESIGN` evidence を含める。

## Result mapping

- pass 時は coverage、executability、dependency graph、boundary ownership、`(P)` marker evidence を報告し、artifact は変更しない。
- needs-fix または blocked 時は具体的な findings を含め、`tasks.md` と `spec.json` を変更しない。
