```markdown
# E2E Coverage Plan

## Project Overview
{Tech stack, E2E test framework, test execution commands}

## User Operation Entry Points
| # | Entry Point | Type | Handler |
|---|-------------|------|---------|
| 1 | {command/route/endpoint} | CLI/Web/API | `src/file.ts:42` |

## UX Route Analysis
### {Entry Point Name}
| # | Route | Branch Condition | Existing Test |
|---|-------|-----------------|---------------|
| 1 | {happy path} | - | ✅ `e2e/file.test.ts` / ❌ none |
| 2 | {with option X} | `--flag` | ❌ none |
| 3 | {on error} | {condition} | ❌ none |

## Missing Test Case List
| # | Entry Point | Test Case | Priority | Expected Result to Verify |
|---|-------------|-----------|----------|--------------------------|
| 1 | {entry point} | {case summary} | High/Med/Low | {expected result} |
| 2 | {entry point} | {case summary} | High/Med/Low | {expected result} |

## Test Strategy
- {Mock strategy}
- {Fixture design}
- {Existing helper usage}

## Implementation Guidelines
- {Instructions for test implementer}
```
