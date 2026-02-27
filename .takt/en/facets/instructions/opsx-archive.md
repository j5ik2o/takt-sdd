Archive a completed OpenSpec change.

**What to do:**

1. Identify the change name from the task description
   - If a name is provided, use it directly
   - If not, check `openspec/changes/` for active changes (exclude `archive/` directory)
   - If only one active change exists, use it automatically
   - If multiple exist, list them and ABORT requesting the user to specify

2. Check artifact completion status
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>" --json
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

5. Perform the archive
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   Check if target already exists:
   - If yes: ABORT with error, suggest renaming existing archive
   - If no: Move the change directory
   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

6. Verify the archive was successful
   Confirm the directory exists at the new location and the original is gone.

**Critical rules:**

- Always check artifact and task completion status before archiving
- Never block archive on warnings - include them in the report
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- Use YYYY-MM-DD prefix for archive directory naming
- If target archive directory already exists, ABORT rather than overwriting
