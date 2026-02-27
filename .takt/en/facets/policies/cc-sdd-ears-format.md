# EARS Format Requirements Writing Convention

Rules for writing requirements based on EARS (Easy Approach to Requirements Syntax).

## Principles

| Principle | Criteria |
|-----------|----------|
| Testability | Each acceptance criterion must be verifiable through automated or manual testing |
| Uniqueness | One criterion, one behavior. Split if multiple behaviors are included |
| Clarity | Must not contain ambiguous modifiers (appropriately, quickly, sufficiently, etc.) |
| Completeness | Must cover normal cases, error cases, and boundary conditions |

## Requirement Structure

### Requirement ID

Use numeric IDs only. Prefixes and alphabetic characters are prohibited.

```
// OK
1, 1.1, 1.2, 2, 2.1

// REJECT
REQ-001, A, B, FR-1
```

### Purpose Statement

Write in user story format.

```markdown
**Purpose:** As a {role}, I want to achieve {feature} so that I can gain {benefit}.
```

### Acceptance Criteria Patterns

#### Event-driven

```
When [event] occurs, [system] shall [response]
```

#### State-driven

```
If [condition], [system] shall [response]
```

#### Unwanted behavior

```
If [unwanted event] occurs, [system] shall [response]
```

#### Optional feature

```
If [feature/option] is included, [system] shall [response]
```

#### Ubiquitous

```
[System] shall always [response]
```

## Quality Checks

| Check | REJECT Criteria |
|-------|----------------|
| Ambiguous modifiers | Contains "appropriately," "quickly," "sufficiently," "correctly," etc. |
| Multiple behaviors | Contains multiple responses joined by "and" or "as well as" in a single criterion |
| Undefined subject | Only "system" without a specific module name |
| Not testable | No verification method can be defined |
| Implementation directive | Contains HOW, such as "using the ... algorithm" |
