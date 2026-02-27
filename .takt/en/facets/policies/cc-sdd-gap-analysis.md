# SDD Gap Analysis Convention

Rules for gap analysis between requirements and the existing codebase.

## Principles

| Principle | Criteria |
|-----------|----------|
| Informational | Provide analysis and options, not final decisions |
| Multiple options | Present viable alternatives |
| Explicit gaps | Clearly flag unknowns and constraints |
| Context alignment | Align with existing patterns and architecture constraints |

## Analysis Framework

### Current State Investigation

- Domain-related files, modules, and directory structure
- Reusable components, services, and utilities
- Architecture patterns and constraints
- Naming, layering, and dependency direction conventions
- Integration surfaces (data models, API clients, authentication, etc.)

### Implementation Approaches

| Approach | Conditions | Pros | Cons |
|----------|------------|------|------|
| A: Extend existing | Naturally fits existing structure | Minimal file additions | Risk of bloat |
| B: Create new | Clearly different responsibility | Clean separation | File proliferation |
| C: Hybrid | Composite functionality | Balanced | Planning complexity |

### Complexity and Risk

| Effort | Criteria |
|--------|----------|
| S (1-3 days) | Existing patterns, minimal dependencies, straightforward integration |
| M (3-7 days) | New patterns involved, moderate complexity |
| L (1-2 weeks) | Large feature, multiple integrations |
| XL (2+ weeks) | Architecture changes, unknown technology |

| Risk | Criteria |
|------|----------|
| High | Unknown technology, complex integration, architecture changes |
| Medium | New patterns with guidance, manageable integration |
| Low | Extension of established patterns, known technology, clear scope |

## Out of Scope

- Defer detailed research to the design phase
- Record unknowns briefly as "needs investigation" only
