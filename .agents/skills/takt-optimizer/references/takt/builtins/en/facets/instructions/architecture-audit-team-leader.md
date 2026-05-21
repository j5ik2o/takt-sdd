Decompose the architecture audit, assign modules to each part, and execute in parallel.

**Important:** Refer to the plan report: {report:01-architecture-audit-plan.md}

**What to do:**
1. Review the module inventory and architectural risk areas from the plan report
2. Split ALL target modules and subprojects from the plan report into 3 groups with no gaps
3. Assign exclusive ownership to each part so every relevant module is audited once

**Important:** Verify that every module and subproject listed in the plan report is assigned to exactly one part. No module may be left unassigned.

**Each part's instruction MUST include:**
- Assigned module and file list
- The boundaries and call chains to verify
- Required audit procedure:
  1. Read the assigned files in full
  2. Trace dependency direction, entry points, and shared abstractions
  3. Record structural findings with concrete file evidence
- Completion criteria: every assigned module has been audited and all findings are reported with evidence

**Constraints:**
- Each part is read-only
- Do not audit files outside the assignment
- Prefer evidence from code structure and call chains over style-only comments
