---
name: takt-analyzer
description: >
  A skill that analyzes existing TAKT workflows and facets, providing improvement suggestions.
  Performs workflow YAML structural validation, inter-facet consistency checks, style guide
  compliance verification, unused facet detection, and rule design optimization proposals.
  When execution logs (.takt/logs/*.jsonl) exist, also performs log-based diagnostic analysis,
  reporting rule evaluation efficiency, loop hotspots, ABORT rates, etc.
  Uses references/takt style guides and engine specifications as analysis criteria.
  Triggers: "analyze workflows", "check takt config", "facet quality check",
  "review workflows", "takt analyze", "workflow improvement suggestions",
  "workflow consistency check", "find takt issues",
  "analyze logs", "execution log diagnostics", "check takt logs", "rule evaluation statistics",
  "ai_fallback frequency", "loop detection"
---

# TAKT Analyzer

Analyzes existing TAKT workflows and facets, detecting issues and providing improvement suggestions.

> **Required takt version**: v0.35.4

## Reference Materials

| Material | Path | Purpose |
|----------|------|---------|
| YAML Schema | `references/takt/builtins/skill/references/yaml-schema.md` | Workflow structure validation criteria |
| Engine Specification | `references/takt/builtins/skill/references/engine.md` | Rule evaluation and execution specification |
| Style Guides | `references/takt/builtins/en/*_STYLE_GUIDE.md` | Facet quality criteria |
| Builtin Workflows | `references/takt/builtins/en/workflows/` | Structural pattern reference |
| Builtin Facets | `references/takt/builtins/en/{personas,policies,instructions,knowledge,output-contracts}/` | Facet quality reference |
| Log Type Definitions | `references/takt/src/core/logging/contracts.ts` | NDJSON record type reference (renamed `observability` -> `logging` in v0.30.0) |
| Provider Events | `references/takt/src/core/logging/providerEventLogger.ts` | `*-provider-events.jsonl` structure |
| Usage Events | `references/takt/src/core/logging/usageEventLogger.ts` | Usage event structure |
| Rule Evaluation | `references/takt/src/core/workflow/evaluation/RuleEvaluator.ts` | matchedRuleMethod internals (incl. `when:` deterministic conditions) |

## Difference from takt-optimize

| Aspect | takt-analyze | takt-optimize |
|--------|-------------|---------------|
| Purpose | Issue detection, diagnostics, and reporting | Optimization execution |
| Output | Analysis report (Markdown) | Optimized file set |
| Changes | None (read-only) | Directly edits/generates files |
| Input | Workflow YAML + facets + **execution logs** | Same |
| Judgment | Severity classification of issues | Cost/quality tradeoff decisions |

## Analysis Categories

### 1. Workflow Structure Analysis

Detects structural issues in workflow YAML.

**Checklist:**

| Check | Description | Severity |
|-------|-------------|----------|
| initial_step exists | Does `initial_step` exist within the `steps` array? | Critical |
| Transition target validity | Are all `rules.next` values valid step names or `COMPLETE`/`ABORT`? | Critical |
| loop healthy transition consistency | Does `loop_monitors.cycle`'s healthy `next` match the cycle head node? | Critical |
| loop report range reference | Does `loop_monitors.judge.instruction`'s `{report:...}` reference only cycle-internal step outputs? | Critical |
| Section map consistency | Do section map keys match references within steps? | Critical |
| File path existence | Do paths in the section map actually exist? | Critical |
| parallel structure | Does the parent rule use `all()`/`any()`, and do sub-steps lack `next`? | Warning |
| edit=false + build operations | Does the instruction for an `edit: false` step explicitly prohibit build commands (`cargo check`, etc.)? Builds fail with `Operation not permitted` in a read-only sandbox | Warning |
| supervise failure transition target | Does a `supervise` failure rule transition to `plan`? Fixable issues should transition to `fix`; `supervise -> plan` is only for cases requiring fundamental design changes | Warning |
| CI execution responsibility placement | Do instructions for `edit: false` steps (`supervise`/`ai_review`, etc.) prohibit direct CI execution and only require verifying `fix`/`implement` report evidence? | Warning |
| provider_options structure | Is `allowed_tools` placed under `provider_options.claude.allowed_tools` rather than top-level? (v0.30.0+) | Warning |
| edit permission | Do steps with `edit: true` have an appropriate `required_permission_mode`? | Info |
| session setting | Do implementation steps have `session: refresh`? | Info |

### 2. Facet Quality Analysis

Verifies that each facet complies with the style guide.

**Persona Checks:**
- [ ] Role definition is 1-2 sentences
- [ ] "Do" and "Don't" sections include the assigned agent name
- [ ] No detailed policy rules (code examples, tables) mixed in
- [ ] No workflow-specific concepts (step names, etc.)
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
| Workflow concepts in Persona | Step names or report file names inside a Persona | -> Move to Instruction |
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
| loop healthy transition | Does each loop monitor's "healthy (progress made)" `next` point to the cycle head node? |
| loop report consistency | Does a loop monitor reference reports exclusive to steps outside its cycle? |
| ABORT conditions | Are ABORT transitions properly defined for failure cases? |

### 5. Builtin Utilization Analysis

Detects whether custom facets can be replaced with builtins.

**Procedure:**
1. Compare custom facet content against builtin facets
2. Suggest replacement with builtins when similarity is high
3. Detect mixing of builtin bare name references and section map references

### 6. Log-Based Diagnostic Analysis

Parses execution logs (`.takt/logs/*.jsonl`) and detects dynamic issues. Skipped if no logs exist.

#### a) Log Location and Format

- `.takt/logs/{sessionId}.jsonl` (NDJSON format: one JSON object per line)
- `.takt/logs/{sessionId}-provider-events.jsonl` (provider event log, separate file)
- `.takt/logs/{sessionId}/trace.md` (trace report, Markdown format)
- `.takt/logs/latest.json` to reference the latest session ID

**NDJSON Record Types:**

| type | Description |
|------|-------------|
| `piece_start` | Start of workflow execution |
| `step_start` | Start of a step |
| `step_complete` | Step completion (includes `matchedRuleIndex`, `matchedRuleMethod`) |
| `phase_start` | Start of a phase |
| `phase_complete` | Phase completion (has `error` field) |
| `piece_complete` | Normal completion of workflow execution (includes `iterations`) |
| `piece_abort` | Abort of workflow execution (includes `reason`) |
| `interactive_start` / `interactive_end` | Start/end of interactive mode |

> See `references/takt/src/shared/utils/types.ts` for detailed fields of each record type.

#### b) matchedRuleMethod

The `matchedRuleMethod` in `step_complete` records indicates which method the rule evaluation engine used to match the rule.

**Evaluation Order (Fallback Chain):**

```
1. aggregate     -> all()/any() aggregation of parallel sub-steps
2. phase3_tag    -> Tag detection from Phase 3 output
3. phase1_tag    -> Tag detection from Phase 1 output (fallback)
4. ai_judge      -> AI judgment of ai() conditions only
5. ai_judge_fallback -> AI judgment of all conditions (final fallback)
```

**Method Characteristics:**

| method | Cost | Reliability | Description |
|--------|------|-------------|-------------|
| `aggregate` | None | High | Determined by parallel sub-step completion status |
| `phase3_tag` | None | High | Deterministic judgment by output template tags |
| `phase1_tag` | None | Medium | Tag detection from agent response |
| `ai_judge` | 1 API call | Medium | AI judgment of `ai()` conditions only |
| `ai_judge_fallback` | 1 API call | Low | AI judgment of all conditions (when tag detection fails) |
| `auto_select` | None | High | Automatic selection when only one rule exists |
| `structured_output` | None | High | Judgment via structured output |

> If `ai_judge_fallback` frequency is high, add tag output instructions to the output-contract.

#### c) Diagnostic Analysis Items

| Analysis | Method | Severity Criteria |
|----------|--------|-------------------|
| Loop hotspots | Count `step_start` occurrences for the same step | Exceeds threshold=Warning, no `loop_monitor`=Critical |
| Dead rules | Detect rules with 0 matches from `matchedRuleIndex` distribution | Critical (unreachable code) |
| Rule evaluation efficiency | Aggregate `matchedRuleMethod` distribution; focus on `ai_judge_fallback` proportion | >50%=Warning, >80%=Critical |
| ABORT rate | Ratio of `piece_abort` / `piece_complete` | >30%=Warning, >50%=Critical |
| Per-phase errors | Aggregate `phase_complete` `error` fields | Repeated errors in same phase=Warning |
| Iteration efficiency | `piece_complete.iterations` vs `max_steps` | Consistently near limit=Warning |

#### d) Multiple Log Integration Analysis Guide

- **3+ runs**: Sufficient for pattern confirmation. Report statistical trends
- **1 run**: Treat as reference information; prioritize static analysis

#### e) Log Diagnostic Report Example

```markdown
## Log Diagnostic Results

### Analysis Targets
- Sessions: 5
- Period: 2026-03-01 - 2026-03-04

### Rule Evaluation Efficiency
| Step | phase3_tag | ai_judge | ai_judge_fallback | Improvement Priority |
|------|-----------|---------|-------------------|---------------------|
| ai_review  | 20%       | 13%     | 67%               | High       |
| supervise  | 80%       | 20%     | 0%                | -        |

### Loop Hotspots
| Cycle | Max Consecutive Count | loop_monitor | Status |
|-------|----------------------|-------------|--------|
| review->fix | 6 | threshold: 3 | OK |
| implement->test | 4 | None | Warning: loop_monitor not set |

### ABORT Analysis
- Success: 4/5 (80%)
- ABORT: 1/5 (20%) - reason: "max_steps exceeded"
```

## Workflow

### Step 1: Identify Targets

Identify the workflow YAML to analyze and check for the presence of execution logs.

```
Search order:
1. User-specified path
2. Custom workflows in ~/.takt/workflows/
3. Project workflows in .takt/workflows/

Log check:
- Check for the existence of the .takt/logs/ directory
- Logs present -> Static analysis + log diagnostics
- No logs -> Static analysis only (as before)
```

### Step 2: Parse Workflow YAML

Load the workflow YAML and perform structural analysis.

1. Validate YAML syntax
2. Verify step composition
3. Type-check rule conditions
4. Resolve section map references

### Step 3: Load Facets and Quality Check

Load all facets from the section map and builtin references, then verify against the style guides.

### Step 3.5: Log Loading and Diagnostics (only when logs exist)

1. Retrieve the latest session ID from `.takt/logs/latest.json`
2. Load the target `.jsonl` file and parse NDJSON records
3. Calculate each metric according to the Category 6 diagnostic analysis items
4. If multiple logs exist, perform integrated analysis

### Step 4: Separation Analysis

Detect responsibility violations across facets.

### Step 5: Report Output

```markdown
# TAKT Analysis Report: {workflow name}

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

## Log Diagnostic Results (only when logs are provided)
{Log-based diagnostic summary}
```
