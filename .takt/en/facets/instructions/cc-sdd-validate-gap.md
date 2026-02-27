Analyze the gap between requirements and the existing codebase to inform the implementation strategy.

**Note:** ABORT if requirements do not exist at `.kiro/specs/{feature}/requirements.md`.

**What to do:**
1. Identify the target feature name from the task
2. Read `.kiro/specs/{feature}/spec.json` and verify `approvals.requirements.generated` is `true`; otherwise ABORT with a message that requirements have not been generated
3. Read `.kiro/specs/{feature}/requirements.md`
4. If `.kiro/steering/` exists, read all files
5. Investigate the current state:
   - Understand the domain-related files, modules, and directory structure
   - Identify reusable components
   - Extract architecture patterns and conventions
   - Identify integration surfaces
6. Analyze requirements feasibility:
   - List technical needs
   - Identify gaps and constraints
   - Record complexity signals
7. Evaluate implementation approaches:
   - A: Extend existing -- pros and cons
   - B: Build new -- pros and cons
   - C: Hybrid -- pros and cons
8. Estimate effort (S/M/L/XL) and risk (High/Medium/Low)
9. Save the artifact to `.kiro/specs/{feature}/gap-analysis.md`

**Artifact destination:**
- `.kiro/specs/{feature}/gap-analysis.md`

**Required output (include these headings)**

## Summary
- Summarize scope, challenges, and recommendations in 3-5 bullet points

## Requirements-Asset Mapping
- Tag gaps (Missing / Unknown / Constraint)

## Implementation Approaches
- Options A/B/C with rationale and tradeoffs

## Effort and Risk
- Effort label and risk label, each with a one-line rationale

## Recommendations for the Design Phase
- Recommended approach and items requiring investigation
