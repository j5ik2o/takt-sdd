Read the tasks file and create a batch execution plan for the next set of tasks.

**Note:** If a Previous Response exists, this is a re-plan after the previous batch completed.
Check the task checkbox status and determine the next batch.

**What to do:**

1. Identify the change name
   - First run (no 00-plan.md): extract change name from User Task
   - Re-plan (00-plan.md exists): use the change name from existing 00-plan.md "## Target Change"
   - If not identifiable, judge as "requirements unclear, insufficient information"

2. Get change context
   ```bash
   bash scripts/opsx-cli.sh instructions apply --change "<name>" --json
   ```
   - If `state: "blocked"`: judge as "tasks.md does not exist or is empty"
   - Parse `contextFiles` and `tasksFile` from the response

3. Determine `tasks_path` from the CLI output's `tasksFile` field

4. Read `{tasks_path}`
   - If the file doesn't exist: judge as "tasks.md does not exist or is empty"
   - If empty or no tasks (`- [ ]` / `- [x]`): same

5. Identify incomplete tasks (`- [ ]`)

6. If all tasks are complete (`- [x]`): judge as "all tasks complete"

7. If incomplete tasks exist:
   a. Estimate implementation scope per task (files changed, complexity)
   b. Investigate code to identify impact area
   c. Determine batch:
      - Group tasks that touch the same files into the same batch
      - Limit batch to fit related source code within context
   d. Read context files listed in `contextFiles` for implementation guidance

**Batch size criteria (both conditions must be met):**

Condition 1: Context limit (max tasks where related code fits in context)
- Small (1-2 file changes): max 8 tasks
- Medium (3-5 file changes): max 3 tasks
- Large (6+ file changes): max 1 task

Condition 2: Minimum work (lower bound to amortize startup overhead)
- Group tasks so estimated work per batch is 5+ minutes
- For Small tasks only: minimum 3 tasks per batch
- If remaining tasks are below the minimum, combine all into one batch

**Required output:**

```markdown
# Batch Execution Plan

## Target Change
- change: {change-name}
- tasks_path: `openspec/changes/{change-name}/tasks.md`

## Progress
- Complete: {completed}/{total}
- Remaining: {remaining}

## Current Batch
| Task ID | Task Summary |
|---------|-------------|
| X.X | ... |

## Implementation Approach
{Implementation strategy for this batch}

## Implementation Guidelines
- {Guidelines for the Coder to follow}
- If parallelizable tasks exist, the CLI agent's internal parallelism may be leveraged
```
