# Implementation Plan

## Task Format Template

Use this canonical annotation grammar for every executable task.

### Main Task With Executable Work
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(describe the observable completion signal for this task)*
  - _Requirements:_ {{REQUIREMENT_IDS}} *(IDs only; do not add descriptions or parentheses)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

### Main Task and Subtask Structure
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{SUB_PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{OBSERVABLE_COMPLETION_ITEM}} *(describe the observable completion signal for this task)*
  - _Requirements:_ {{REQUIREMENT_IDS}} *(IDs only; do not add descriptions or parentheses)*
  - _Boundary:_ {{COMPONENT_NAMES}}
  - _Depends:_ {{TASK_IDS_OR_NONE}}

## Annotation Rules

- `_Requirements:_ {{REQUIREMENT_IDS}}` uses numeric requirement IDs.
- `_Boundary:_ {{COMPONENT_NAMES}}` names the owning component or workflow boundary.
- `_Depends:_ {{TASK_IDS_OR_NONE}}` uses task IDs when dependencies exist.
- `_Depends:_ none` is the canonical syntax when there is no dependency.
- Add ` (P)` only when boundaries do not overlap and the explicit dependency graph shows the task can run independently.
