# SDD Task Generation Convention

Rules for task decomposition in specification-driven development.

## Principles

| Principle | Criteria |
|-----------|----------|
| Natural language description | Describe in terms of features, behaviors, and outcomes. File paths, function names, and type names are prohibited |
| Requirement mapping | Append `_Requirements: X.X, Y.Y_` at the end of each task |
| Code only | Include only implementation, tests, and technical setup. Exclude deployment, documentation, and user testing |
| Incremental building | Build upon the outcomes of previous tasks |

## Task Hierarchy

Maximum 2 levels.

```markdown
- [ ] 1. Major task
- [ ] 1.1 Subtask
  - Detail item
  - _Requirements: 1.1, 1.2_
- [ ] 1.2 Subtask
  - Detail item
  - _Requirements: 1.3_
```

Nesting beyond 3 levels is prohibited.

## Parallelism Analysis

When tasks can be executed in parallel, append `(P)` immediately after the task number.

```markdown
- [ ] 2.1 (P) Build background worker
```

### Parallelism Conditions (all must be met)

- No data dependency on incomplete tasks
- No file or shared resource conflicts
- No prerequisite review or approval required
- Environment and setup already complete

## Size Criteria

Group by logical cohesion. Do not force fit to an artificial number of splits.

## Prohibitions

- Describing file paths, function names, class names, or API contracts
- Nesting beyond 3 levels
- Tasks for deployment, documentation, or user testing
- Omitting requirement IDs
