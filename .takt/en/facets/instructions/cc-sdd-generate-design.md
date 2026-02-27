Generate a technical design and discovery log based on the requirements document.

**Note:** ABORT if requirements do not exist at `.kiro/specs/{feature}/requirements.md`.

**What to do:**
1. Identify the target feature name from the task
2. Read `.kiro/specs/{feature}/spec.json` and verify `approvals.requirements.generated` is `true`; otherwise ABORT with a message that requirements have not been generated
3. Read `.kiro/specs/{feature}/requirements.md`
4. If `.kiro/specs/{feature}/gap-analysis.md` exists, read it and reflect the gap analysis results in the design (recommended approaches and effort/risk estimates go into `design.md`; items requiring investigation go into `research.md`)
5. If `.kiro/steering/` exists, read all files
6. Conduct the discovery process:
   - Investigate relevant parts of the existing codebase
   - Identify integration points and existing patterns
   - Review external documentation and API references as needed
7. Record discovery results in `research.md`
8. Generate the technical design:
   - Architecture overview
   - Components and interface definitions
   - Data model
   - Requirements traceability table
   - Error handling strategy
   - Test strategy
9. Save the artifacts
10. Update `.kiro/specs/{feature}/spec.json`: set `phase` to `"design-generated"`, `approvals.design.generated` to `true`, `approvals.requirements.approved` to `true`, update `updated_at`

**Artifact destination:**
- `.kiro/specs/{feature}/design.md`
- `.kiro/specs/{feature}/research.md`

**Required output (include these headings)**

## Overview
- Purpose, target users, impact scope

## Architecture
- Patterns, boundary map, technology stack

## Components and Interfaces
- Summary table + details for each component

## Data Model
- Domain model, logical data model

## Requirements Traceability
- Mapping table: Requirement ID -> Component -> Interface

## Test Strategy
- Unit, integration, E2E policies
