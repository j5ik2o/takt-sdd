Identify the target for custom steering creation and check whether a template exists.

**What to do:**
1. Identify the custom steering domain/topic from the user's input
2. Check whether a corresponding template exists in `.takt/knowledge/steering-custom-template-files/`
3. Check whether a file with the same name already exists in `.kiro/steering/`
4. Report the determination results

**Available templates:**

| Template | Domain |
|----------|--------|
| architecture.md | Architecture styles, layer boundaries, dependency rules |
| api-standards.md | REST/GraphQL conventions, error handling |
| testing.md | Test structure, mocking, coverage |
| security.md | Authentication patterns, input validation, secret management |
| database.md | Schema design, migrations, query patterns |
| error-handling.md | Error types, logging, retry strategies |
| authentication.md | Authentication flows, permission management, session management |
| deployment.md | CI/CD, environment configuration, rollback procedures |

**Determination criteria:**

| Condition | Mode |
|-----------|------|
| Template exists, no existing file | Template-based generation |
| No template, no existing file | Scratch generation |
| Existing file found | Update |

**Information to include in the report:**
- Target topic name
- Whether a template exists
- Whether an existing file exists
- Recommended mode
