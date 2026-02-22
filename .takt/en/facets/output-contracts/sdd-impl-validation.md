```markdown
# Implementation Validation: {feature name}

## Result: APPROVE / REJECT

## Summary
{Summarize validation results in 1-2 sentences}

## Task Completion Status
| Task | Status |
|------|--------|
| {task ID} {overview} | Complete / Incomplete |

## Requirements Coverage
| Requirement ID | Implementation | Tests | Notes |
|----------------|---------------|-------|-------|
| {ID} | OK / NG | OK / NG | {notes} |

## Design Conformance
| Aspect | Result | Notes |
|--------|--------|-------|
| Component structure | OK / NG | {notes} |
| Interface compliance | OK / NG | {notes} |
| Data model consistency | OK / NG | {notes} |

## Test Results
- New tests: {passed}/{total}
- Existing tests: {passed}/{total} (no regressions)

## Outstanding Items
- {list any incomplete items}
```

**Cognitive load reduction rules:**
- APPROVE -> Summary and task completion status only (10 lines or fewer)
- REJECT -> All sections filled out (30 lines or fewer)
