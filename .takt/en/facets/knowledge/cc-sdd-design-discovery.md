# Design Discovery Process Knowledge

## Discovery Scope Classification

| Scope | Condition | Investigation Level |
|---------|------|-----------|
| New Feature | No similar implementation exists in the codebase | Full discovery (including external research) |
| Existing Extension | Extension of an existing pattern | Lightweight discovery (focused on integration points) |
| Simple Addition | Change involving roughly one file | Minimal (pattern confirmation only) |

## Full Discovery Process

1. **Requirements Analysis**: Organize functional/non-functional requirements, constraints, and technical challenges
2. **Existing Implementation Analysis**: Codebase structure, reusable components, domain boundaries, integration points
3. **Technical Research**: Patterns, best practices, latest information, pitfalls
4. **External Dependencies**: Documentation review, API signatures, version compatibility, rate limits, security
5. **Architecture Pattern Evaluation**: Pattern comparison, fit assessment, boundary identification
6. **Risk Assessment**: Performance, security, integration complexity, technical debt

## Lightweight Discovery Process

1. **Extension Point Analysis**: Identify existing extension points, determine change scope, confirm patterns
2. **Dependency Check**: Version compatibility, API contracts, no breaking changes
3. **Quick Technical Review**: Check documentation, usage patterns, and compatibility
4. **Integration Risk Assessment**: Impact, performance, security, testing

## Escalation Triggers

Conditions for escalating from lightweight to full discovery:
- Significant architectural changes are required
- Complex external integrations exist
- Security-sensitive areas are involved
- Performance-critical concerns arise
- Unknown dependencies are present
