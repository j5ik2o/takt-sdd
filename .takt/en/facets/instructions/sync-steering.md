Compare existing steering files with the codebase and detect/update divergences.

**What to do:**
1. Read all steering files under `.kiro/steering/`
2. Analyze codebase changes using JIT
3. Detect divergences:
   - **Steering -> Code**: Elements documented in steering but not present in code -> Warning
   - **Code -> Steering**: New patterns present in code but not documented in steering -> Update candidate
   - **Custom files**: Check relevance
4. Propose updates (additive; preserve user content)
5. Output a report: updates made, warnings, recommendations

**Update philosophy:** Add, do not replace. Preserve user sections.

**Specific divergence detection checks:**
- Technology stack changes (framework version upgrades, etc.)
- Emergence of new directory patterns
- Changes in naming conventions
- Introduction of new architecture patterns
- Patterns that are no longer in use

**Artifact destination:**
- Directly update steering files that need updating
- Add an `updated_at` timestamp when updating
