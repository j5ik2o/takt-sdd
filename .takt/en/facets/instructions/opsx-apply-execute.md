Implement ONLY the tasks listed in "Current Batch" of 00-plan.md.

Reference only files within the Piece Context's Report Directory.
Use 00-plan.md's batch tasks as the primary source. Do NOT touch tasks outside the batch.

**What to do:**
1. Read 00-plan.md and get `change` and `tasks_path` from "## Target Change"
   - If `change` or `tasks_path` is missing: end with "unable to determine, insufficient information"
2. Check the "Current Batch" task list in 00-plan.md
3. Read `{tasks_path}` to check task details and checkbox state
4. Implement each task in the batch sequentially
5. Add unit tests for newly created classes/functions
6. Update relevant tests when existing code is modified
7. Test file placement: follow project conventions
8. Test execution is mandatory. Run tests after implementation and verify results
9. Update completed task checkboxes in `{tasks_path}`
   - `- [ ]` -> `- [x]`

**Important:**
- Due to `session: refresh`, always get change name from 00-plan.md
- Do NOT implement tasks outside the batch
- Only update checkboxes for actually completed tasks
- When information conflicts, prioritize Report Directory reports and actual file contents

**Scope output contract (create at implementation start):**
```markdown
# Change Scope Declaration

## Tasks
{Batch task ID list}

## Planned Changes
| Type | File |
|------|------|
| Create | `src/example.ts` |
| Modify | `src/routes.ts` |

## Estimated Size
Small / Medium / Large

## Impact Area
- {Affected modules or features}
```

**Decisions output contract (at completion, only if decisions were made):**
```markdown
# Decision Log

## 1. {Decision}
- **Background**: {Why the decision was needed}
- **Options considered**: {List of options}
- **Rationale**: {Why this option was chosen}
```

**Required output (include these headings):**
## Work Result
- {Summary of what was done}
## Changes Made
- {Summary of changes}
## Completed Tasks
- {List of task IDs with updated checkboxes}
## Test Results
- {Commands executed and results}
