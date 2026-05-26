```markdown
# OpenSpec Implementation Validation: {change name}

## Verdict
- {検証合格 / 検証不合格}

## Summary
{Summarize the validation result in 1-2 sentences}

## Task Completion Status
| Task | Status |
|------|--------|
| {task from tasks.md} | Complete / Incomplete |

## Requirements Coverage
- If `openspec/changes/{change}/specs/` exists:
  | Requirement | Implementation | Test | Notes |
  |-------------|----------------|------|-------|
  | {Requirement / Scenario} | OK / NG | OK / NG | {notes} |
- If `specs/` does not exist:
  - Use `proposal.md`, `design.md`, and `tasks.md` as the basis for checking each task's acceptance condition and matching tests

## Design Consistency
| Aspect | Result | Notes |
|--------|--------|-------|
| Consistent with proposal.md | OK / NG | {notes} |
| Consistent with design.md | OK / NG | {notes} |
| Consistent with tasks.md | OK / NG | {notes} |

## Test Results
- Command: {command}
- Result: Success / Failure

## Outstanding Items
- {list incomplete items if any}
```

**Cognitive load reduction rules:**
- 検証合格 -> Summary, task completion status, and verdict only (10 lines or fewer)
- 検証不合格 -> Fill all sections (30 lines or fewer)
