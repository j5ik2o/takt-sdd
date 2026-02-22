Implement only the tasks listed in "Current Batch" of 00-plan.md.

Only reference files within the Report Directory from Piece Context.
Use the batch tasks in 00-plan.md as the primary source for implementation. Do not touch any tasks outside the batch.

**What to do:**
1. Read 00-plan.md and obtain `feature` and `tasks_path` from "## Target Feature"
   - If `feature` or `tasks_path` is missing, terminate with "unable to determine, insufficient information"
2. Review the task list in "Current Batch" of 00-plan.md
3. Read `{tasks_path}` to check the details and check status of the target tasks
4. Implement each task in the batch sequentially
5. Add unit tests for newly created classes and functions
6. Update relevant tests when existing code is modified
7. Test file placement: follow the project's conventions
8. Test execution is mandatory. After implementation is complete, run tests and verify results
9. Update the checkboxes of completed tasks in `{tasks_path}`
   - `- [ ]` -> `- [x]`

**Important:**
- Due to `session: refresh`, always obtain the feature from 00-plan.md
- Do not implement tasks outside the batch
- Only update tasks.md checkboxes for tasks whose implementation is complete
- If information conflicts, prioritize the reports in the Report Directory and actual file contents

**Scope output contract (create at the start of implementation):**
```markdown
# Change Scope Declaration

## Tasks
{List of batch task IDs}

## Planned Changes
| Type | File |
|------|------|
| Create | `src/example.ts` |
| Modify | `src/routes.ts` |

## Estimated Size
Small / Medium / Large

## Impact Scope
- {Affected modules and features}
```

**Decisions output contract (at completion, only if decisions were made):**
```markdown
# Decision Log

## 1. {Decision}
- **Context**: {Why the decision was needed}
- **Options considered**: {List of options}
- **Rationale**: {Why the chosen option was selected}
```

**Required output (include these headings)**
## Work Results
- {Summary of work performed}
## Changes Made
- {Summary of changes}
## Completed Tasks
- {List of task IDs with updated checkboxes}
## Test Results
- {Commands executed and results}
