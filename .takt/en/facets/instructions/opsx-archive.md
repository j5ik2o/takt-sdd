Archive a completed OpenSpec change.

**What to do:**

1. Identify the change name from the task description
   - If a name is provided, use it directly
   - If not, check `openspec/changes/` for active changes (exclude `archive/` directory)
   - If only one active change exists, use it automatically
   - If multiple exist, list them and ABORT requesting the user to specify

2. Check artifact completion status
   ```bash
   ./node_modules/.bin/openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status

   If any artifacts are not `done`, note this as a warning but continue.

3. Check task completion status
   Read the tasks file (typically `tasks.md` in the change directory).
   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).
   If incomplete tasks found, note this as a warning but continue.

4. Assess delta spec sync state
   Check for delta specs at `openspec/changes/<name>/specs/`.
   If none exist, skip to step 5.

   If delta specs exist:
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Note what changes would be applied (adds, modifications, removals)
   - Include sync status in the summary report

5. Perform the archive with the official lifecycle command
   ```bash
   ./node_modules/.bin/openspec archive "<name>" --yes
   ```
   This validates the change, syncs delta specs into `openspec/specs/`, and moves the change into
   `openspec/changes/archive/YYYY-MM-DD-<name>/`.

6. Verify the archive was successful
   Confirm the change no longer appears in `./node_modules/.bin/openspec list` and the archive directory exists.

**Critical rules:**

- Always check artifact and task completion status before archiving
- Never block archive on warnings - include them in the report
- `./node_modules/.bin/openspec archive --yes` is the source of truth for sync + archive behavior
- Preserve .openspec.yaml in the archived change directory
