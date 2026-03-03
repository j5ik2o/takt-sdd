---
name: takt-facet
description: >
  Skill for creating and editing individual TAKT facets
  (Persona/Policy/Instruction/Knowledge/Output Contract).
  Generates standalone files conforming to each facet's style guide.
  Uses style guides and built-in facet collections in references/takt as reference material
  for facet type determination, template selection, and quality checks.
  Triggers: "create a persona", "add a policy", "write an instruction",
  "define knowledge", "create an output contract", "edit a facet", "takt facet",
  "reviewer persona", "coding policy"
---

# TAKT Facet Creator

Create and edit the 5 types of TAKT facet files individually.

## Reference Materials

When creating facets, refer to the materials in `references/takt/builtins/en/`.

| Material | Path | Purpose |
|----------|------|---------|
| Comprehensive Style Guide | `references/takt/builtins/en/STYLE_GUIDE.md` | Positioning of each facet |
| Persona Guide | `references/takt/builtins/en/PERSONA_STYLE_GUIDE.md` | Persona writing conventions |
| Policy Guide | `references/takt/builtins/en/POLICY_STYLE_GUIDE.md` | Policy writing conventions |
| Instruction Guide | `references/takt/builtins/en/INSTRUCTION_STYLE_GUIDE.md` | Instruction writing conventions |
| Output Contract Guide | `references/takt/builtins/en/OUTPUT_CONTRACT_STYLE_GUIDE.md` | Output contract writing conventions |
| Faceted Prompting | `references/takt/docs/faceted-prompting.en.md` | Theory of the 5-facet design |
| Templates | `references/takt/builtins/en/templates/` | Templates for each facet |
| Built-in Facets | `references/takt/builtins/en/{personas,policies,instructions,knowledge,output-contracts}/` | Existing facet examples |

**Important**: Always read the relevant style guide before creating a facet.

## Workflow

### Step 1: Determine Facet Type

Determine the facet type to create based on the user's requirements.

```
This content is...
├── Identity/expertise specific to a particular agent → Persona
├── Behavioral norms shared across multiple agents → Policy
├── Execution steps specific to a movement → Instruction
├── Reference information that serves as a basis for decisions → Knowledge
└── Structure definition for agent output → Output Contract
```

| Facet | Placement | Scope | Key Question |
|-------|-----------|-------|--------------|
| Persona | system prompt | 1 agent | "Is this knowledge specific to this agent?" |
| Policy | within user message | Multiple agents | "Do multiple agents follow the same rule?" |
| Instruction | Phase 1 message | 1 movement | "Is this procedure specific to this movement?" |
| Knowledge | within user message | 1+ agents | "Is this reference information that serves as a basis for decisions?" |
| Output Contract | Phase 2 message | 1 report | "Will downstream reference this via `{report:filename}`?" |

### Step 2: Check Built-ins

Check existing built-in facets of the same type and determine if they can be reused.

| Facet | Built-in Examples |
|-------|-------------------|
| Persona | coder, planner, architecture-reviewer, qa-reviewer, supervisor, security-reviewer |
| Policy | coding, review, testing, qa, ai-antipattern |
| Instruction | plan, implement, review-arch, review-qa, supervise, fix |
| Knowledge | architecture, backend, cqrs-es, frontend, security |
| Output Contract | plan, architecture-review, ai-review, summary, validation |

**Reuse Decision**: Do not create a custom facet if a built-in is sufficient.

### Step 3: Template Selection and Creation

#### Persona

Templates: `templates/personas/{simple,expert,character}.md`

| Template | Use Case | Examples |
|----------|----------|----------|
| `simple.md` | No domain knowledge | coder, planner |
| `expert.md` | With domain knowledge | architecture-reviewer |
| `character.md` | Distinct personality/tone | melchior, balthasar |

```markdown
# {Agent Name}

{1-2 sentence role definition. Start with "You are..."}

## Role Boundaries

**Do:**
- ...

**Do not:**
- ... (specify the responsible agent name)

## Behavioral Stance

- ... (3-8 items)

## Domain Knowledge (expert only)

### {Perspective}
...
```

**Size Guidelines**: simple 30-50 lines (max 100 lines), expert 50-300 lines (max 550 lines)

**Prohibited**:
- Copying detailed policy rules (code examples, tables) (a one-line behavioral guideline is OK)
- Piece-specific concepts (movement names, report file names)
- Tool-specific paths (`.takt/runs/`, etc.)
- Execution steps

#### Policy

Template: `templates/policies/policy.md`

```markdown
# {Policy Name}

{One-sentence purpose statement}

## Principles

| Principle | Criteria |
|-----------|----------|
| ... | ... |

## {Rule Category 1}

{Freely combine tables, code examples, and bullet lists}
```

**Size Guidelines**: 60-250 lines (max 300 lines)

**Prohibited**:
- Knowledge specific to a particular agent
- Piece-specific concepts, tool-specific paths
- Execution steps

#### Instruction

Templates: `templates/instructions/{plan,implement,review,fix,supervise,...}.md`

```markdown
{Purpose statement. 1-2 lines, imperative mood}

**Note:** {Conditional notes (if applicable)}

**Do:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Required Output (include headings)**
## {Output Section 1}
- {Content}
## {Output Section 2}
- {Content}
```

**Size Guidelines**: review sub-step 5-12 lines, planning/fix 10-20 lines, implementation/verification 30-50 lines

**Prohibited**:
- Persona content (expertise, behavioral stance)
- Policy content (shared coding principles)
- Manual description of auto-injected variables (`{task}`, `{previous_response}`)
- Direct references to other movement names

**Template Variables** (available for use):
- `{iteration}`, `{max_movements}`, `{movement_iteration}`
- `{report_dir}`, `{report:filename}`, `{cycle_count}`

#### Knowledge

Template: `templates/knowledge/knowledge.md`

```markdown
# {Domain Name} Knowledge

## {Topic 1}

{Overview. 1-2 sentences}

| Criteria | Judgment |
|----------|----------|
| ... | ... |

### {Subtopic}

{Be specific with code examples}

## {Topic 2}

| Pattern | Example | Issue |
|---------|---------|-------|
| ... | `{code}` | ... |

Verification approach:
1. {Step}
```

**Characteristic**: Descriptive ("this is how it is"). Provides the "WHY" for policies.

#### Output Contract

Templates: `templates/reports/{plan,review,validation,summary,...}.md`

````markdown
```markdown
# {Report Title}

## Result: APPROVE / REJECT

## Summary
{Summarize the result in 1-2 sentences}

## Details
| Aspect | Result | Notes |
|--------|--------|-------|
```

**Cognitive Load Reduction Rules:**
- APPROVE -> Summary only (5 lines or fewer)
- REJECT -> Issues in table format (30 lines or fewer)
````

**Size Guidelines**: 10-25 lines (max 30 lines, excluding cognitive load reduction rules)

**Status Patterns**: `APPROVE / REJECT` (binary), `APPROVE / IMPROVE / REJECT` (ternary), `Complete` (fixed value)

**Prohibited**:
- Execution steps (responsibility of Instructions)
- Detailed judgment criteria (responsibility of Personas/Instructions)

### Step 4: Apply Common Rules

Verify the rules common to all facets.

| Rule | Description |
|------|-------------|
| Heading depth | Up to `###`. `####` and deeper are not allowed |
| Code examples | Good/bad example pairs. `// REJECT` `// OK` comments |
| Writing style | Persona/Policy/Knowledge: declarative. Instruction: imperative |
| File naming | `{name}.md`, hyphen-separated, lowercase English |
| Placement | `~/.takt/{facet-type}/` or a project-specific location |

### Step 5: Verification

Verify the quality of the created facet.

**Common to All Facets:**
- [ ] No nesting at `####` or deeper
- [ ] Follows file naming conventions
- [ ] Within size limits

**Persona:**
- [ ] Role definition is 1-2 sentences
- [ ] "Do" and "Do not" sections include responsible agent names
- [ ] No detailed policy rules have leaked in
- [ ] No piece-specific concepts

**Policy:**
- [ ] Purpose statement is one sentence
- [ ] Principles table exists
- [ ] Applicable to multiple agents

**Instruction:**
- [ ] Begins with imperative mood
- [ ] Auto-injected variables are not manually described
- [ ] No persona/policy content has leaked in

**Knowledge:**
- [ ] Written in descriptive (declarative) style
- [ ] Specific with tables and code examples

**Output Contract:**
- [ ] Wrapped in a ```markdown code block
- [ ] Review types have status and cognitive load reduction rules
- [ ] No numeric prefix in file name
