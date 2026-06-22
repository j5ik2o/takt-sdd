Arbitrate findings where the AI reviewer and the fixer disagree.

## Do Not
- Do not run build or test commands. Arbitration is limited to fact-checking and technical judgment.

## Do
1. Read `04-ai-review.md`
2. Read the fixer's reasoning from Previous Response
3. Inspect the relevant code for each finding
4. Compare the reviewer and fixer claims against the implementation, spec, and rules
5. Decide, finding by finding, whether the reviewer or the fixer is correct

## Final Decision
- If at least one reviewer finding is valid -> `ai_review findings are valid (should fix)`
- If all fixer judgments are valid -> `ai_fix judgment is valid (no fix needed)`
