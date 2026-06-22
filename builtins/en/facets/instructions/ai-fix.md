Apply fixes based on the AI review findings.

**Note:** Because `pass_previous_response: false`, read the findings from the report directory.

**What to do:**
1. Read `04-ai-review.md`
2. ABORT if the review report does not exist
3. List all findings marked `new` or `persists`
4. For each finding, either fix it or provide a technical reason why no fix is needed
5. If you make a code change, run an appropriate test or verification command for the affected area
6. Do not conclude with "fix complete" while failures remain

**Judgment criteria:**
- All findings fixed -> `AI issue fix complete`
- Findings are incorrect and you can justify that -> `Fix not needed (target file/spec verified)`
- You cannot determine the correct action -> `Unable to determine, insufficient information`
