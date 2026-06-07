---
extends_skill: kiro-spec-requirements
extends_skill_section: "### Step 4: Review Requirements Draft"
---

{extends: review-requirements}

# Kiro Spec Requirements Review Instruction

## Kiro 固有差分

`.kiro/specs/<feature>/requirements.md` の draft を、lifecycle metadata を `requirements-generated` へ昇格する前に review する。この adapter は読み取り専用 (read-only) で、`spec.json` を finalize してはならない。

## Review procedure

1. 生成された requirements draft、`spec.json`、steering context、requirements rules を読み込む。
2. EARS fixed phrases、numeric IDs、検証可能な acceptance criteria、重複した振る舞い、結合された振る舞い、残存する scope ambiguity を確認する。
3. この Kiro skill section は専用の uppercase review machine field を定義していないため、requirements review gate が通過し、draft が finalize step に進める場合だけ `validation.verdict: "PASS"` を返す。
4. local repair が可能な場合は `validation.verdict: "NEEDS_FIX"` を返す。
5. scope ambiguity または検証不能な acceptance criteria が human clarification を必要とする場合は `validation.verdict: "BLOCKED"` を返す。

## Result mapping

- pass 時は `requirements review gate passed` を報告し、lifecycle metadata は更新しない。
- needs-fix または blocked 時は具体的な findings を含め、`spec.json` を `requirements-generated` success state にしない。
