Capture the key insights from the exploration session as a memo file.

**What to do:**

1. Review the exploration conversation and identify:
   - Key findings and insights
   - Decisions made (with rationale)
   - Open questions that remain
   - Suggested next steps

2. Derive a topic name from the conversation
   - Use kebab-case (e.g., `caching-strategy`, `auth-flow-redesign`)
   - Keep it concise and descriptive

3. Ensure the output directory exists
   ```bash
   mkdir -p openspec/explorations
   ```

4. Write the exploration memo to `openspec/explorations/<topic>.md`
   - Use the output contract format
   - Be concise — capture essence, not transcript
   - Focus on actionable insights, not the discussion process

5. Confirm the file was written successfully

**Rules:**
- If the exploration yielded no significant insights, write a minimal memo noting that
- Do not include verbatim conversation — synthesize
- Keep each section focused and scannable
