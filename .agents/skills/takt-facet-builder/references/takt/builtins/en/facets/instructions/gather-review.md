Gather information about the review target and produce a report for reviewers to reference.

## Auto-detect review mode

Analyze the task text and determine which mode to use.

### Mode 1: PR mode
**Trigger:** Task contains PR references like `#42`, `PR #42`, `pull/42`, or a URL with `/pull/`
**Steps:**
1. Extract the PR number
2. Run `gh pr view {number}` to get title, description, labels
3. Run `gh pr diff {number}` to get the diff
4. Compile the changed files list
5. Extract purpose and requirements from the PR description
6. If linked Issues exist, retrieve them with `gh issue view {number}`
   - Extract Issue numbers from "Closes #N", "Fixes #N", "Resolves #N"
   - Collect Issue title, description, labels, and comments

### Mode 2: Branch mode
**Trigger:** The normalized task text exactly matches one branch name found in `git branch -a`. This includes names with `/` (e.g., `feature/auth`) as well as simple names (e.g., `develop`, `release-v2`, `hotfix-login`).
**Steps:**
1. Run `git branch -a` and inspect the branch list yourself. Never interpolate raw task text into shell commands.
2. Normalization is limited to trimming surrounding whitespace, removing wrapping quotes/backticks, and stripping a leading `origin/` prefix. Do not do partial matching or heuristic guessing beyond that.
3. Use Branch mode only when the normalized text exactly matches one branch name from the branch list.
4. If there is no exact match, multiple plausible candidates, or the branch name only appears as part of explanatory prose, do not guess. Fall back to Current diff mode.
5. Determine the base branch (default: `main`, fallback: `master`)
6. Use only the branch name confirmed in step 3 when running `git log {base}..{branch} --oneline` to get commit history
7. Use only the branch name confirmed in step 3 when running `git diff {base}...{branch}` to get the diff
8. Compile the changed files list
9. Extract purpose from commit messages
10. If a PR exists for the branch, fetch it with `gh pr list --head {branch}` using only the branch name confirmed in step 3

### Mode 3: Current diff mode
**Trigger:** Task does not match Mode 1 or Mode 2 (e.g., "review current changes", "last 3 commits", "current diff")
**Steps:**
1. If the task specifies a count (e.g., "last N commits"), extract N. Otherwise default to N=1
2. Run `git diff` for unstaged changes and `git diff --staged` for staged changes
3. If both are empty, run `git diff HEAD~{N}` to get the diff for the last N commits
4. Run `git log --oneline -{N+10}` for commit context
5. Compile the changed files list
6. Extract purpose from recent commit messages

## Report requirements
- Regardless of mode, the output report must follow the same format
- Fill in what is available; mark unavailable sections as "N/A"
- Always include: review target overview, purpose, changed files, and the diff
