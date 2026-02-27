# SDD Design Review Convention

Rules for quality review of technical design documents.

## Principles

| Principle | Criteria |
|-----------|----------|
| Quality assurance | Do not pursue perfection; judge by acceptable risk |
| Focus on critical issues | Maximum 3 findings. Only those that significantly impact success |
| Balance | Acknowledge strengths, not just problems |
| Feasibility | All suggestions must be implementable |

## Review Perspectives

### Alignment with Existing Architecture (Highest Priority)

- Integration with existing system boundaries and layers
- Consistency with established architecture patterns
- Management of dependency direction and coupling
- Alignment with current module structure

### Design Consistency and Standards

- Compliance with project naming conventions and code standards
- Uniformity of error handling and logging strategy
- Uniformity of configuration and dependency management
- Alignment with data modeling patterns

### Extensibility and Maintainability

- Design flexibility for future requirements
- Separation of concerns / single responsibility
- Testability / debuggability
- Appropriateness of complexity relative to requirements

### Type Safety and Interface Design

- Proper type definitions and interface contracts
- Avoidance of unsafe patterns such as `any` types
- Clear API boundaries and data structures
- Coverage of input validation and error handling

## Verdict

| Verdict | Conditions |
|---------|------------|
| GO | No critical architectural misalignment, requirements addressed, implementation path clear, risks within acceptable range |
| NO-GO | Fundamental contradictions, critical gaps, high failure risk, disproportionate complexity |

## Traceability

- Link each finding to a requirement ID in `requirements.md`
- Cite the design document section/heading as evidence
