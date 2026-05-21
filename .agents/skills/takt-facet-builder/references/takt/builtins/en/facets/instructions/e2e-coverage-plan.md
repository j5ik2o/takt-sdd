Comprehensively identify all user operation routes in the application and create a list of missing E2E test cases.

**Note:** If Previous Response exists, this is a resubmission.
Review and revise the list based on that feedback.

**What to do:**

1. **Understand the E2E test infrastructure**
   - Review existing E2E test directory structure, test runner, helpers, fixtures, and mock strategy
   - Identify the test execution commands

2. **Identify user operation entry points** (read CODE, not just documentation)
   - For CLI: extract command definitions, subcommands, and options from code
   - For Web: extract routing definitions, page transitions, and API endpoints from code
   - Trace each entry point's handler and processing flow, identifying branches and state transitions

3. **Deep-dive into UX variations**
   - For each entry point, enumerate all possible routes a user can take
   - Option/flag combinations that create different branches (e.g., `--pipeline` on/off, `--auto-pr` on/off)
   - State-dependent branches (first run vs existing data, config present vs absent)
   - Not just happy paths — error handling and recovery routes when things fail midway
   - Permission/role-based routes
   - External dependency state branches (connection success vs failure, normal vs abnormal response)

4. **Cross-reference with existing E2E tests**
   - Analyze what existing tests cover on a per-file basis
   - Identify which routes are already covered by existing tests
   - List uncovered routes as "missing test cases"

5. **Create the test case list**
   - Assign a unique number to every test case (this is the ledger supervisor uses for verification)
   - Assign priority to each case (user impact × untested risk)
   - **Do NOT abbreviate.** Don't stop at 1-2 cases — enumerate ALL identified routes

**Strictly prohibited:**
- Reading only docs/README and guessing test cases → PROHIBITED. Read the code
- Cutting the list short with "there might be more" → PROHIBITED. Enumerate all
- Including cases already covered by existing tests → PROHIBITED. Only list verified gaps
