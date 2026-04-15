---
name: takt-workflow-builder
description: >
  Skill for creating and customizing TAKT workflows (workflow YAML). Includes
  generation of facet files based on Faceted Prompting
  (Persona/Policy/Instruction/Knowledge/Output Contract). Leverages TAKT
  source code, documentation, and builtin workflows in references/takt as
  reference materials. Gathers user requirements and performs step
  composition, rule design, and facet file generation all at once.
  Triggers: "create a workflow", "define a workflow", "create a takt workflow",
  "make a new takt workflow", "takt workflow", "workflow YAML"
---

# TAKT Workflow Builder

Creates TAKT workflows (workflow YAML) and their associated facet files.

> **Target takt version**: v0.35.4

## Reference Materials

The TAKT codebase and documentation are located in `references/takt/`. Refer to the following as needed.

| Resource | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Workflow YAML structure definition |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Details on prompt construction and rule evaluation |
| Faceted Prompting | `references/takt/docs/faceted-prompting.en.md` | Theory of 5-facet design |
| Builtin Workflows | `references/takt/builtins/en/workflows/` | Examples (default.yaml, dual.yaml, etc.) |
| Style Guide | `references/takt/builtins/en/STYLE_GUIDE.md` | Facet writing conventions |
| Persona Guide | `references/takt/builtins/en/PERSONA_STYLE_GUIDE.md` | Persona writing conventions |
| Builtin Facets | `references/takt/builtins/en/facets/{personas,policies,instructions,knowledge,output-contracts}/` | Existing facet examples |

**Important**: Before creating a workflow, read `references/takt/builtins/en/workflows/default.yaml` to understand the project's patterns.

## Workflow

### Step 1: Requirements Gathering

Confirm the following (ask the user about any unclear points):

1. **Objective**: What this workflow should achieve
2. **Step composition**: What steps are needed (plan->implement->review->supervise, etc.)
3. **Review structure**: Whether parallel reviews are needed, types of reviewers
4. **Loop control**: Whether fix loops are needed and their thresholds
5. **Output location**: Where to place workflows and facets (default: `~/.takt/workflows/`)

### Step 2: Builtin Reference

Search for similar patterns in builtin workflows (`references/takt/builtins/en/workflows/`).

| Builtin | Composition | Purpose |
|---------|-------------|---------|
| `default.yaml` | plan->write_tests->implement->ai_review->reviewers(arch+qa)->fix->supervise | Standard development |
| `dual.yaml` | plan->write_tests->team_leader_implement->ai_review->reviewers(2-stage)->fix->supervise | Frontend + Backend |
| `backend.yaml` | plan->write_tests->implement->ai_review->reviewers->fix->supervise | Backend-specific |
| `backend-cqrs.yaml` / `backend-cqrs-mini.yaml` | CQRS+ES backend development | CQRS/ES-specific |
| `frontend.yaml` | plan->write_tests->implement->ai_review->reviewers->fix->supervise | Frontend-specific |
| `backend-mini.yaml` / `dual-mini.yaml` / `dual-cqrs-mini.yaml` / `frontend-mini.yaml` | plan->implement->supervise | Minimal configuration |
| `review-default.yaml` / `review-backend.yaml` / `review-dual.yaml` / `review-frontend.yaml` | Review workflow | Code review |
| `review-fix-default.yaml` / `review-fix-backend.yaml` / `review-fix-dual.yaml` / `review-fix-frontend.yaml` | Review->fix loop | Review + fix |
| `takt-default.yaml` / `review-takt-default.yaml` / `review-fix-takt-default.yaml` | TAKT development | TAKT development |
| `audit-architecture.yaml` / `audit-architecture-backend.yaml` / `audit-architecture-dual.yaml` / `audit-architecture-frontend.yaml` | Architecture audit | Quality audit |
| `audit-e2e.yaml` / `audit-security.yaml` / `audit-unit.yaml` | E2E/Security/Unit test audit | Quality audit |
| `terraform.yaml` | Infrastructure | Terraform |
| `research.yaml` / `deep-research.yaml` | Research | Research |
| `magi.yaml` / `compound-eye.yaml` | Special composition | Multi-perspective analysis |

**Reuse decision**: Do not create custom facets if builtin facets are sufficient.

### Step 3: Workflow YAML Creation

Create the YAML with the following structure.

```yaml
name: workflow-name
description: Workflow description
max_steps: 30
initial_step: plan

# Workflow-wide configuration
workflow_config:
  provider_options:
    codex:
      network_access: true

# Section map (only when custom facets exist)
personas:
  custom-role: ../personas/custom-role.md
policies:
  custom-policy: ../policies/custom-policy.md
instructions:
  custom-step: ../instructions/custom-step.md
knowledge:
  domain: ../knowledge/domain.md
report_formats:
  custom-report: ../output-contracts/custom-report.md

steps:
  - name: plan
    edit: false
    persona: planner          # Builtin reference (bare name)
    knowledge: architecture
    provider_options:
      claude:
        allowed_tools:
          - Read
          - Glob
          - Grep
          - Bash
          - WebSearch
          - WebFetch
    instruction: plan
    output_contracts:
      report:
        - name: 00-plan.md
          format: plan
    rules:
      - condition: Requirements are clear and implementable
        next: implement
      - condition: Requirements are unclear or insufficient information
        next: ABORT

  - name: implement
    edit: true
    persona: coder
    policy: [coding, testing]
    session: refresh
    instruction: implement
    rules:
      - condition: Implementation complete
        next: review
```

**Compatibility aliases**: `movements` is synonymous with `steps`, `initial_movement` is synonymous with `initial_step`, `max_movements` is synonymous with `max_steps`. Use the canonical names for new workflows.

#### Parallel Step Example

```yaml
  - name: reviewers
    parallel:
      - name: arch-review
        edit: false
        persona: architecture-reviewer
        policy: review
        instruction: review-arch
        output_contracts:
          report:
            - name: 05-architect-review.md
              format: architecture-review
        rules:
          - condition: approved
          - condition: needs_fix
      - name: qa-review
        edit: false
        persona: qa-reviewer
        policy: [review, qa]
        instruction: review-qa
        rules:
          - condition: approved
          - condition: needs_fix
    rules:
      - condition: all("approved")
        next: supervise
      - condition: any("needs_fix")
        next: fix
```

**Note**: Sub-step `rules` are for result classification only. `next` is ignored; the parent's `rules` determine the transition target.

#### Design Decision Guide

| Decision Point | Criteria |
|----------------|----------|
| `edit: true/false` | Only true for steps that modify code |
| `session: refresh` | Start a new session for implementation steps |
| `pass_previous_response: false` | When you don't want review results passed directly |
| `required_permission_mode` | Specify `edit` when edit permissions are needed |
| `provider_options.claude.allowed_tools` | Restrict Claude's available tools per step |

#### Rule Design

| Rule Type | Syntax | Usage |
|-----------|--------|-------|
| Text condition | `"condition text"` | Phase 3 tag evaluation (recommended) |
| AI evaluation | `ai("condition")` | When tag evaluation is unsuitable |
| All match | `all("condition")` | Parent of parallel only |
| Any match | `any("condition")` | Parent of parallel only |

Special transition targets: `COMPLETE` (successful completion), `ABORT` (failure termination)

### Step 4: Facet File Creation

When custom facets are needed, create them following these conventions.

#### Directory Structure

```
~/.takt/
├── workflows/
│   └── my-workflow.yaml
├── personas/
│   └── custom-role.md
├── policies/
│   └── custom-policy.md
├── instructions/
│   └── custom-step.md
├── knowledge/
│   └── domain.md
└── output-contracts/
    └── custom-report.md
```

#### Facet Creation Conventions

**Persona**: Placed in system prompt. Identity + expertise + boundaries.

```markdown
# {Role Name}

{1-2 sentence role definition}

## Role Boundaries

**Responsibilities:**
- ...

**Not responsible for:**
- ... (specify the responsible agent name)

## Behavioral Stance

- ...
```

**Policy**: Behavioral guidelines shared across multiple steps.

```markdown
# {Policy Name}

## Principles

| Principle | Criteria |
|-----------|----------|
| ... | REJECT / APPROVE judgment |

## Prohibited Actions

- ...
```

**Instruction**: Step-specific procedures. Written in imperative form. `{task}` and `{previous_response}` are auto-injected, so they are not needed.

**Knowledge**: Reference information that serves as the basis for judgment. Descriptive ("this is how it works").

**Output Contract**: Report structure definition.

````markdown
```markdown
# {Report Title}

## Result: APPROVE / REJECT

## Summary
{1-2 sentence summary}

## Details
| Aspect | Result | Notes |
|--------|--------|-------|
```
````

For detailed style conventions, refer to `references/takt/builtins/en/STYLE_GUIDE.md`.

### Step 5: Loop Monitor (Optional)

Configure when fix loops are expected.

```yaml
loop_monitors:
  - cycle: [ai_review, ai_fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction: loop-monitor-ai-fix               # Builtin facet reference
      rules:
        - condition: Healthy (progress is being made)
          next: ai_review
        - condition: Unproductive (no improvement)
          next: reviewers
  - cycle: [reviewers, fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction: loop-monitor-reviewers-fix        # Builtin facet reference
      rules:
        - condition: Healthy (issue count decreasing, fixes reflected)
          next: reviewers
        - condition: Unproductive (same issues repeating)
          next: supervise
```

### Step 6: Verification

Verify the consistency of the created files:

- [ ] Section map keys match the references within steps
- [ ] Section map paths match actual file locations (relative paths from the workflow YAML)
- [ ] Builtin references (bare names) and custom references (section map keys) are not mixed improperly
- [ ] `initial_step` exists within the `steps` array
- [ ] All step `rules.next` values are valid transition targets (other step names or COMPLETE/ABORT)
- [ ] Parent rules of parallel steps use `all()` / `any()`
- [ ] Parallel sub-step rules do not have `next` (parent controls transitions)

## Validation

Created/edited files can be mechanically verified with `validate-takt-files.sh`:

```bash
bash .agents/skills/takt-workflow-builder/scripts/validate-takt-files.sh
```

Verification items:
- **Workflow YAML**: Required fields (`name`/`initial_step`/`steps`), `initial_step` step reference, facet file reference existence
- **Facet .md**: Empty check, persona/policy/knowledge require `# heading`, instruction/output-contract require content

Options `--pieces` / `--facets` can be used to narrow the scope.
