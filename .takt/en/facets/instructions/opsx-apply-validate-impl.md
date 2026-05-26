Verify that the implementation aligns with the OpenSpec change design and tasks.

**Note:** ABORT if the OpenSpec change directory (`openspec/changes/{change}/`) does not contain the required design and task artifacts.

**What to do:**
1. Identify the target change from `00-plan.md` in the report directory
2. Read the artifacts under `openspec/changes/{change}/`:
   - `proposal.md` - Proposal
   - `design.md` - Design
   - `tasks.md` - Task list
3. Check task completion status:
   - Count `[x]` and `[X]` checkboxes in `tasks.md` as complete
   - Identify incomplete tasks
4. Verify requirement coverage:
   - If `openspec/changes/{change}/specs/` exists:
     - Read the Requirement / Scenario entries and verify matching implementation code and tests exist
   - If `specs/` does not exist:
     - Use `proposal.md`, `design.md`, and `tasks.md` as the basis for checking each task's acceptance condition and matching tests
5. Verify design consistency:
   - Confirm that the implementation matches the designed component structure
   - Confirm that interface definitions are respected
6. Run tests:
   - Execute the test commands and confirm all tests pass
7. Check for regressions:
   - Confirm existing tests are not negatively affected

**Required output**
## Task Completion Status
- Complete: {N} / Total: {M}
- Incomplete tasks: {list}
## Design Consistency
- {details about matches or mismatches against the design}
## Test Results
- {command and result}
## Verdict
- {検証合格 / 検証不合格}
