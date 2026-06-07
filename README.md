# takt-sdd

[![npm version](https://img.shields.io/npm/v/create-takt-sdd)](https://www.npmjs.com/package/create-takt-sdd)
[![CI](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml)
[![Release](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml)
[![Publish](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-installer.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-installer.yml)
[![Lines of Code](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/j5ik2o/takt-sdd/refs/heads/main/.github/badges/tokei_badge.json)](https://github.com/j5ik2o/takt-sdd)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![License](https://img.shields.io/badge/License-APACHE2.0-blue.svg)](https://opensource.org/licenses/apache-2-0)

> **Write the spec. takt reliably ships the rest.**

[日本語](README.ja.md)

A Spec-Driven Development (SDD) workflow definition repository using [takt](https://github.com/nrslib/takt).

Automates the entire development flow — from requirements definition through design, task decomposition, implementation, review, and validation — using takt workflows (YAML workflows) and facets.

takt-sdd is compatible with Kiro (`.kiro/specs/`) and can be used alongside it.

## Features

takt-sdd uses [takt](https://github.com/nrslib/takt)'s state-machine-based workflow control to deterministically manage AI agent execution paths.

- **Declarative Workflow Control** — Define AI agent execution order and transition conditions declaratively in workflows (YAML). While AI output itself is non-deterministic, "which step, in what order, under what conditions" is deterministically controlled by YAML rules. Workflows progress as state machines, not free-form chat.
- **Faceted Prompting** — Separate prompts into 5 independent concerns (Persona / Policy / Instruction / Knowledge / Output Contract). Each facet is reusable and swappable, shareable across workflows. Eliminates duplication of monolithic prompts and improves maintainability.
- **Multi-stage Validation** — Place validation gates at each phase: requirements, design, and implementation. Gap analysis, design review (GO/NO-GO decisions), and parallel architecture/QA/implementation reviews detect quality issues early and minimize rework.
- **Loop Detection and Supervisory Control** — Automatically detect repetitive patterns like plan→implement and review→fix. When thresholds are exceeded, a supervisor intervenes to assess progress and automatically escalates unproductive loops.
- **Adaptive Batch Implementation** — Analyze inter-task dependencies and automatically choose between sequential and parallel execution. Independent tasks are processed in parallel by multiple workers.
- **Provider Agnostic** — The same workflow definitions work across different providers such as Claude and Codex.

## Prerequisites

- Node.js 22+ (takt is automatically added to `devDependencies` during installation)

## Installation

To add the SDD workflow to your project, run the following in your project root:

```bash
npx create-takt-sdd
```

For Japanese facets and messages:

```bash
npx create-takt-sdd --lang ja
```

To install a specific version or the latest release:

```bash
npx create-takt-sdd --tag latest
npx create-takt-sdd --tag 0.1.2
```

The installer sets up the following:

- **`.takt/`** — Workflows (YAML workflows) and facets in the selected language (`--lang`)
- **`openspec/config.yaml`** — OpenSpec project config initialized via the official OpenSpec `1.3.1` CLI
- **`package.json`** — npm scripts for each phase + `takt` and `@fission-ai/openspec@1.3.1` as devDependencies

Options:

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing `.takt/` directory |
| `--tag <version>` | Install a specific version (`latest`, `0.2.0`, etc.) |
| `--lang <en\|ja>` | Facet and message language (default: `en`) |
| `--dry-run` | Preview files without writing |

When `package.json` already exists, only npm scripts are merged (existing scripts are not overwritten). The installer also runs `openspec init --tools none --force .`, so OpenSpec is ready without generating extra AI-tool-specific files.

### Adding Individual Skills

TAKT skills now live in [`j5ik2o/ai-tools`](https://github.com/j5ik2o/ai-tools). You can install them individually using `npx skills add`:

```bash
npx -y skills add j5ik2o/ai-tools --skill takt-analyzer
npx -y skills add j5ik2o/ai-tools --skill takt-facet-builder
npx -y skills add j5ik2o/ai-tools --skill takt-optimizer
npx -y skills add j5ik2o/ai-tools --skill takt-piece-builder
npx -y skills add j5ik2o/ai-tools --skill takt-task-builder
```

## Kiro Compatibility Workflow

Use `kiro:*` scripts for new SDD workflow usage. Legacy `cc-sdd:*` scripts remain available for existing projects during migration, but new documentation and agent guidance should prefer the Kiro surface.

| Phase | npm script | Workflow identity | Description |
|-------|------------|-------------------|-------------|
| Discovery | `kiro:discovery` | `kiro-discovery` | Route a feature idea, update brief/roadmap when needed |
| Spec quick path | `kiro:spec:quick` | `kiro-spec-quick` | Generate requirements, design, and tasks through the closed-loop path |
| Requirements | `kiro:spec:requirements` | `kiro-spec-requirements` | Generate requirements in EARS format |
| Gap validation | `kiro:validate:gap` | `kiro-validate-gap` | Compare requirements with the current codebase |
| Design | `kiro:spec:design` | `kiro-spec-design` | Generate technical design and discovery notes |
| Design validation | `kiro:validate:design` | `kiro-validate-design` | Review design quality and return a GO/NO-GO decision |
| Tasks | `kiro:spec:tasks` | `kiro-spec-tasks` | Generate implementation tasks |
| Batch specs | `kiro:spec:batch` | `kiro-spec-batch` | Generate multiple specs from roadmap dependency order |
| Status | `kiro:spec:status` | `kiro-spec-status` | Report spec phase, approvals, and readiness |
| Implementation | `kiro:impl` | `kiro-impl` | Implement approved tasks with review/debug/verify gates |
| Implementation validation | `kiro:validate:impl` | `kiro-validate-impl` | Validate implementation evidence and remaining manual checks |

### Quick Execution

Run requirements → design → tasks through the quick path:

```bash
npm run kiro:spec:quick -- "description of requirements..."
```

### Phase-by-Phase Execution

Run each phase workflow individually, allowing human intervention between phases.

```bash
# Optional discovery
npm run kiro:discovery -- "feature idea..."

# Requirements generation
npm run kiro:spec:requirements -- "description of requirements..."
# Check the {feature} name in .kiro/specs/{feature}

# Gap analysis (only when existing code exists)
npm run kiro:validate:gap -- "feature={feature}"

# Design generation
npm run kiro:spec:design -- "feature={feature}"

# Design validation
npm run kiro:validate:design -- "feature={feature}"

# Task generation
npm run kiro:spec:tasks -- "feature={feature}"

# Implementation
npm run kiro:impl -- "feature={feature}"

# Implementation validation
npm run kiro:validate:impl -- "feature={feature}"
```

### Migration from legacy `cc-sdd:*` scripts

Legacy scripts are compatibility entrypoints. They continue to call the existing `cc-sdd-*` workflows and are not aliases for `kiro:*`.

| Legacy script | New Kiro script |
|---------------|-----------------|
| `cc-sdd:full` | `kiro:spec:quick` |
| `cc-sdd:requirements` | `kiro:spec:requirements` |
| `cc-sdd:validate-gap` | `kiro:validate:gap` |
| `cc-sdd:design` | `kiro:spec:design` |
| `cc-sdd:validate-design` | `kiro:validate:design` |
| `cc-sdd:tasks` | `kiro:spec:tasks` |
| `cc-sdd:impl` | `kiro:impl` |
| `cc-sdd:validate-impl` | `kiro:validate:impl` |
| `cc-sdd:steering` | `kiro:steering` |
| `cc-sdd:steering-custom` | `kiro:steering-custom` |

<details>
<summary>Legacy CC-SDD scripts</summary>

```bash
npm run cc-sdd:full -- "description of requirements..."
npm run cc-sdd:requirements -- "description of requirements..."
npm run cc-sdd:validate-gap -- "feature={feature}"
npm run cc-sdd:design -- "feature={feature}"
npm run cc-sdd:validate-design -- "feature={feature}"
npm run cc-sdd:tasks -- "feature={feature}"
npm run cc-sdd:impl -- "feature={feature}"
npm run cc-sdd:validate-impl -- "feature={feature}"
```

</details>

### Output Files

Artifacts from each phase are output to `.kiro/specs/{feature}/`. The format is compatible with Kiro specifications.

| Phase | File | Description |
|-------|------|-------------|
| 1 | `requirements.md` | Requirements document in EARS format |
| 1.5 | `gap-analysis.md` | Gap analysis between requirements and existing codebase |
| 2 | `design.md` | Technical design (architecture, components, data model) |
| 2 | `research.md` | Discovery log (research findings and design decision rationale) |
| 2.5 | `design-review.md` | Design review results (GO/NO-GO decision) |
| 3 | `tasks.md` | Implementation task list (progress updated during implementation) |


## Steering (Project Memory Management)

Separate from the SDD workflow, workflows are provided to manage `.kiro/steering/` as project memory.

| Workflow | Description |
|-------|-------------|
| `kiro-steering` | Generation and sync of core steering files (product.md / tech.md / structure.md) |
| `kiro-steering-custom` | Creation of domain-specific custom steering files |

### steering

Analyzes the codebase and records the project's purpose, tech stack, and structural patterns in `.kiro/steering/`. Runs in bootstrap mode on first execution, and in sync mode afterwards to detect drift from the code.

For greenfield projects (no existing code), skeleton files with placeholders are generated so developers can fill in their decisions.

```bash
npm run kiro:steering -- "sync steering"

# Greenfield: specify product direction and tech choices upfront
npm run kiro:steering -- "REST API server with TypeScript, Express, PostgreSQL"
```

### steering-custom

Creates steering files for specific domains such as architecture policies, API standards, and testing strategies. Templates are available in `.takt/knowledge/steering-custom-template-files/`.

```bash
npm run kiro:steering-custom -- "architecture"
# Specify the {name} from .takt/knowledge/steering-custom-template-files/{name}.md
```

Available templates:

| Template | Description |
|----------|-------------|
| `architecture` | Architecture style (hexagonal, clean architecture, etc.), layer boundaries, dependency rules |
| `api-standards` | Endpoint patterns, request/response formats, versioning |
| `testing` | Test structure, test types, coverage |
| `security` | Authentication patterns, input validation, secret management |
| `database` | Schema design, migrations, query patterns |
| `error-handling` | Error types, logging, retry strategies |
| `authentication` | Authentication flows, authorization management, session management |
| `deployment` | CI/CD, environment configuration, rollback procedures |

#### Greenfield Support (Projects with No Existing Code)

Both `kiro:steering` and `kiro:steering-custom` support greenfield projects. Skeleton files can be generated even when the codebase is empty. Steering files are generated based on the template structure with placeholders (`[choice]`, `[rationale]`, etc.) for developers to fill in.

To specify policies upfront, add them to the command:

```bash
# Generate core steering skeletons (product.md / tech.md / structure.md)
npm run kiro:steering -- "generate steering"

# Specify product direction and tech choices upfront
npm run kiro:steering -- "REST API server with TypeScript, Express, PostgreSQL"

# Custom steering: specify architecture policies
npm run kiro:steering-custom -- "architecture: hexagonal architecture, actor model"

# Custom steering: specify testing strategy
npm run kiro:steering-custom -- "testing: Vitest, E2E with Playwright, 80%+ coverage"

# Custom steering: specify database policies
npm run kiro:steering-custom -- "database: PostgreSQL, Prisma ORM, automated migrations"

# Custom steering: generate skeleton only (fill in manually later)
npm run kiro:steering-custom -- "testing"
```

Generated steering files are automatically referenced during design phases (`kiro:spec:design`, `kiro:validate:design`, etc.).

## OpenSpec Compatibility Workflow

Separate from the SDD workflow, an OpenSpec-based change management workflow is provided. This workflow manages structured changes through proposal → implementation → archival phases.

The `npm run opsx:*` entrypoints stay intact, but the workflow definitions now follow the official OpenSpec CLI contract (`openspec new change`, `openspec status`, `openspec instructions`, `openspec archive --yes`) instead of a repo-local helper script.

| Workflow | Description |
|-------|-------------|
| `opsx-propose` | Create a change and generate all artifacts (proposal, design, tasks) |
| `opsx-apply` | Implement tasks from a change |
| `opsx-archive` | Archive a completed change |
| `opsx-full` | Run propose → apply → archive in one automated sequence |
| `opsx-explore` | Interactive exploration and thinking (read-only, not included in full) |

### Full-Auto Execution

```bash
npm run opsx:full -- "description of change"
```

### Phase-by-Phase Execution

```bash
# Create a change and generate artifacts
npm run opsx:propose -- "change-name"

# Implement tasks
npm run opsx:apply -- "change-name"

# Archive completed change
npm run opsx:archive -- "change-name"

# Interactive exploration (independent, thinking-only mode)
npm run opsx:explore
```

### OpenSpec Configuration

The `openspec/config.yaml` file defines the schema and optional project context:

```yaml
schema: spec-driven

# Optional: project context shown to AI when creating artifacts
# context: |
#   Tech stack: TypeScript, React, Node.js

# Optional: per-artifact rules
# rules:
#   proposal:
#     - Keep proposals under 500 words
```

Changes are stored in `openspec/changes/<name>/` and archived to `openspec/changes/archive/`.

## Project Structure

```
.takt/
├── en/                      # English facets and workflows
│   ├── pieces/              # Workflow definitions (YAML)
│   ├── personas/            # Persona facets
│   ├── policies/            # Policy facets
│   ├── instructions/        # Instruction facets
│   ├── knowledge/           # Knowledge facets
│   └── output-contracts/    # Output contract facets
└── ja/                      # Japanese facets and workflows
    ├── pieces/              # ワークフロー定義（YAML）
    ├── personas/            # ペルソナファセット
    ├── policies/            # ポリシーファセット
    ├── instructions/        # インストラクションファセット
    ├── knowledge/           # ナレッジファセット
    └── output-contracts/    # 出力契約ファセット
references/
└── okite-ai/                # AI rules collection (submodule)
scripts/
└── takt.sh                  # takt execution wrapper
```

## Inspired By

This project is inspired by the following projects:

- [Kiro](https://github.com/kirodotdev/Kiro) - Amazon's SDD-based AI development environment
- [cc-sdd](https://github.com/gotalab/cc-sdd) - SDD tool supporting multiple AI coding agents
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - Lightweight spec-driven framework for AI coding assistants
