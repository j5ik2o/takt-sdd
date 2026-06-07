{extends: validation}

# Kiro Cross-Spec Review Output Contract

## Machine Fields

- `verdict`: `PASS`、`NEEDS_FIX`、`DECOMPOSITION_RETURN` のいずれか。
- `issues`: issue object の配列。
- `severity`: `CRITICAL`、`IMPORTANT`、`MINOR`、`DECOMPOSITION_RETURN` のいずれか。
- `affectedSpecs`: issue の影響を受ける feature name 配列。
- `issueCategory`: `DATA_MODEL_MISMATCH`、`INTERFACE_MISMATCH`、`DUPLICATE_FUNCTIONALITY`、`DEPENDENCY_INCOMPLETE`、`NAMING_DRIFT`、`SHARED_INFRASTRUCTURE_OVERLAP`、`TASK_BOUNDARY_CONFLICT`、`DECOMPOSITION_RETURN` のいずれか。
- `suggestedFix`: local remediation が可能な場合の修正 summary。
- `repairTarget`: remediation 対象の spec file、task boundary、または roadmap/discovery target。
- `decompositionReturn`: `verdict` または `severity` が `DECOMPOSITION_RETURN` の場合に必須の説明。

## Result Rules

- `PASS` は data model consistency、interface alignment、duplicate functionality、dependency completeness、naming conventions、shared infrastructure ownership、task boundary alignment が許容範囲であることを示す。
- `NEEDS_FIX` は `affectedSpecs` と `repairTarget` に対して local remediation を試せることを示す。
- `DECOMPOSITION_RETURN` は batch が implementation readiness を確定せず roadmap/discovery に戻るべきことを示す。
