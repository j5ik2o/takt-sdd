Generate a technical design and discovery log based on the requirements document.

**Note:** ABORT if requirements do not exist at `.kiro/specs/{feature}/requirements.md`.

**What to do:**
1. Identify the target feature name from the task
2. Read `.kiro/specs/{feature}/requirements.md`
3. If `.kiro/specs/{feature}/gap-analysis.md` exists, read it and reflect the gap analysis results in the design (recommended approaches and effort/risk estimates go into `design.md`; items requiring investigation go into `research.md`)
4. If `.kiro/steering/` exists, read all files
5. Conduct the discovery process:
   - Investigate relevant parts of the existing codebase
   - Identify integration points and existing patterns
   - Review external documentation and API references as needed
6. Record discovery results in `research.md`
7. Generate the technical design:
   - Architecture overview
   - Components and interface definitions
   - Data model
   - Requirements traceability table
   - Error handling strategy
   - Test strategy
8. Save the artifacts

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
