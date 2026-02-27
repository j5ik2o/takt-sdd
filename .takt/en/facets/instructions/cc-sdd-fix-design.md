Fix the technical design document based on findings from the design review.

**Note:** ABORT if no design or design review exists.

**What to do:**
1. Identify the target feature name from the task
2. Read `design-review.md` (review findings) from the report directory
3. Read `.kiro/specs/{feature}/design.md` (current design)
4. Read `.kiro/specs/{feature}/requirements.md` (requirements)
5. If `.kiro/steering/` exists, read all files
6. Address each "critical issue" from the review findings:
   - Read the improvement suggestions and determine how to reflect them in the design
   - Verify linkage with requirement IDs and maintain requirements traceability
   - If a fix affects other components, ensure consistency
7. Save the fixed design

**Fix principles:**
- Only make fixes that directly address review findings (do not expand scope)
- Maintain the existing design structure and naming conventions
- Verify that fixes do not introduce new contradictions
- ABORT if there are fundamental issues that cannot be fixed

**Artifact destination:**
- `.kiro/specs/{feature}/design.md` (overwrite update)
