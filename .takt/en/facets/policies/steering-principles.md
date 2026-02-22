# Steering Principles

Steering files are **project memory**, not exhaustive specifications.

## Golden Rule

> "If new code follows existing patterns, no steering update is needed"

## Content Granularity

### What to Record

| Subject | Example |
|---------|---------|
| Organizational patterns | feature-first, layered |
| Naming conventions | PascalCase rules |
| Import strategy | Absolute paths vs relative paths |
| Architecture decisions | State management approach |
| Technology standards | Key frameworks |

### What Not to Record

| Subject | Reason |
|---------|--------|
| Complete file lists | Cataloging has high maintenance cost |
| Descriptions of all components | Can be substituted by patterns |
| All dependencies | Managed by package.json, etc. |
| Implementation details | Code is the source of truth |
| Agent-specific directories | `.cursor/`, `.gemini/`, `.claude/`, etc. |
| Contents of `.kiro/settings/` | Metadata, not knowledge |

## Security

Never include the following:
- API keys, passwords, credentials
- Database URLs, internal IPs
- Secrets or sensitive data

## Quality Criteria

| Criteria | Description |
|----------|-------------|
| Single domain | One file, one topic |
| Concrete examples | Demonstrate patterns with code |
| Rationale | Explain why the decision was made |
| Maintainable size | Target 100-200 lines |

## Update Rules (Sync Mode)

- Preserve user sections and custom examples
- Default to additive updates (add, don't replace)
- Include an `updated_at` timestamp
- Record the reason for changes
