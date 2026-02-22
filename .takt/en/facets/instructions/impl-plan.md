Read tasks.md, analyze incomplete tasks, and create a batch execution plan.

**Note:** If a Previous Response exists, this is a re-plan after the previous batch completed.
Check the check status in tasks.md and determine the next batch.

**What to do:**
1. Identify the target feature name
   - Initial run (no 00-plan.md): Extract the feature name from the User Task
   - Re-plan (00-plan.md exists): Prioritize "## Target Feature" from the existing 00-plan.md
   - If unable to identify, determine "requirements unclear, insufficient information"
2. Establish `tasks_path = .kiro/specs/{feature}/tasks.md`
3. Read `{tasks_path}`
   - If the file does not exist, determine "tasks.md does not exist or is empty"
   - Same if the file is empty or contains no tasks (`- [ ]` / `- [x]`)
4. Identify incomplete tasks (`- [ ]`)
5. If all tasks are complete (`- [x]`), determine "all tasks complete"
6. If there are incomplete tasks:
   a. Estimate the implementation scope of each task (number of files changed, complexity)
   b. Investigate the code to identify the impact scope
   c. Determine the batch:
      - Group tasks that touch the same files into the same batch
      - Limit each batch to a range where related source code fits in context
7. Decide the implementation approach
   - Cross-check against knowledge and policy constraints

**Batch size determination criteria (both conditions must be met):**

Condition 1: Context limit (maximum tasks whose related code fits in context)
- Small (1-2 files changed): Up to 8 tasks
- Medium (3-5 files changed): Up to 3 tasks
- Large (6+ files changed): Up to 1 task

Condition 2: Minimum workload (lower bound to amortize startup overhead)
- Group tasks so that each batch has an estimated work time of 5+ minutes
- For Small tasks only, include at least 3 tasks per batch
- If remaining incomplete tasks fall below the minimum, group all remaining into one batch

**Required output:**

```markdown
# Batch Execution Plan

## Target Feature
- feature: {feature}
- tasks_path: `.kiro/specs/{feature}/tasks.md`

## Progress
- Completed: {completed task count}/{total task count}
- Not started: {not started task count}

## Current Batch
| Task ID | Task Summary |
|---------|-------------|
| X.X | ... |

## Implementation Approach
{Implementation strategy for tasks in the batch}

## Implementation Guidelines
- {Guidelines the Coder should follow}
- When tasks can be parallelized, leverage the CLI agent's internal parallel processing capabilities
```
