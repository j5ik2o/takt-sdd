Generate an implementation task list based on the requirements and design.

**Note:** ABORT if requirements and design do not exist in `.kiro/specs/{feature}/`.

**What to do:**
1. Identify the target feature name from the task
2. Read `.kiro/specs/{feature}/requirements.md`
3. Read `.kiro/specs/{feature}/design.md`
4. If `.kiro/specs/{feature}/research.md` exists, read it
5. Decompose design components into implementation tasks:
   - Verify that all requirements are mapped to tasks
   - Verify that all design components are covered
   - Analyze dependencies between tasks
6. Add `(P)` markers to tasks that can be executed in parallel
7. Save the artifact

**Artifact destination:**
- `.kiro/specs/{feature}/tasks.md`

**Required output**

A checkbox-format task list. Each task includes:
- A natural language behavior description (no file paths or function names)
- Detail items (bullet points)
- Requirements mapping (`_Requirements: X.X, Y.Y_`)
- `(P)` marker if parallelizable

```markdown
- [ ] 1. Major task overview
- [ ] 1.1 (P) Subtask description
  - Detail item 1
  - Detail item 2
  - _Requirements: 1.1, 1.2_
```
