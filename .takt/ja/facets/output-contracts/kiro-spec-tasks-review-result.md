{extends: validation}

# Kiro Spec Tasks Review Result Output Contract

## Machine Fields

- `task_plan_review`: `PASS`、`NEEDS_FIXES`、`RETURN_TO_DESIGN` のいずれか。
- `task_graph_sanity_review`: `PASS`、`NEEDS_FIXES`、`RETURN_TO_DESIGN` のいずれか。
- `fatal_review_issue`: `NONE`、`AI_GATE_SCOPE_MISMATCH`、`REVIEW_TARGET_SCOPE_MISMATCH`、`MISSING_DRAFT_ARTIFACT` のいずれか。
- `findings`: task plan または task graph の具体的な findings。
- `evidence`: coverage、executability、dependency graph、boundary ownership、`(P)` marker の evidence。
- `summary`: 人間向け summary。workflow rule は `summary` で分岐してはならない。

## Result Rules

- `PASS` は、対応する review gate が通過し、draft が finalization に進めることを表す。
- `NEEDS_FIXES` は、問題が task plan 内で修復可能であり repair へ進めることを表す。
- `RETURN_TO_DESIGN` は、task review が requirements/design の実ギャップまたは矛盾を見つけたため、この phase を abort することを表す。
- `fatal_review_issue` は、task plan 内で修復可能な問題では `NONE` とする。workflow が repair ではなく abort すべき non-local issue では、対応する enum を設定する。
