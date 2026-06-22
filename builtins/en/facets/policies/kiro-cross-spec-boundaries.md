{extends: design-planning}

# Kiro Cross-Spec Boundaries Policy

## Review Scope

Cross-spec review reads generated `.kiro/specs/*/requirements.md`, `design.md`, `tasks.md`, and `.kiro/steering/roadmap.md`. It treats `design.md` as primary architecture evidence, `requirements.md` as acceptance scope, and `_Boundary:_` task annotations as ownership evidence.

## Issue Categories

- `DATA_MODEL_MISMATCH`: data model consistency problem across specs.
- `INTERFACE_MISMATCH`: interface alignment problem between upstream output and downstream input.
- `DUPLICATE_FUNCTIONALITY`: duplicate functionality or overlapping ownership.
- `DEPENDENCY_INCOMPLETE`: dependency completeness problem between roadmap and generated specs.
- `NAMING_DRIFT`: naming conventions are inconsistent.
- `SHARED_INFRASTRUCTURE_OVERLAP`: shared infrastructure ownership is unclear.
- `TASK_BOUNDARY_CONFLICT`: task boundary annotations claim incompatible files or components.
- `DECOMPOSITION_RETURN`: issue cannot be fixed locally and must return to roadmap/discovery.

## Routing

- Local issue: return `repairTarget` with `affectedSpecs` and `suggestedFix`.
- Decomposition issue: return `DECOMPOSITION_RETURN`, keep `repairTarget` empty or roadmap-scoped, and do not mark implementation-ready.
- Minor issue: return awareness finding without blocking batch completion.

Use decomposition routing when the issue changes spec boundaries, dependency direction, or roadmap ownership rather than a local artifact detail.
