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

Automates the entire development flow — from requirements definition through design, task decomposition, implementation, review, and validation — using takt pieces (YAML workflows) and facets.

takt-sdd is compatible with Kiro (`.kiro/specs/`) and can be used alongside it.

## Features

takt-sdd uses [takt](https://github.com/nrslib/takt)'s state-machine-based workflow control to deterministically manage AI agent execution paths.

- **Declarative Workflow Control** — Define AI agent execution order and transition conditions declaratively in pieces (YAML). While AI output itself is non-deterministic, "which step, in what order, under what conditions" is deterministically controlled by YAML rules. Workflows progress as state machines, not free-form chat.
- **Faceted Prompting** — Separate prompts into 5 independent concerns (Persona / Policy / Instruction / Knowledge / Output Contract). Each facet is reusable and swappable, shareable across pieces. Eliminates duplication of monolithic prompts and improves maintainability.
- **Multi-stage Validation** — Place validation gates at each phase: requirements, design, and implementation. Gap analysis, design review (GO/NO-GO decisions), and parallel architecture/QA/implementation reviews detect quality issues early and minimize rework.
- **Loop Detection and Supervisory Control** — Automatically detect repetitive patterns like plan→implement and review→fix. When thresholds are exceeded, a supervisor intervenes to assess progress and automatically escalates unproductive loops.
- **Adaptive Batch Implementation** — Analyze inter-task dependencies and automatically choose between sequential and parallel execution. Independent tasks are processed in parallel by multiple workers.
- **Provider Agnostic** — The same piece definitions work across different providers such as Claude and Codex.

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

- **`.takt/`** — Pieces (YAML workflows) and facets in the selected language (`--lang`)
- **`.agent/skills/`** — TAKT skills (takt-analyze, takt-facet, takt-optimize, takt-piece)
- **`.claude/skills/`, `.codex/skills/`** — Symlinks to `.agent/skills/` for Claude Code and Codex CLI
- **`references/takt/`** — takt builtins and docs (pinned to the submodule commit tracked by the installer release)
- **`package.json`** — npm scripts for each phase + takt as devDependency

Options:

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing `.takt/` directory |
| `--without-skills` | Skip installing skills and takt references |
| `--refs-path <path>` | Path for takt references (default: `references/takt`) |
| `--tag <version>` | Install a specific version (`latest`, `0.2.0`, etc.) |
| `--lang <en\|ja>` | Facet and message language (default: `en`) |
| `--dry-run` | Preview files without writing |

When `package.json` already exists, only npm scripts are merged (existing scripts are not overwritten).

## Overview

SDD executes the following phases in order:

| Phase | Piece | Description |
|-------|-------|-------------|
| 1 | `cc-sdd-requirements` | Requirements document generation in EARS format |
| 1.5 | `cc-sdd-validate-gap` | Gap analysis between requirements and existing codebase |
| 2 | `cc-sdd-design` | Technical design and discovery log generation based on requirements |
| 2.5 | `cc-sdd-validate-design` | Design quality review with GO/NO-GO decision, including auto-fix on NO-GO |
| 3 | `cc-sdd-tasks` | Implementation task list generation |
| 4 | `cc-sdd-impl` | Adaptive batch implementation (sequential/parallel worker support) |
| 5 | `cc-sdd-validate-impl` | Parallel architecture, QA, and implementation review, including auto-fix on NO-GO |

Use the full-auto piece `cc-sdd-full` to run Phases 1–5 in a single automated sequence.

## Usage

### Full-Auto Execution

Run requirements → gap analysis → design → design validation → implementation → implementation validation all at once.

```bash
npm run cc-sdd:full -- "description of requirements..."
```

### Phase-by-Phase Execution

Run each phase workflow individually, allowing human intervention between phases.

```bash
# Phase 1: Requirements generation
npm run cc-sdd:requirements -- "description of requirements..."
# Check the {feature} name in .kiro/specs/{feature}

# Phase 1.5: Gap analysis (only when existing code exists)
npm run cc-sdd:validate-gap -- "feature={feature}"

# Phase 2: Design generation
npm run cc-sdd:design -- "feature={feature}"

# Phase 2.5: Design validation (auto-fix → re-validate on NO-GO)
npm run cc-sdd:validate-design -- "feature={feature}"

# Phase 3: Task generation
npm run cc-sdd:tasks -- "feature={feature}"

# Phase 4: Implementation
npm run cc-sdd:impl -- "feature={feature}"

# Phase 5: Implementation validation (auto-fix → re-validate on failure)
npm run cc-sdd:validate-impl -- "feature={feature}"
```

<details>
<summary>Using takt commands directly</summary>

```bash
takt --pipeline --skip-git --create-worktree no -w sdd -t "description of requirements..."
takt --pipeline --skip-git --create-worktree no -w cc-sdd-requirements -t "description of requirements..."
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-gap -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-design -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-design -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-tasks -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-impl -t "feature={feature}"
takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-impl -t "feature={feature}"
```

For interactive mode, run `takt -w {piece-name}`.

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

Separate from the SDD workflow, pieces are provided to manage `.kiro/steering/` as project memory.

| Piece | Description |
|-------|-------------|
| `steering` | Generation and sync of core steering files (product.md / tech.md / structure.md) |
| `steering-custom` | Creation of domain-specific custom steering files |

### steering

Analyzes the codebase and records the project's purpose, tech stack, and structural patterns in `.kiro/steering/`. Runs in bootstrap mode on first execution, and in sync mode afterwards to detect drift from the code.

For greenfield projects (no existing code), skeleton files with placeholders are generated so developers can fill in their decisions.

```bash
npm run steering -- "sync steering"

# Greenfield: specify product direction and tech choices upfront
npm run steering -- "REST API server with TypeScript, Express, PostgreSQL"
```

### steering-custom

Creates steering files for specific domains such as architecture policies, API standards, and testing strategies. Templates are available in `.takt/knowledge/steering-custom-template-files/`.

```bash
npm run steering:custom -- "architecture"
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

Both `steering` and `steering-custom` support greenfield projects. Skeleton files can be generated even when the codebase is empty. Steering files are generated based on the template structure with placeholders (`[choice]`, `[rationale]`, etc.) for developers to fill in.

To specify policies upfront, add them to the command:

```bash
# Generate core steering skeletons (product.md / tech.md / structure.md)
npm run steering -- "generate steering"

# Specify product direction and tech choices upfront
npm run steering -- "REST API server with TypeScript, Express, PostgreSQL"

# Custom steering: specify architecture policies
npm run steering:custom -- "architecture: hexagonal architecture, actor model"

# Custom steering: specify testing strategy
npm run steering:custom -- "testing: Vitest, E2E with Playwright, 80%+ coverage"

# Custom steering: specify database policies
npm run steering:custom -- "database: PostgreSQL, Prisma ORM, automated migrations"

# Custom steering: generate skeleton only (fill in manually later)
npm run steering:custom -- "testing"
```

Generated steering files are automatically referenced during design phases (`sdd:design`, `sdd:validate-design`, etc.).

## Project Structure

```
.takt/
├── en/                      # English facets and pieces
│   ├── pieces/              # Piece definitions (workflow YAML)
│   ├── personas/            # Persona facets
│   ├── policies/            # Policy facets
│   ├── instructions/        # Instruction facets
│   ├── knowledge/           # Knowledge facets
│   └── output-contracts/    # Output contract facets
└── ja/                      # Japanese facets and pieces
    ├── pieces/              # ピース定義（ワークフロー YAML）
    ├── personas/            # ペルソナファセット
    ├── policies/            # ポリシーファセット
    ├── instructions/        # インストラクションファセット
    ├── knowledge/           # ナレッジファセット
    └── output-contracts/    # 出力契約ファセット
.agent/skills/               # TAKT skills (canonical location)
├── takt-analyze/            # Piece/facet analysis and improvement suggestions
├── takt-facet/              # Individual facet creation/editing
├── takt-optimize/           # Workflow optimization
└── takt-piece/              # Piece (workflow YAML) creation
.claude/skills/              # Symlinks → .agent/skills/ (for Claude Code)
.codex/skills/               # Symlinks → .agent/skills/ (for Codex CLI)
references/
├── takt/                    # takt builtins and docs (submodule / installer)
└── okite-ai/                # AI rules collection (submodule)
scripts/
└── takt.sh                  # takt execution wrapper
```

## Inspired By

This project is inspired by the following projects:

- [Kiro](https://github.com/kirodotdev/Kiro) - Amazon's SDD-based AI development environment
- [cc-sdd](https://github.com/gotalab/cc-sdd) - SDD tool supporting multiple AI coding agents
