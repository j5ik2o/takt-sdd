Analyze the codebase and generate initial steering files in `.kiro/steering/`.

**What to do:**
1. Load templates from `.takt/knowledge/steering-template-files/`
2. Check whether a codebase exists (source files, README, package.json, Cargo.toml, etc.)
3. If a codebase exists, analyze it using JIT (fetch when needed):
   - Investigate the source file structure
   - Read project definition files such as README, package.json, Cargo.toml, etc.
   - Search for code patterns
4. Extract patterns (not lists):
   - **product.md**: Product purpose, value, core features
   - **tech.md**: Frameworks, technical decisions, conventions
   - **structure.md**: Code organization, naming conventions, import patterns
5. Generate steering files following the templates
6. Save to the `.kiro/steering/` directory (create if it does not exist)

**When no codebase exists (greenfield):**
- Generate skeleton files based on templates
- Keep placeholders (`[choice]`, `[rationale]`, `[tech stack]`, etc.) for developers to fill in
- If the user's task input includes product direction or technology choices, incorporate them
- Do NOT ABORT just because there is no code

**JIT Strategy:** Fetch information only when needed. Do not read all files in advance.

**Focus:** Document patterns that guide decision-making. Do not create catalogs of files or modules.

**Artifact destination:**
- Directory: `.kiro/steering/` (create if it does not exist)
- Files: `product.md`, `tech.md`, `structure.md`
