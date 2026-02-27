# SDD Design Principles

Rules for technical design in specification-driven development.

## Principles

| Principle | Criteria |
|-----------|----------|
| Type safety | Explicit type definitions in statically typed languages. `any` type prohibited |
| Design vs implementation | Describe WHAT, not HOW. Interfaces first |
| Traceability | Design components must be linked to requirement IDs |
| Self-containedness | The design document alone must be sufficient for review |

## Component Design

| Rule | Criteria |
|------|----------|
| Single responsibility | One component, one responsibility. Must be describable in one sentence |
| Clear boundaries | Public interfaces must be defined |
| Dependency direction | Dependencies from inner (domain) to outer (infrastructure) are prohibited |
| Interface segregation | Dependencies on methods not needed by consumers are prohibited |

## Data Modeling

- Domain model: aggregates, entities, value objects, invariants
- Logical data model: structure, indexes, consistency
- Physical data model: store-specific implementation

## Diagrams

- Use Mermaid notation only
- Node IDs must use only alphanumeric characters and underscores
- Include diagrams only when 3 or more components interact
- No style directives (pure Mermaid)

## Requirements Traceability

Always include a mapping table between requirements and design.

```markdown
| Requirement | Summary | Component | Interface |
|-------------|---------|-----------|-----------|
| 1.1 | ... | ... | ... |
```

## Prohibitions

- Implementation details (specific algorithms, code examples)
- Design documents exceeding 1000 lines (a sign of excessive complexity)
- Components not linked to requirements
