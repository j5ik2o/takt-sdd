# Implementation Plan

## Task Format Template

Use this canonical annotation grammar for every executable task.

### Major task with executable work
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(State the concrete completion signal for this task.)*
  - _Requirements: {{REQUIREMENT_IDS}}_ *(IDs only; do not add descriptions or parentheses.)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

### Major + sub-task structure
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(State the concrete completion signal for this task.)*
  - _Requirements: {{REQUIREMENT_IDS}}_ *(IDs only; do not add descriptions or parentheses.)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

## Annotation Rules

- `_Requirements: {{REQUIREMENT_IDS}}_` uses numeric requirement IDs.
- `_Boundary:_ {{COMPONENT_NAMES}}` names the owned component or workflow boundary.
- `_Depends:_ {{TASK_IDS_OR_NONE}}` uses task IDs when dependencies exist.
- `_Depends:_ none` is the canonical grammar for no dependencies.
- ` (P)` is appended only when non-overlapping boundary and an explicit dependency graph show independent execution.
