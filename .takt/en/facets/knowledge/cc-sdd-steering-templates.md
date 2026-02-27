# Steering Template Reference

Template structures referenced when generating steering files.

## Core File Templates

### product.md

```markdown
# Product Overview

[Concise description of the product and its target users]

## Core Capabilities

[3-5 key capabilities, not an exhaustive list]

## Target Use Cases

[Primary scenarios this product addresses]

## Value Proposition

[What makes this product unique or valuable]
```

### tech.md

```markdown
# Technology Stack

## Architecture

[High-level system design approach]

## Core Technologies

- **Language**: [e.g., TypeScript, Rust]
- **Framework**: [e.g., React, Actix-web]
- **Runtime**: [e.g., Node.js 20+]

## Key Libraries

[Only major libraries that influence development patterns]

## Development Standards

### Type Safety
[e.g., TypeScript strict mode]

### Code Quality
[e.g., ESLint, clippy]

### Testing
[e.g., Jest, cargo test]

## Common Commands

```bash
# Dev: [command]
# Build: [command]
# Test: [command]
```

## Key Technical Decisions

[Important architectural choices and their rationale]
```

### structure.md

```markdown
# Project Structure

## Organization Philosophy

[feature-first, layered, domain-driven, etc.]

## Directory Patterns

### [Pattern Name]
**Location**: `/path/`
**Purpose**: [What belongs here]
**Example**: [Brief example]

## Naming Conventions

- **Files**: [Pattern]
- **Components**: [Pattern]
- **Functions**: [Pattern]

## Import Organization

[Import pattern examples]

## Code Organization Principles

[Key architectural patterns and dependency rules]
```

## Template Storage Location

Template files are stored in `.takt/knowledge/cc-sdd-steering-template-files/`:
- `product.md` - Product overview template
- `tech.md` - Technology stack template
- `structure.md` - Project structure template

Custom steering templates are stored in `.takt/knowledge/cc-sdd-steering-custom-template-files/`.
