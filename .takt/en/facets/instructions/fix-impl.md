Fix the implementation based on findings from reviews and validations.

**Note:** ABORT if no review report exists.

**What to do:**
1. Identify the target feature name from the task
2. Read the following review reports from the report directory (only those that exist):
   - `05-architect-review.md` (architecture review)
   - `06-qa-review.md` (QA review)
   - `07-impl-validation.md` (implementation validation)
3. Read `.kiro/specs/{feature}/requirements.md` (requirements)
4. Read `.kiro/specs/{feature}/design.md` (design)
5. Read `.kiro/specs/{feature}/tasks.md` (tasks)
6. If `.kiro/steering/` exists, read all files
7. Address the findings from each review:
   - `needs_fix` findings: Fix code quality and design compliance issues
   - `validation failed` findings: Fix discrepancies with requirements and design
   - Verify that tests pass after fixes
8. Record the fix details

**Fix principles:**
- Only make fixes that directly address review findings (do not expand scope)
- Maintain existing coding conventions and test patterns
- Verify that fixes do not break existing tests
- ABORT if there are fundamental issues that cannot be fixed
