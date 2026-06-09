# Research and Design Decision Template

---
**Purpose**: Record discovery findings, architecture research, and decision rationale that support the technical design.

**How to use**:
- Record research activities and outcomes during discovery.
- Document design tradeoffs that are too detailed for `design.md`.
- Provide references and rationale for future audit and reuse.
---

## Summary
- **Feature**: `<feature-name>`
- **Discovery Scope**: New feature / enhancement / simple addition / complex integration
- **Key Findings**:
  - Finding 1
  - Finding 2
  - Finding 3

## Research Log
Record notable research steps and outcomes. Group entries by topic for readability.

### [Topic or Question]
- **Context**: What prompted this research?
- **Sources Consulted**: Links, documentation, API references, benchmarks
- **Findings**: Concise bullets summarizing what was learned
- **Implications**: How this affects architecture, contracts, or implementation

_Repeat this subsection for each major topic._

## Architecture Pattern Evaluation
List candidate patterns or approaches. Use a table when helpful.

| Option | Description | Strengths | Risks / Constraints | Notes |
|--------|-------------|-----------|---------------------|-------|
| Hexagonal | Port and adapter abstraction around the core domain | Clear boundaries, testable core | Requires adapter layer setup | Aligns with existing steering principle X |

## Design Decisions
Record key decisions that affect `design.md`. Focus on choices with meaningful tradeoffs.

### Decision: `<title>`
- **Context**: Requirement or problem driving the decision
- **Alternatives Considered**:
  1. Option A - short description
  2. Option B - short description
- **Selected Approach**: What was chosen and how it works
- **Rationale**: Why this fits the current project context
- **Tradeoffs**: Benefits and compromises
- **Follow-up**: Items to verify during implementation or testing

_Repeat this subsection for each decision._

## Risks and Mitigations
- Risk 1 - proposed mitigation
- Risk 2 - proposed mitigation
- Risk 3 - proposed mitigation

## References
Use canonical links and sources: official docs, standards, ADRs, or internal guidelines.
- [Title](https://example.com) - short note about relevance
- ...
