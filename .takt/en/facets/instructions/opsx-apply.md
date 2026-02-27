Implement tasks from an OpenSpec change.

**What to do:**

1. Identify the change name from the task description
   - If a name is provided, use it directly
   - If not, check `openspec/changes/` for active changes
   - If only one active change exists, use it automatically

2. Check status to understand the schema
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - Which artifacts are complete

3. Get apply instructions
   ```bash
   bash scripts/opsx-cli.sh instructions apply --change "<name>" --json
   ```
   This returns:
   - Context file paths
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   Handle states:
   - If `state: "blocked"` (missing artifacts): report and ABORT
   - If `state: "all_done"`: report completion and COMPLETE
   - Otherwise: proceed to implementation

4. Read context files
   Read the files listed in `contextFiles` from the apply instructions output.

5. Implement tasks (loop until done or blocked)

   For each pending task:
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` -> `- [x]`
   - Continue to next task

   Stop if:
   - Task is unclear (report the ambiguity)
   - Implementation reveals a design issue (report it)
   - Error or blocker encountered (report it)

6. Show final status
   Display tasks completed and overall progress.

**Critical rules:**

- Always read context files before starting implementation
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Use contextFiles from CLI output, don't assume specific file names
- If blocked or encountering issues, report clearly and ABORT rather than guessing
