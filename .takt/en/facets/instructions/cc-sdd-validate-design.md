Conduct a quality review of the technical design document and make a GO/NO-GO determination.

**Note:** ABORT if no design exists at `.kiro/specs/{feature}/design.md`.

**What to do:**
1. Identify the target feature name from the task
2. Read `.kiro/specs/{feature}/spec.json` and verify `approvals.design.generated` is `true`; otherwise ABORT with a message that design has not been generated
3. Read `.kiro/specs/{feature}/requirements.md`
4. Read `.kiro/specs/{feature}/design.md`
5. If `.kiro/steering/` exists, read all files
6. Conduct the review:
   - Verify consistency with the existing architecture
   - Verify design coherence and standards compliance
   - Evaluate extensibility and maintainability
   - Verify type safety and interface design
7. Narrow critical issues to a maximum of 3
8. For each issue, provide linkage to requirement IDs and evidence from the design document
9. Acknowledge 1-2 strengths as well
10. Make a GO/NO-GO determination

**Required output (include these headings)**

## Review Summary
- Summarize design quality and readiness in 2-3 sentences

## Critical Issues (maximum 3)
- Issue, impact, improvement suggestion, traceability (requirement ID), evidence (design section)

## Design Strengths
- 1-2 points

## Final Determination
- GO / NO-GO, rationale, next steps
