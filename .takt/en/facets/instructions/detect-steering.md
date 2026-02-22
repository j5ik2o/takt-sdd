Check the status of `.kiro/steering/` and determine the execution mode.

**What to do:**
1. Check whether the `.kiro/steering/` directory exists
2. Check whether core files (`product.md`, `tech.md`, `structure.md`) are present
3. Determine the mode based on the following criteria

**Determination criteria:**

| Condition | Mode |
|-----------|------|
| Directory does not exist | Bootstrap |
| Any core file (product.md, tech.md, structure.md) is missing | Bootstrap |
| All core files exist | Sync |

**Information to include in the report:**
- Detected mode (Bootstrap / Sync)
- List of existing steering files
- List of missing core files (if Bootstrap)
