Generate a custom steering file.

**What to do:**
1. If a template exists, read `.takt/knowledge/cc-sdd-steering-custom-template-files/{name}.md`
2. If a codebase exists, analyze it using JIT to extract patterns related to the target domain:
   - Search for related files
   - Read existing implementation patterns
   - Search for specific patterns
3. Generate the custom steering:
   - Follow the template structure (if a template exists)
   - Apply steering principles
   - Focus on patterns (not exhaustive lists)
   - Keep it to 100-200 lines (readable in 2-3 minutes)
4. Verify there is no content overlap with core steering (product.md, tech.md, structure.md)
5. Save to `.kiro/steering/{name}.md`

**When no codebase exists (greenfield):**
- Generate a scaffold based on the template
- Leave placeholders (`[choices]`, `[rationale]`, etc.) for the developer to fill in
- If the user's task input includes policies or selections for the target domain, reflect them
- Do NOT ABORT because there is no code

**When no template exists:**
- Generate from scratch based on domain knowledge
- Use the following structure as a base:
  1. Philosophy (principles and policies)
  2. Patterns (patterns and conventions)
  3. Examples (concrete examples)
  4. Decisions (technical decisions and their rationale)

**When an existing file exists:**
- Preserve user sections
- Apply additive updates
- Add an `updated_at` timestamp

**JIT Strategy:** Fetch templates and code only when needed. Do not read all files in advance.

**Artifact destination:**
- Directory: `.kiro/steering/`
- File: `{name}.md` (corresponding to the topic name)
