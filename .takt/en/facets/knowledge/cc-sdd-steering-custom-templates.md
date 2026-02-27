# Custom Steering Template Reference

Template information referenced when generating custom steering files.

## Template List

Templates are stored in `.takt/knowledge/cc-sdd-steering-custom-template-files/`.

| Template | Domain | Main Content |
|-------------|---------|---------|
| architecture.md | Architecture | Architectural style, layer boundaries, dependency rules, concurrency model |
| api-standards.md | API Design | Endpoint patterns, request/response format, status codes, authentication, versioning |
| testing.md | Testing Strategy | Test organization, test types, AAA structure, mocking, coverage |
| security.md | Security | Authentication patterns, input validation, secret management |
| database.md | Database | Schema design, migrations, query patterns |
| error-handling.md | Error Handling | Error types, logging, retry strategy |
| authentication.md | Authentication | Authentication flow, permission management, session management |
| deployment.md | Deployment | CI/CD, environment configuration, rollback procedures |

## Common Template Structure

Each template follows this structure:

```markdown
# [Topic Name]

[Purpose: one-line purpose description]

## Philosophy
[Policies and principles, 3-5 items]

## [Domain-Specific Section]
[Patterns and code examples]

## [Domain-Specific Section]
[Patterns and code examples]

---
_Focus on patterns and decisions, not exhaustive lists._
```

## Fallback Structure When No Template Exists

For topics without a template, generate using this structure:

```markdown
# [Topic Name]

## Philosophy
[Policies and principles]

## Patterns
[Patterns, conventions, and code examples]

## Decisions
[Technical decisions and their rationale]

---
_Focus on patterns and decisions._
```
