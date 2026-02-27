Create a new OpenSpec change and generate all required artifacts in one step.

**What to do:**

1. Identify the change name from the task description
   - If the task contains a kebab-case name, use it directly
   - Otherwise, derive a kebab-case name from the description (e.g., "add user authentication" -> `add-user-auth`)

2. Create the change directory
   ```bash
   bash scripts/opsx-cli.sh new change "<name>"
   ```
   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

3. Get the artifact build order
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation
   - `artifacts`: list of all artifacts with their status and dependencies

4. Create artifacts in sequence until apply-ready

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. For each artifact that is `ready` (dependencies satisfied):
      - Get instructions:
        ```bash
        bash scripts/opsx-cli.sh instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `outputPath`: Where to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - Create the artifact file using `template` as the structure
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file

   b. After creating each artifact, re-run `bash scripts/opsx-cli.sh status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

5. Show final status
   ```bash
   bash scripts/opsx-cli.sh status --change "<name>"
   ```

**Critical rules:**

- Follow the `instruction` field from `bash scripts/opsx-cli.sh instructions` for each artifact type
- Use `template` as the structure for your output file - fill in its sections
- `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
- The instructions JSON includes `context` and `rules` from `openspec/config.yaml`
- Read dependency artifacts before creating new ones
- If a change with that name already exists, report and ABORT
- Verify each artifact file exists after writing before proceeding to next
