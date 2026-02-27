Generate an EARS-format requirements document from the given task description.

**Note:** If an existing specs directory exists, add to or update the existing requirements rather than overwriting them.

**What to do:**
1. Identify the target feature name from the task
2. If the `.kiro/steering/` directory exists, read all files to understand the project context
3. Check whether a directory for the target feature exists under `.kiro/specs/` (create if it does not exist)
4. Check `.kiro/specs/{feature}/spec.json`:
   - If it does not exist, create it with: `feature_name` = feature name, `created_at` / `updated_at` = current ISO 8601 timestamp, `language` = `"en"`, `phase` = `"initialized"`, `approvals.requirements` / `approvals.design` / `approvals.tasks` each = `{ "generated": false, "approved": false }`, `ready_for_implementation` = `false`
   - If it exists, verify `phase` is `"initialized"` or `"requirements-generated"`; otherwise ABORT with a message indicating the unexpected phase
5. Inspect the existing codebase and determine whether existing implementation for the target feature exists
6. Analyze the task description and extract functional and non-functional requirements
7. Create EARS-format acceptance criteria for each requirement
8. Cover normal cases, error cases, and boundary conditions
9. Identify dependencies between requirements
10. Save the artifact to `.kiro/specs/{feature}/requirements.md`
11. Update `.kiro/specs/{feature}/spec.json`: set `phase` to `"requirements-generated"`, `approvals.requirements.generated` to `true`, update `updated_at`

**Artifact destination:**
- Directory: `.kiro/specs/{feature}/` (create if it does not exist)
- File: `requirements.md`

**Required output (include these headings)**

## Introduction
- Describe the feature overview and purpose in 1-2 paragraphs

## Implementation Context
- Explicitly state whether existing implementation exists (`yes`/`no`)
- Provide 1-3 lines of evidence (checked code paths, files, or directories)

## Requirements
- Separate into sections for each requirement
- Include a purpose statement and acceptance criteria for each requirement
- Requirement IDs are numeric only (1, 1.1, 2, 2.1 ...)
