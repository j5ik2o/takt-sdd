Verify that the implementation aligns with requirements, design, and tasks.

**Note:** ABORT if requirements, design, and tasks are not all present in `.kiro/specs/{feature}/`.

**What to do:**
1. Identify the target feature name from the task
2. Read all artifacts in `.kiro/specs/{feature}/`:
   - `requirements.md` - Requirements
   - `design.md` - Design
   - `tasks.md` - Task list
3. Check task completion status:
   - Count the `[x]` checkboxes in `tasks.md`
   - Identify incomplete tasks
4. Verify requirements coverage:
   - Confirm that implementation code exists for each requirement ID
   - Confirm that tests exist for acceptance criteria
5. Verify design consistency:
   - Confirm that the design's component structure matches the implementation
   - Confirm that interface definitions are being followed
6. Test execution:
   - Run test commands and verify that all tests pass
7. Regression check:
   - Confirm that existing tests are not affected
