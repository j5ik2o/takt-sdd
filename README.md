# takt-sdd

[![npm version](https://img.shields.io/npm/v/create-takt-sdd)](https://www.npmjs.com/package/create-takt-sdd)
[![CI](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/ci.yml)
[![Release](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/j5ik2o/takt-sdd/actions/workflows/release.yml)
[![Publish takt-sdd](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-takt-sdd.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-takt-sdd.yml)
[![Publish create-takt-sdd](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-create-takt-sdd.yml/badge.svg)](https://github.com/j5ik2o/takt-sdd/actions/workflows/publish-create-takt-sdd.yml)
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

## Global CLI

`takt-sdd` is available as a global npm package, letting you run any supported `kiro-*` workflow from any project without relying on repo-local npm scripts.

### Installation

```bash
npm install -g takt-sdd
```

### Initialize a project

```bash
takt-sdd init .
```

`init` copies the bundled `.takt` assets (workflows and facets matching the installed package version) into the target directory and merges the required devDependencies into `package.json`.  
`init` does **not** run `npm install` automatically. After `init` completes, run:

```bash
npm install
```

### Supported commands

| Command | Description |
|---------|-------------|
| `kiro-discovery` | Route a feature idea, update brief/roadmap when needed |
| `kiro-spec-init` | Initialize a new spec with a project description |
| `kiro-spec-requirements` | Generate requirements in EARS format |
| `kiro-spec-design` | Generate technical design and discovery notes |
| `kiro-spec-tasks` | Generate implementation tasks |
| `kiro-spec-quick` | Generate requirements, design, and tasks in one pass |
| `kiro-spec-batch` | Generate multiple specs from roadmap dependency order |
| `kiro-spec-status` | Report spec phase, approvals, and readiness |
| `kiro-impl` | Implement approved tasks with review/debug/verify gates |
| `kiro-validate-gap` | Compare requirements with the current codebase |
| `kiro-validate-design` | Review design quality and return a GO/NO-GO decision |
| `kiro-validate-impl` | Validate implementation evidence and remaining manual checks |

You can also use the `run` form:

```bash
takt-sdd run kiro-spec-design "feature=my-feature"
```

The `run` form is equivalent to the direct command form and accepts the same supported workflows only.

### Global options

| Option | Description |
|--------|-------------|
| `--cwd <dir>` | Set the target project root directory (default: current working directory) |

### `init` options

| Option | Description |
|--------|-------------|
| `--lang en\|ja` | Language for installed assets and initial language preference (default: `en`). Reads existing `.takt/config.yaml` language if present and `--lang` is not specified. |
| `--force` | Overwrite customized files (same semantics as `create-takt-sdd --force`) |
| `--dry-run` | Preview changes without writing any files |

`--tag` is **not** supported by the global CLI. The bundled assets matching the installed package version are always used.

### Retired workflows

**`cc-sdd-*` workflows (retired in v2.0.0):** The global CLI rejects `cc-sdd-*` commands with an explicit error:

```bash
takt-sdd cc-sdd-full        # Error: `cc-sdd-*` workflows were retired in v2.0.0 and are no longer available.
takt-sdd run cc-sdd-full    # Error: same rejection
```

**`opsx-*` workflows (retired, future re-provision planned):** The global CLI rejects `opsx-*` commands:

```bash
takt-sdd opsx-propose       # Error: `opsx-*` workflows have been retired and will be re-provided in a future release.
takt-sdd run opsx-full      # Error: same rejection
```

### `.takt/config.yaml` ownership

`.takt/config.yaml` is a **user-owned** file. It may be placed globally at `~/.takt/config.yaml` or per-project, and is created and maintained by the user, not by the CLI. The CLI only **reads** it (to determine language preference during `init` and workflow resolution). The CLI never creates or modifies this file. Language preference from `init` is recorded in `.takt/.manifest.json`.

## Installation (create-takt-sdd)

To add the SDD workflow to your project using the installer, run the following in your project root:

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
- **`package.json`** — npm scripts for each phase + `takt` as a devDependency

Options:

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing `.takt/` directory |
| `--tag <version>` | Install a specific version (`latest`, `0.2.0`, etc.) |
| `--lang <en\|ja>` | Facet and message language (default: `en`) |
| `--dry-run` | Preview files without writing |

When `package.json` already exists, only npm scripts are merged (existing scripts are not overwritten).

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

Use `kiro:*` scripts for SDD workflow execution. The `cc-sdd:*` npm scripts compatibility surface ended in v2.0.0.

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

### Smoke Tests

Mock-provider smoke tests run in CI. To run the full Kiro lifecycle against the real Claude provider, opt in explicitly:

```bash
KIRO_REAL_PROVIDER_SMOKE=1 npm run test:kiro-real-provider-smoke
```

The default timeout is 15 minutes per workflow, with 30 minutes for `kiro:impl`.
Use `KIRO_REAL_PROVIDER_TIMEOUT_MS` or `KIRO_REAL_PROVIDER_IMPL_TIMEOUT_MS` to tune slow real-provider runs.

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

## Updating an Existing Project (v1.x → v2.0.0)

When you run `takt-sdd init .` on a project that was installed with v1.x, the installer automatically removes retired workflow assets (cc-sdd-* and opsx-* workflow files) that have not been customized, and removes them from the manifest. Assets that you have modified are left in place with a warning.

In `--dry-run` mode, the list of files that would be removed is displayed without making any changes.

Note: `openspec/` directories and any files you have added yourself are never touched by the update.

### Removing leftover `cc-sdd:*` and `opsx:*` scripts

`init` does not modify your `package.json` scripts beyond adding missing `kiro:*` entries. If your project still contains `cc-sdd:*` or `opsx:*` scripts from a v1.x installation, remove them manually. They reference workflow files that no longer exist, so running them will result in a takt resolution error.

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
