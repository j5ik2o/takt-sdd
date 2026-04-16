---
name: takt-optimizer
description: >
  A skill for optimizing existing TAKT workflows (workflow YAMLs and facets).
  Performs token consumption reduction, step consolidation, rule simplification,
  facet reuse promotion, loop control improvement, and parallelization proposals,
  then directly generates the optimized files.
  Can utilize takt-analyze diagnostic results (static analysis and log diagnostics) as input.
  This skill handles only "executing optimizations"; diagnostics and analysis are delegated to takt-analyze.
  Uses references/takt engine specifications and style guides as the baseline.
  Triggers: "optimize workflows", "speed up takt", "make the workflow lighter",
  "reduce tokens", "reduce steps", "takt optimize",
  "streamline the workflow", "clean up facets", "slim down the workflow",
  "reduce takt costs", "simplify the workflow"
---

# TAKT Optimizer

Executes optimizations on existing TAKT workflows. Diagnostics and analysis are handled by takt-analyze.

> **Required takt version**: v0.35.4

## Reference Materials

| Material | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Workflow structure validation baseline |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Understanding prompt construction and token consumption |
| Style Guides | `references/takt/builtins/en/*_STYLE_GUIDE.md` | Facet size limits |
| Built-in Workflows | `references/takt/builtins/en/workflows/` | Optimization pattern reference |
| Built-in Facets | `references/takt/builtins/en/facets/{personas,policies,instructions,knowledge,output-contracts}/` | Built-in replacement candidates |

## Difference from takt-analyze

| Aspect | takt-analyze | takt-optimize |
|--------|-------------|---------------|
| Purpose | Problem detection, diagnostics and reporting | Executing optimizations |
| Output | Analysis report (Markdown) | Optimized file set |
| Modifications | None (read-only) | Directly edits/generates files |
| Input | Workflow YAML + facets + execution logs | Workflow YAML + facets + **takt-analyze diagnostic results** |
| Judgment | Severity classification of issues | Cost/quality tradeoff decisions |
| Log analysis | Performs analysis and generates diagnostic reports | Utilizes takt-analyze diagnostic results |

> **Recommended flow**: `takt-analyze` (diagnostics) -> Use those results for `takt-optimize` (execute optimizations)

## Optimization Categories

### 1. Token Consumption Reduction

Reduce the amount of tokens during prompt construction.

**Engine's prompt construction order (ref: engine.md):**
```
Persona -> Policy -> Context -> Knowledge -> Instruction
-> Task -> Previous Output -> Report Directive -> Tag Directive -> Policy Reminder
```

**Note**: Policies are injected twice, at the beginning and the end (Lost in the Middle mitigation). Bloated policies double token consumption.

| Optimization | Method | Effect |
|-------------|--------|--------|
| Persona compression | Remove redundant descriptions, compress within size limits | Reduction at each step |
| Policy splitting | Split large policies by purpose, assign only to relevant steps | 2x effect (includes reminder portion) |
| Knowledge scoping | Remove unnecessary knowledge references from steps | Reduce unnecessary context |
| Instruction simplification | Remove manual descriptions of auto-injected content | Eliminate duplication |
| Output contract slimming | Compress output contracts exceeding 30 lines | Reduction in report directive portion |

**Facet size guidelines:**

| Facet | Recommended | Limit |
|-------|------------|-------|
| Persona (simple) | 30-50 lines | 100 lines |
| Persona (expert) | 50-300 lines | 550 lines |
| Policy | 60-250 lines | 300 lines |
| Instruction (review) | 5-12 lines | - |
| Instruction (plan/fix) | 10-20 lines | - |
| Instruction (implement) | 30-50 lines | - |
| Output Contract | 10-25 lines | 30 lines |

### 2. Step Consolidation

Consolidate unnecessary steps to reduce the total number of steps in the workflow.

| Pattern | Detection Condition | Optimization |
|---------|-------------------|-------------|
| Consecutive same persona | Adjacent steps share the same persona | Consolidate into 1 step |
| Single-rule transition | Only 1 rule with unconditional transition | Consider consolidating with adjacent steps |
| edit=false chain | Chain of read-only steps | Evaluate consolidation potential |

**Consolidation criteria:**
- Whether the persona is the same or different between steps
- Whether it breaks session: refresh boundaries
- Whether independent report output is required
- Whether rule branching is substantively meaningful

### 3. Rule Simplification

Streamline rule conditions for efficiency.

| Optimization | Before | After |
|-------------|--------|-------|
| ai() to tag replacement | `ai("implementation complete")` | `"implementation complete"` (tag-based) |
| Unreachable rule removal | 1 of 3 conditions is unreachable | Remove unreachable rule |
| Condition text shortening | `"all reviewers have approved"` | `"approved"` |

**ai() vs tag-based decision:**
- Tag-based (recommended): When results can be clearly classified
- ai(): Only when contextual understanding is needed for judgment

### 4. Facet Reuse

Replace custom facets with built-ins and reduce section maps.

**Procedure:**
1. Enumerate custom facets in the section map
2. Read the contents of each custom facet
3. Compare with built-in facets and evaluate similarity
4. If replaceable, substitute with bare name reference

**Built-in replacement example:**
```yaml
# Before: Custom facet referenced in section map
personas:
  my-coder: ../personas/my-coder.md
steps:
  - name: implement
    persona: my-coder

# After: Built-in bare name reference
steps:
  - name: implement
    persona: coder    # Direct built-in reference
```

**Non-replaceable conditions:**
- Personas containing domain knowledge not in built-ins
- Policies containing project-specific criteria
- Instructions containing custom procedures

### 5. Loop Control Improvement

Improve efficiency and safety of fix loops.

| Optimization | Details |
|-------------|---------|
| Add loop_monitors | Add loop_monitor when review-fix cycles lack one |
| Threshold adjustment | Propose appropriate values when thresholds are too high/low |
| Add ABORT conditions | Add ABORT transitions when missing for failure cases |
| max_steps adjustment | Adjust when max_steps is excessive/insufficient for the number of steps |
| Fix supervise failure transition | Change `supervise` failure rule to transition to `fix` instead of `plan`. The `supervise -> plan` loop tends to be high-cost and unproductive |
| Add edit=false build prohibition | Add a prohibition section ("## Do Not") to instructions referenced by `edit: false` steps stating "Do not execute build commands" |
| Normalize loop monitor judge instruction | Unify `loop_monitors.judge.instruction` to built-in facet references (`loop-monitor-ai-fix`, `loop-monitor-reviewers-fix`) and remove legacy judge template notation |
| Migrate allowed_tools to provider_options | Move top-level `allowed_tools` to `provider_options.claude.allowed_tools` (v0.30.0+) |

**Recommended threshold values:**
- review-fix cycle: 3 times
- supervise-fix cycle: 3 times
- implement-test cycle: 2 times

### 6. Parallelization Proposals

Detect steps executed sequentially that could be parallelized.

**Parallelization conditions:**
- Do not reference each other's output (pass_previous_response not needed)
- Take the same preceding step's report as input
- Produce independent reports

```yaml
# Before: Sequential reviews
- name: arch-review
  ...
  rules:
    - condition: done
      next: qa-review
- name: qa-review
  ...

# After: Parallel reviews
- name: reviewers
  parallel:
    - name: arch-review
      ...
      rules:
        - condition: approved
        - condition: needs_fix
    - name: qa-review
      ...
      rules:
        - condition: approved
        - condition: needs_fix
  rules:
    - condition: all("approved")
      next: supervise
    - condition: any("needs_fix")
      next: fix
```

### 7. Optimization Based on Log Diagnostic Results

Use takt-analyze log diagnostic results as input to execute optimizations based on real data.

> **Prerequisite**: Log reading, parsing, and diagnostics are handled by takt-analyze. This category only covers "what to change" based on the diagnostic results.

**Diagnostic results -> Optimization actions:**

| takt-analyze Diagnostic | Optimization Action |
|------------------------|-------------------|
| Loop hotspot (Warning/Critical) | Adjust `loop_monitor` `threshold`, review rule conditions |
| Dead rule (Critical) | Remove unreachable rules |
| Low rule evaluation efficiency (`ai_judge_fallback` high frequency) | Rewrite to tag-based rules, add tag output directives to output-contract |
| High ABORT rate | Improve flow based on ABORT `reason` (`max_steps` adjustment, add ABORT conditions) |
| Repeated phase-level errors | Improve instructions and personas for error-prone phases |
| Low iteration efficiency | Calculate appropriate `max_steps` value, consider step consolidation |

## Workflow

### Step 1: Identify and Load Targets

Identify the target workflow YAML and load all related facets.

```
Search order:
1. User-specified path
2. Custom workflows in ~/.takt/workflows/
3. Project workflows in .takt/workflows/
```

Content to load:
- Entire workflow YAML
- All facet files from the section map
- Built-in facets (for comparison)
- takt-analyze diagnostic report (if provided)

### Step 2: Create Optimization Plan

Evaluate the optimization potential of each category and present a plan.

```markdown
# Optimization Plan: {workflow name}

## Analysis Sources
- Static analysis: Workflow YAML + {N} facets
- takt-analyze diagnostics: {summary of diagnostic report} (if provided)

## Estimated Impact
- Token reduction: ~{N}%
- Step count: {before} -> {after}
- File count: {before} -> {after}

## Optimization Items
| # | Category | Target | Details | Basis | Risk |
|---|----------|--------|---------|-------|------|
| 1 | Token reduction | persona/coder | Compress 120 lines -> 80 lines | Static | Low |
| 2 | Built-in replacement | persona/my-reviewer | -> architecture-reviewer | Static | Low |
| 3 | Rule simplification | ai_review | ai_fallback 67% -> tag conversion | Diagnostic | Low |
| 4 | Parallelization | arch-review + qa-review | Sequential -> parallel | Static | Medium |
```

**Confirm with user**: Present the plan and obtain approval for items to execute.

**Decision flow:**
- 0 optimization items -> Report "Already sufficiently optimized" and finish
- User partially approves -> Execute only approved items in Step 3
- User rejects all -> Finish

### Step 3: Execute Optimizations

Execute the approved items.

**Execution order (by dependency):**
1. Facet compression/consolidation (file content changes)
2. Built-in replacement (section map changes)
3. Step consolidation (YAML structure changes)
4. Rule simplification (rule condition changes)
5. Loop control improvement (add loop_monitors)
6. Parallelization (major step structure changes)

### Step 4: Consistency Verification

Verify the consistency of optimized files.

- [ ] Section map keys match references within steps
- [ ] Section map paths point to existing files
- [ ] `initial_step` exists within the `steps` array
- [ ] All rule `next` values point to valid transition targets
- [ ] Parallel parent rules use `all()`/`any()`
- [ ] Parallel sub-step rules do not have `next`
- [ ] Facets are within size limits
- [ ] No remaining references to deleted facets

### Step 5: Results Report

```markdown
# Optimization Results: {workflow name}

## Summary
- Token reduction: ~{N}% (estimated)
- Step count: {before} -> {after}
- File count: {before} -> {after}

## Change List
| # | File | Changes |
|---|------|---------|
| 1 | workflows/my-workflow.yaml | Step consolidation, rule simplification |
| 2 | personas/coder.md | Compressed 120 lines -> 80 lines |
| 3 | (deleted) personas/my-reviewer.md | Replaced with built-in |

## Deleted Files
- personas/my-reviewer.md (-> Replaced with built-in architecture-reviewer)

## Notes
{Describe any potential behavioral changes due to optimization}
```

## Validation

Created/edited files can be mechanically verified with `validate-takt-files.sh`:

```bash
bash .agents/skills/takt-optimize/scripts/validate-takt-files.sh
```

Verification items:
- **Workflow YAML**: Required fields (`name`/`initial_step`/`steps`), `initial_step` step reference, facet file reference existence
- **Facet .md**: Empty check, persona/policy/knowledge require `# heading`, instruction/output-contract require content

Options `--workflows` / `--facets` can narrow the targets.
