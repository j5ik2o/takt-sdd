---
name: takt-piece
description: >
  Skill for creating and customizing TAKT pieces (workflow YAML). Includes
  generation of facet files based on Faceted Prompting
  (Persona/Policy/Instruction/Knowledge/Output Contract). Leverages TAKT
  source code, documentation, and builtin pieces in references/takt as
  reference materials. Gathers user requirements and performs movement
  composition, rule design, and facet file generation all at once.
  Triggers: "create a piece", "define a workflow", "create a takt piece",
  "make a new takt piece", "takt piece", "workflow YAML"
---

# TAKT Piece Creator

Creates TAKT pieces (workflow YAML) and their associated facet files.

## Reference Materials

The TAKT codebase and documentation are located in `references/takt/`. Refer to the following as needed.

| Resource | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Piece YAML structure definition |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Details on prompt construction and rule evaluation |
| Faceted Prompting | `references/takt/docs/faceted-prompting.en.md` | Theory of 5-facet design |
| Builtin Pieces | `references/takt/builtins/en/pieces/` | Examples (default.yaml, expert.yaml, etc.) |
| Style Guide | `references/takt/builtins/en/STYLE_GUIDE.md` | Facet writing conventions |
| Persona Guide | `references/takt/builtins/en/PERSONA_STYLE_GUIDE.md` | Persona writing conventions |
| Builtin Facets | `references/takt/builtins/en/{personas,policies,instructions,knowledge,output-contracts}/` | Existing facet examples |

**Important**: Before creating a piece, read `references/takt/builtins/en/pieces/default.yaml` to understand the project's patterns.

## Workflow

### Step 1: Requirements Gathering

Confirm the following (ask the user about any unclear points):

1. **Objective**: What this piece should achieve
2. **Movement composition**: What steps are needed (plan->implement->review->supervise, etc.)
3. **Review structure**: Whether parallel reviews are needed, types of reviewers
4. **Loop control**: Whether fix loops are needed and their thresholds
5. **Output location**: Where to place pieces and facets (default: `~/.takt/pieces/`)

### Step 2: Builtin Reference

Search for similar patterns in builtin pieces (`references/takt/builtins/en/pieces/`).

| Builtin | Composition | Purpose |
|---------|-------------|---------|
| `default.yaml` | plan->implement->ai_review->reviewers(arch+qa)->supervise | Standard development |
| `expert.yaml` | plan->implement->ai_review->reviewers(arch+frontend+security+qa)->supervise | Full stack |
| `default-mini.yaml` | plan->implement->supervise | Minimal configuration |
| `review-only.yaml` | Review only | Code review only |

**Reuse decision**: Do not create custom facets if builtin facets are sufficient.

### Step 3: Piece YAML Creation

Create the YAML with the following structure.

```yaml
name: piece-name
description: Piece description
max_movements: 30
initial_movement: plan

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

movements:
  - name: plan
    edit: false
    persona: planner          # Builtin reference (bare name)
    knowledge: architecture
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

#### Parallel Movement Example

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
| `edit: true/false` | Only true for movements that modify code |
| `session: refresh` | Start a new session for implementation movements |
| `pass_previous_response: false` | When you don't want review results passed directly |
| `required_permission_mode` | Specify `edit` when edit permissions are needed |

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
├── pieces/
│   └── my-piece.yaml
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

**Policy**: Behavioral guidelines shared across multiple movements.

```markdown
# {Policy Name}

## Principles

| Principle | Criteria |
|-----------|----------|
| ... | REJECT / APPROVE judgment |

## Prohibited Actions

- ...
```

**Instruction**: Movement-specific procedures. Written in imperative form. `{task}` and `{previous_response}` are auto-injected, so they are not needed.

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
  - cycle: [review, fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction_template: |
        {cycle_count} loops have occurred. Determine whether progress is being made.
        Report: {report:review-report.md}
      rules:
        - condition: Healthy (progress is being made)
          next: review
        - condition: Unproductive (no improvement)
          next: supervise
```

### Step 6: Verification

Verify the consistency of the created files:

- [ ] Section map keys match the references within movements
- [ ] Section map paths match actual file locations (relative paths from the piece YAML)
- [ ] Builtin references (bare names) and custom references (section map keys) are not mixed improperly
- [ ] `initial_movement` exists within the `movements` array
- [ ] All movement `rules.next` values are valid transition targets (other movement names or COMPLETE/ABORT)
- [ ] Parent rules of parallel movements use `all()` / `any()`
- [ ] Parallel sub-step rules do not have `next` (parent controls transitions)
