---
name: takt-analyze
description: >
  A skill that analyzes existing TAKT pieces and facets, providing improvement suggestions.
  Performs piece YAML structural validation, inter-facet consistency checks, style guide
  compliance verification, unused facet detection, and rule design optimization proposals.
  Uses references/takt style guides and engine specifications as analysis criteria.
  Triggers: "analyze pieces", "check takt config", "facet quality check",
  "review pieces", "takt analyze", "workflow improvement suggestions",
  "piece consistency check", "find takt issues"
---

# TAKT Analyzer

Analyzes existing TAKT pieces and facets, detecting issues and providing improvement suggestions.

## Reference Materials

| Material | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Piece structure validation criteria |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Rule evaluation and execution specification |
| Style Guides | `references/takt/builtins/en/*_STYLE_GUIDE.md` | Facet quality criteria |
| Builtin Pieces | `references/takt/builtins/en/pieces/` | Structural pattern reference |
| Builtin Facets | `references/takt/builtins/en/{personas,policies,instructions,knowledge,output-contracts}/` | Facet quality reference |

## Analysis Categories

### 1. Piece Structure Analysis

Detects structural issues in piece YAML.

**Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| initial_movement exists | Does `initial_movement` exist within the `movements` array? | Critical |
| Transition target validity | Are all `rules.next` values valid movement names or `COMPLETE`/`ABORT`? | Critical |
| Section map consistency | Do section map keys match references within movements? | Critical |
| File path existence | Do paths in the section map actually exist? | Critical |
| parallel structure | Does the parent rule use `all()`/`any()`, and do sub-steps lack `next`? | Warning |
| edit permission | Do movements with `edit: true` have an appropriate `required_permission_mode`? | Info |
| session setting | Do implementation movements have `session: refresh`? | Info |

### 2. Facet Quality Analysis

Verifies that each facet complies with the style guide.

**Persona Checks:**
- [ ] Role definition is 1-2 sentences
- [ ] "Do" and "Don't" sections include the assigned agent name
- [ ] No detailed policy rules (code examples, tables) mixed in
- [ ] No piece-specific concepts (movement names, etc.)
- [ ] Size: simple 100 lines max, expert 550 lines max
- [ ] No nesting below `####`

**Policy Checks:**
- [ ] Purpose description is a single sentence
- [ ] Principles table exists
- [ ] No agent-specific knowledge
- [ ] Size: 300 lines max

**Instruction Checks:**
- [ ] Begins with an imperative
- [ ] Does not manually write `{task}` or `{previous_response}`
- [ ] No persona/policy content mixed in
- [ ] Size: within the limit for the instruction type

**Output Contract Checks:**
- [ ] Wrapped in a ` ```markdown ` code block
- [ ] Review types include status and cognitive load reduction rules
- [ ] File name has no numeric prefix
- [ ] Size: 30 lines max

### 3. Facet Separation Analysis

Detects whether responsibilities are properly separated across facets.

| Violation Pattern | Description | Correction |
|-------------------|-------------|------------|
| Policy details in Persona | Rules with code examples or tables inside a Persona | -> Move to Policy |
| Piece concepts in Persona | Movement names or report file names inside a Persona | -> Move to Instruction |
| Agent-specific knowledge in Policy | Detection techniques specific to a particular agent inside a Policy | -> Move to Persona domain knowledge |
| Principles in Instruction | Shared coding principles inside an Instruction | -> Move to Policy |
| Procedures in Output Contract | Execution steps inside an Output Contract | -> Move to Instruction |

### 4. Rule Design Analysis

Evaluates the design of rule conditions.

| Check | Description |
|-------|-------------|
| Tag vs AI judgment | Is `ai()` used where tag-based conditions would suffice? |
| aggregate usage | Are `all()`/`any()` used in parallel parent rules? |
| Unreachable rules | Are there cases that match no condition? |
| Loop risk | Do cycles like fix->review have `loop_monitors`? |
| ABORT conditions | Are ABORT transitions properly defined for failure cases? |

### 5. Builtin Utilization Analysis

Detects whether custom facets can be replaced with builtins.

**Procedure:**
1. Compare custom facet content against builtin facets
2. Suggest replacement with builtins when similarity is high
3. Detect mixing of builtin bare name references and section map references

## Workflow

### Step 1: Identify Targets

Identify the piece YAML to analyze.

```
Search order:
1. User-specified path
2. Custom pieces in ~/.takt/pieces/
3. Project pieces in .takt/pieces/
```

### Step 2: Parse Piece YAML

Load the piece YAML and perform structural analysis.

1. Validate YAML syntax
2. Verify movement composition
3. Type-check rule conditions
4. Resolve section map references

### Step 3: Load Facets and Quality Check

Load all facets from the section map and builtin references, then verify against the style guides.

### Step 4: Separation Analysis

Detect responsibility violations across facets.

### Step 5: Report Output

```markdown
# TAKT Analysis Report: {piece name}

## Summary
- Critical: {N issues}
- Warning: {N issues}
- Info: {N issues}

## Critical (Must Fix)
| # | Category | Location | Issue |
|---|----------|----------|-------|

## Warning (Recommended Fix)
| # | Category | Location | Issue | Improvement |
|---|----------|----------|-------|-------------|

## Info (Improvement Suggestions)
| # | Category | Location | Suggestion |
|---|----------|----------|------------|

## Builtin Utilization Suggestions
{Proposals for replacing custom facets with builtins}
```
