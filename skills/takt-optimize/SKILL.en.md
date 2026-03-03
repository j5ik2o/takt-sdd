---
name: takt-optimize
description: >
  A skill for optimizing existing TAKT workflows (piece YAMLs and facets).
  Performs token consumption reduction, movement consolidation, rule simplification,
  facet reuse promotion, loop control improvement, and parallelization proposals,
  then directly generates the optimized files.
  When execution logs (.takt/logs/*.jsonl) are provided, it also performs
  optimizations based on real data such as rule match distribution, loop frequency,
  and ABORT rates.
  While takt-analyze specializes in "analysis and reporting", this skill specializes
  in "executing optimizations".
  Uses references/takt engine specifications and style guides as the baseline.
  Triggers: "optimize pieces", "speed up takt", "make the workflow lighter",
  "reduce tokens", "reduce movements", "takt optimize",
  "streamline the workflow", "clean up facets", "slim down the piece",
  "reduce takt costs", "simplify the workflow",
  "optimize from logs", "analyze execution logs and optimize", "improve takt from logs"
---

# TAKT Optimizer

Analyzes existing TAKT workflows and executes optimizations.

## Reference Materials

| Material | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Piece structure validation baseline |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Understanding prompt construction and token consumption |
| Style Guides | `references/takt/builtins/en/*_STYLE_GUIDE.md` | Facet size limits |
| Built-in Pieces | `references/takt/builtins/en/pieces/` | Optimization pattern reference |
| Built-in Facets | `references/takt/builtins/en/{personas,policies,instructions,knowledge,output-contracts}/` | Built-in replacement candidates |

## Difference from takt-analyze

| Aspect | takt-analyze | takt-optimize |
|--------|-------------|---------------|
| Purpose | Problem detection and reporting | Executing optimizations |
| Output | Analysis report (Markdown) | Optimized file set |
| Modifications | None (read-only) | Directly edits/generates files |
| Judgment | Severity classification of issues | Cost/quality tradeoff decisions |

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
| Persona compression | Remove redundant descriptions, compress within size limits | Reduction at each movement |
| Policy splitting | Split large policies by purpose, assign only to relevant movements | 2x effect (includes reminder portion) |
| Knowledge scoping | Remove unnecessary knowledge references from movements | Reduce unnecessary context |
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

### 2. Movement Consolidation

Consolidate unnecessary movements to reduce the total number of steps in the workflow.

| Pattern | Detection Condition | Optimization |
|---------|-------------------|-------------|
| Consecutive same persona | Adjacent movements share the same persona | Consolidate into 1 movement |
| Single-rule transition | Only 1 rule with unconditional transition | Consider consolidating with adjacent movements |
| edit=false chain | Chain of read-only movements | Evaluate consolidation potential |

**Consolidation criteria:**
- Whether the persona is the same or different between movements
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
movements:
  - name: implement
    persona: my-coder

# After: Built-in bare name reference
movements:
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
| max_movements adjustment | Adjust when max_movements is excessive/insufficient for the number of movements |

**Recommended threshold values:**
- review-fix cycle: 3 times
- implement-test cycle: 2 times

### 6. Parallelization Proposals

Detect movements executed sequentially that could be parallelized.

**Parallelization conditions:**
- Do not reference each other's output (pass_previous_response not needed)
- Take the same preceding movement's report as input
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

### 7. Log-Based Optimization

Analyze execution logs (`.takt/logs/{sessionId}.jsonl`) and perform optimizations based on real data.

**Log locations:**
- Session logs: `.takt/logs/{sessionId}.jsonl` (NDJSON format)
- Latest session: Accessible via `.takt/logs/latest.json`

**NDJSON record types:**

| Record | Key Fields | Use for Optimization |
|--------|-----------|---------------------|
| `piece_start` | `task`, `pieceName`, `startTime` | Identify execution patterns |
| `step_start` | `step`, `persona`, `iteration` | Movement execution frequency |
| `step_complete` | `step`, `status`, `matchedRuleIndex`, `matchedRuleMethod` | Rule match analysis |
| `phase_start` | `step`, `phase`(1/2/3), `phaseName` | Phase-level analysis |
| `phase_complete` | `step`, `phase`, `status`, `content`, `error` | Phase-level bottlenecks |
| `piece_complete` | `iterations`, `endTime` | Total iteration count |
| `piece_abort` | `iterations`, `reason`, `endTime` | Failure pattern analysis |

**Analysis items and optimizations:**

| Analysis | Method | Optimization Action |
|----------|--------|-------------------|
| Loop hotspots | Count occurrences of `step_start` for the same step | Adjust loop_monitor threshold, review rule conditions |
| Dead rule detection | Aggregate `matchedRuleIndex` distribution, identify never-matched rules | Remove unreachable rules |
| ai_fallback frequency | Ratio of `matchedRuleMethod` being `ai_judge_fallback` | Rewrite to tag-based rules (cost reduction and reliability improvement) |
| ABORT rate | Ratio of `piece_abort` to `piece_complete` | Analyze ABORT `reason` and improve flow |
| Phase-level errors | `error` field in `phase_complete` | Identify and improve error-prone phases |
| Iteration efficiency | `piece_complete.iterations` vs `max_movements` | Calculate appropriate max_movements value |

**matchedRuleMethod values and meanings:**

| Value | Meaning | Optimization Perspective |
|-------|---------|------------------------|
| `phase3_tag` | Determined by Phase 3 tag judgment | Ideal (low cost) |
| `phase1_tag` | Determined by Phase 1 output tag | Good (Phase 3 may be unnecessary) |
| `aggregate` | Determined by parallel parent's all()/any() | Normal |
| `ai_judge` | Determined by AI judgment of ai() condition | Acceptable (consider tag conversion) |
| `ai_judge_fallback` | All conditions judged by AI (last resort) | Needs improvement (tags not being output) |
| `auto_select` | Automatic selection | Normal |

**Log analysis example:**

```
# Results from analyzing 3 execution logs:
Step "ai_review" matchedRuleMethod distribution:
  phase3_tag: 1 time (33%)
  ai_judge_fallback: 2 times (67%)
-> Proposal: Status tags are not being output consistently.
  Strengthen tag output directives in instructions, or simplify rule condition text.
```

**Multi-log integrated analysis:**

When multiple session logs are provided, propose statistically reliable optimizations.
- 3+ execution runs: Sufficient to confirm patterns
- 1 execution run: Treat as reference data, prioritize static analysis

## Workflow

### Step 1: Identify and Load Targets

Identify the target piece YAML and load all related facets.

```
Search order:
1. User-specified path
2. Custom pieces in ~/.takt/pieces/
3. Project pieces in .takt/pieces/
```

Content to load:
- Entire piece YAML
- All facet files from the section map
- Built-in facets (for comparison)
- Execution logs (if provided by user): `.takt/logs/*.jsonl`

### Step 2: Create Optimization Plan

Evaluate the optimization potential of each category and present a plan.

```markdown
# Optimization Plan: {piece name}

## Analysis Sources
- Static analysis: Piece YAML + {N} facets
- Log analysis: {N} sessions (if provided)

## Estimated Impact
- Token reduction: ~{N}%
- Movement count: {before} -> {after}
- File count: {before} -> {after}

## Optimization Items
| # | Category | Target | Details | Basis | Risk |
|---|----------|--------|---------|-------|------|
| 1 | Token reduction | persona/coder | Compress 120 lines -> 80 lines | Static | Low |
| 2 | Built-in replacement | persona/my-reviewer | -> architecture-reviewer | Static | Low |
| 3 | Rule simplification | ai_review | ai_fallback 67% -> tag conversion | Log | Low |
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
3. Movement consolidation (YAML structure changes)
4. Rule simplification (rule condition changes)
5. Loop control improvement (add loop_monitors)
6. Parallelization (major movement structure changes)

### Step 4: Consistency Verification

Verify the consistency of optimized files.

- [ ] Section map keys match references within movements
- [ ] Section map paths point to existing files
- [ ] `initial_movement` exists within the `movements` array
- [ ] All rule `next` values point to valid transition targets
- [ ] Parallel parent rules use `all()`/`any()`
- [ ] Parallel sub-step rules do not have `next`
- [ ] Facets are within size limits
- [ ] No remaining references to deleted facets

### Step 5: Results Report

```markdown
# Optimization Results: {piece name}

## Summary
- Token reduction: ~{N}% (estimated)
- Movement count: {before} -> {after}
- File count: {before} -> {after}

## Change List
| # | File | Changes |
|---|------|---------|
| 1 | pieces/my-piece.yaml | Movement consolidation, rule simplification |
| 2 | personas/coder.md | Compressed 120 lines -> 80 lines |
| 3 | (deleted) personas/my-reviewer.md | Replaced with built-in |

## Deleted Files
- personas/my-reviewer.md (-> Replaced with built-in architecture-reviewer)

## Notes
{Describe any potential behavioral changes due to optimization}
```
