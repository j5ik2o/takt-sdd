# AI Review Instructions

## Do Not
- Do not run build or test commands. This step is review-only; execution-based verification belongs to `implement` and `fix`.

## Do
1. Inspect the target files for AI-generated-code issues:
   - hallucinated APIs
   - nonexistent imports or paths
   - over-abstraction
   - unused code
   - backward-compatibility additions that were not requested
2. Extract any previously open findings from Previous Response and assign each one a `finding_id`
3. Classify each finding as `new`, `persists`, or `resolved`
4. If at least one blocking issue exists, return `REJECT`; otherwise return `APPROVE`

## Required Output
1. State the evidence for each finding
2. End with `APPROVE` or `REJECT`
3. If `REJECT`, include a suggested fix with file/line references
