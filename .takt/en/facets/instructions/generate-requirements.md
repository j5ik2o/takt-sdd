Generate an EARS-format requirements document from the given task description.

**Note:** If an existing specs directory exists, add to or update the existing requirements rather than overwriting them.

**What to do:**
1. Identify the target feature name from the task
2. If the `.kiro/steering/` directory exists, read all files to understand the project context
3. Check whether a directory for the target feature exists under `.kiro/specs/`
4. Inspect the existing codebase and determine whether existing implementation for the target feature exists
5. Analyze the task description and extract functional and non-functional requirements
6. Create EARS-format acceptance criteria for each requirement
7. Cover normal cases, error cases, and boundary conditions
8. Identify dependencies between requirements
9. Save the artifact to `.kiro/specs/{feature}/requirements.md`

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
