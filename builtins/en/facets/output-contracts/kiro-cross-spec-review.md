{extends: validation}

# Kiro Cross-Spec Review Output Contract

## Machine Fields

- `verdict`: one of `PASS`, `NEEDS_FIX`, or `DECOMPOSITION_RETURN`.
- `issues`: array of issue objects.
- `severity`: one of `CRITICAL`, `IMPORTANT`, `MINOR`, or `DECOMPOSITION_RETURN`.
- `affectedSpecs`: array of feature names affected by the issue.
- `issueCategory`: one of `DATA_MODEL_MISMATCH`, `INTERFACE_MISMATCH`, `DUPLICATE_FUNCTIONALITY`, `DEPENDENCY_INCOMPLETE`, `NAMING_DRIFT`, `SHARED_INFRASTRUCTURE_OVERLAP`, `TASK_BOUNDARY_CONFLICT`, or `DECOMPOSITION_RETURN`.
- `suggestedFix`: local correction summary when local remediation is possible.
- `repairTarget`: spec file, task boundary, or roadmap/discovery target for remediation.
- `decompositionReturn`: explanation required when `verdict` or `severity` is `DECOMPOSITION_RETURN`.

## Result Rules

- `PASS` means data model consistency, interface alignment, duplicate functionality, dependency completeness, naming conventions, shared infrastructure ownership, and task boundary alignment are acceptable.
- `NEEDS_FIX` means local remediation can be attempted against `affectedSpecs` and `repairTarget`.
- `DECOMPOSITION_RETURN` means the batch must not confirm implementation readiness and must return to roadmap/discovery.
