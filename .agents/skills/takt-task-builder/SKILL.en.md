---
name: takt-task-builder
description: >
  Skill for creating and editing TAKT tasks.yaml (task metadata) and task directories
  (.takt/tasks/{slug}/order.md). Generates YAML entries compliant with the TaskRecord schema,
  creates order.md task specifications, and validates status transition rules.
  Uses task schema definitions and documentation in references/takt as reference material.
  Triggers: "add a task", "edit tasks.yaml", "create a takt task",
  "write a task specification", "create order.md", "takt task", "define a task",
  "add pending task", "create task from GitHub Issue"
---

# TAKT Task Builder

Create and edit TAKT tasks.yaml entries and task directories (order.md).

> **Required takt version**: v0.35.4

## Reference Materials

Task-management materials are under `references/takt/`. Refer to the following as needed.

| Material | Path | Purpose |
|----------|------|---------|
| Task management docs | `references/takt/docs/task-management.ja.md` | Overall task workflow |
| TaskRecord schema | `references/takt/src/infra/task/taskRecordSchemas.ts` | Field definitions and validation |
| TaskExecutionConfig schema | `references/takt/src/infra/task/taskExecutionSchemas.ts` | Execution config field definitions |
| Task format spec | `references/takt/builtins/project/tasks/TASK-FORMAT` | Details of `task_dir` format |
| Schema details | This skill's `references/task-schema.md` | Field list and status transitions |
| Validation script | This skill's `validate-order-md.sh` | Structural validation for order.md |

**Important**: TaskRecord status-transition rules are strictly validated. Read `references/task-schema.md` and understand the invariants.

## Workflow

### Step 1: Requirement Clarification

Confirm the following (ask the user if anything is unclear):

1. **Task content**: What should this task execute?
2. **Workflow**: Workflow name to use (`default`, `dual`, custom, etc.)
3. **Isolated execution**: Whether `worktree` is needed (`true` / path / omitted)
4. **Branch**: Custom branch name (auto-generated if omitted)
5. **Auto PR creation**: Whether `auto_pr` / `draft_pr` are needed
6. **Issue linkage**: GitHub Issue number (when applicable)

### Step 2: Parallel Execution Strategy Design

When creating multiple tasks, design whether they can run in parallel and how they should be split. Skip this step for a single task.

#### a) TAKT Parallel Execution Model

With `takt run`, TAKT can execute multiple tasks in parallel using a worker pool. However, there is no inter-task dependency mechanism (`depends_on`, etc.).

| Property | Details |
|----------|---------|
| Execution model | Worker pool (`concurrency: 1-10`) |
| Dependencies | None (all pending tasks are immediate execution targets) |
| Isolation | `worktree: true` isolates tasks with git worktree |
| Synchronization | No live sync between tasks (work is based on clone-time snapshot) |
| Merge | Separate PR per task completion -> manual merge |

**Principle: Always set `worktree: true` for tasks executed in parallel.** Parallel execution without isolation can corrupt the working directory.

#### b) Identify Serial Segments (Amdahl's Law perspective)

Determine whether there are serial segments where one task must complete before another can proceed.

| Serial factor | Example | Countermeasure |
|---------------|---------|----------------|
| Schema change | DB migration | Merge into a leading task |
| Shared type definition | New shared interface / struct | Execute type-definition task first |
| Config-file change | CI/CD, build settings | Merge into a leading task |
| API specification design | OpenAPI schema | Finalize spec first |

**Interview question**: "Do any tasks depend on outputs from another task as their inputs?"

#### c) Shared Resource Conflict Analysis (USL: contention cost alpha)

If multiple tasks modify the same resource, merge conflicts occur.

| Shared resource | Conflict risk | Recommended action |
|-----------------|---------------|--------------------|
| Same source file | High | **Merge tasks** |
| Same config file | High | **Merge tasks** |
| Same test file | Medium | Consider merging |
| Different files in same package | Low | Parallel is possible (watch for import additions) |
| Completely different modules | None | Safe to parallelize |

**Principle: If two tasks might modify the same file, merge them.**

#### d) Consistency Cost Analysis (USL: consistency cost beta)

Cost to keep shared types/interfaces consistent across tasks. TAKT has no live sync between tasks, so each task works on a clone-time snapshot.

| Consistency factor | Beta impact | Countermeasure |
|--------------------|-------------|----------------|
| Add fields to shared type | High | Execute the type-definition side first |
| Change common interface | High | Execute interface change first |
| Add exports in same module | Medium | Watch index file conflicts |
| Type references across independent modules | Low | Parallel is possible |

#### e) Task Split/Merge Decision Table

| # | Scenario | File conflict | Serial dependency | Decision | Recommended concurrency |
|---|----------|---------------|-------------------|----------|-------------------------|
| 1 | Implement independent modules A, B, C | None | None | **Parallel** | `min(task_count, 5)` |
| 2 | Add multiple features in same module | Yes | None | **Merge** | `1` |
| 3 | API definition + implementation | Yes | Yes | **Merge** | `1` |
| 4 | FE + BE (API spec fixed) | None | None | **Parallel** | `2` |
| 5 | FE + BE (API spec not fixed) | None | Yes | **Phased execution** | `1` -> merge -> `1` |
| 6 | DB schema + app implementation | None | Yes | **Phased execution** | `1` -> merge -> parallel |
| 7 | Independent bug-fix set | None | None | **Parallel** | `min(task_count, 5)` |
| 8 | Multiple bug fixes in same file | Yes | None | **Merge** | `1` |
| 9 | Refactor + new feature | Yes | Yes | **Merge** | `1` |

#### f) Recommended `concurrency` Values

| Inter-task relationship | Recommended concurrency |
|-------------------------|-------------------------|
| Fully independent (no file overlap) | `min(task_count, 5)` |
| Partially shared (low risk) | `min(task_count, 3)` |
| Only type definition dependency | `1` (phased execution) |
| Same-file changes exist | `1` (consider merge) |
| Strong coupling (serial dependency + file sharing) | `1` |

**Note**: `concurrency` is a global `takt run` setting, not per-task. If phased execution is required, run `takt run` multiple times.

#### g) Parallel Pattern Collection

**Pattern A: Full parallel (independent modules)**

```yaml
tasks:
  - name: impl-module-a
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-aaaaaa
    worktree: true
    branch: feat/module-a
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-module-b
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-bbbbbb
    worktree: true
    branch: feat/module-b
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-module-c
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-cccccc
    worktree: true
    branch: feat/module-c
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
```

Run in parallel with `takt run --concurrency 3`.

**Pattern B: Dependency merge (schema + implementation in one task)**

Merge dependent tasks into one. The tasks.yaml entry is the same as the minimal configuration in Step 4. Describe both schema changes and implementation in `order.md`, then execute as one task.

**Pattern C: Phased execution (leading task -> merge -> following parallel tasks)**

Phase 1: Shared foundation

```yaml
tasks:
  - name: define-shared-types
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-100000-eeeeee
    worktree: true
    branch: feat/shared-types
    auto_pr: true
    created_at: "2026-03-01T10:00:00.000Z"
    started_at: null
    completed_at: null
```

Run with `takt run`, then after PR merge add phase-2 tasks:

```yaml
tasks:
  - name: impl-consumer-x
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-110000-ffffff
    worktree: true
    branch: feat/consumer-x
    auto_pr: true
    created_at: "2026-03-01T11:00:00.000Z"
    started_at: null
    completed_at: null
  - name: impl-consumer-y
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260301-110000-gggggg
    worktree: true
    branch: feat/consumer-y
    auto_pr: true
    created_at: "2026-03-01T11:00:00.000Z"
    started_at: null
    completed_at: null
```

Run in parallel with `takt run --concurrency 2`.

### Step 3: Create Task Directory

Recommended format: `task_dir` (order.md separated format)

#### Generate slug

Use the format `{YYYYMMDD}-{HHmmss}-{random6}`.

```
Example: 20260223-143000-ab12cd
```

#### Directory structure

```
.takt/tasks/{slug}/
├── order.md          # Task specification (required)
├── schema.sql        # Reference material (optional)
└── wireframe.png     # Reference material (optional)
```

#### `order.md` template

```markdown
# Task Specification

## Goal

{Describe the task goal in 1-2 sentences}

## Requirements

- [ ] {Requirement 1}
- [ ] {Requirement 2}
- [ ] {Requirement 3}

## Acceptance Criteria

- {Criterion 1}
- {Criterion 2}

## Reference Information

{Describe when applicable: API specs, design docs, etc.}
```

**Note**: Template variables (`{task}`, etc.) are unnecessary in `order.md`. The engine injects them automatically.

### Step 4: Generate `tasks.yaml` Entry

Add a new task record to `.takt/tasks.yaml`. If the file does not exist, initialize it as follows:

```yaml
tasks: []
```

#### Minimal configuration (`task_dir` format)

```yaml
tasks:
  - name: add-auth-feature
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260223-143000-ab12cd
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### Full configuration

```yaml
tasks:
  - name: add-auth-feature
    status: pending
    workflow: default
    task_dir: .takt/tasks/20260223-143000-ab12cd
    slug: 20260223-143000-ab12cd
    worktree: true
    branch: feat/auth-feature
    auto_pr: true
    draft_pr: false
    issue: 28
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### `content` format (legacy, deprecated)

```yaml
tasks:
  - name: fix-login-bug
    status: pending
    workflow: default
    content: >-
      Fix the authentication error on the login screen.
      Root cause: invalid session-token expiration check.
    created_at: "2026-02-23T14:30:00.000Z"
    started_at: null
    completed_at: null
```

#### Exclusive constraint for content source

Exactly one of `content`, `content_file`, or `task_dir` is required. Multiple values cause a validation error.

| Format | Field | Recommendation |
|--------|-------|----------------|
| Task directory | `task_dir` | Recommended |
| Inline | `content` | Legacy |
| External file | `content_file` | Legacy |

### Step 5: Validation

Verify consistency of the created tasks (see `references/task-schema.md` for details):

- [ ] `task_dir` uses `.takt/tasks/<slug>` format
- [ ] `order.md` exists when `task_dir` is specified
- [ ] With `status: pending`, `started_at: null` and `completed_at: null`
- [ ] `created_at` is ISO8601 format
- [ ] Exactly one of `content`, `content_file`, `task_dir` is specified
- [ ] `workflow` matches an existing workflow (builtin or custom)
- [ ] Overall `tasks.yaml` structure is not broken

#### Parallel consistency checks (for multiple tasks)

- [ ] Tasks that modify the same file are not split (they should be merged)
- [ ] Shared type-definition tasks are scheduled before consumer tasks (phased execution)
- [ ] All parallel tasks have `worktree: true`
- [ ] Recommended `concurrency` value was communicated to the user

#### `order.md` structural validation

Run the `scripts/validate-order-md.sh` bundled with this skill for mechanical validation of `order.md` structure.
Execute using the path appropriate for the skill's deployment location (`.agents/skills/`, `.claude/skills/`, `.codex/skills/`, etc.):

```bash
bash <this skill's directory>/scripts/validate-order-md.sh
```

Validation items:
- slug format (`YYYYMMDD-HHmmss-xxxxxx`)
- Existence and content of `## Goal` section
- `- [ ]` checkbox items in `## Requirements` section (at least one)
- Items in `## Acceptance Criteria` section (at least one)
- Cross-check: `task_dir` in `tasks.yaml` -> existence of `order.md`

#### Additional gate for workflow changes (required)

If this task edits `.takt/workflows/*.yaml`, run the `takt-workflow-builder` skill's validation script before completion judgment.
Execute using the path appropriate for the skill's deployment location:

```bash
bash <takt-workflow-builder skill directory>/scripts/validate-takt-files.sh --workflows
```

Also confirm the following two points:
- In healthy loop monitor state, `next` matches the head node of `cycle`
- `{report:...}` references in loop monitor are limited to step outputs generated inside the cycle

If either condition cannot be met, do not mark the task as `completed`.

### Status Transition Checks (when editing existing tasks)

| Transition | Valid |
|------------|-------|
| pending -> running | YES |
| running -> completed | YES |
| running -> failed | YES |
| running -> exceeded | YES (when `max_steps` is exceeded) |
| running -> pr_failed | YES (when PR creation fails) |
| pending -> completed | NO (must pass through `running`) |
| completed -> pending | NO (recreate as a new task) |
| exceeded -> pending | NO (recreate as a new task) |
| pr_failed -> pending | NO (recreate as a new task) |
