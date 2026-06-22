{extends: design-planning}

# Kiro Cross-Spec Boundaries Policy

## Review Scope

cross-spec review は generated `.kiro/specs/*/requirements.md`、`design.md`、`tasks.md`、`.kiro/steering/roadmap.md` を読む。`design.md` を architecture evidence の主入力、`requirements.md` を acceptance scope、`tasks.md` の `_Boundary:_` annotation を ownership evidence として扱う。

## Issue Categories

- `DATA_MODEL_MISMATCH`: specs 間の data model consistency 問題。
- `INTERFACE_MISMATCH`: upstream output と downstream input の interface alignment 問題。
- `DUPLICATE_FUNCTIONALITY`: duplicate functionality または ownership overlap。
- `DEPENDENCY_INCOMPLETE`: roadmap と generated specs の dependency completeness 問題。
- `NAMING_DRIFT`: naming conventions の不一致。
- `SHARED_INFRASTRUCTURE_OVERLAP`: shared infrastructure ownership が曖昧。
- `TASK_BOUNDARY_CONFLICT`: task boundary annotation が互換しない files/components を主張している。
- `DECOMPOSITION_RETURN`: local fix では解消できず roadmap/discovery に戻すべき問題。

## Routing

- local issue は `affectedSpecs` と `suggestedFix` を持つ `repairTarget` を返す。
- decomposition issue は `DECOMPOSITION_RETURN` を返し、`repairTarget` は空または roadmap-scoped にして implementation-ready を確定しない。
- minor issue は batch completion を block しない awareness finding として返す。
