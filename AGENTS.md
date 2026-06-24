# AGENTS.md

- すべて日本語でやりとりすること

## Agent skills

Matt Pocock の engineering skills は `CLAUDE.md`及び`AGENTS.md` と `docs/agents/` に設定する。

- Issue tracker: GitHub Issues を使う。詳細は `docs/agents/issue-tracker.md` を見る。
- Triage labels: mattpocock/skills の default labels を使う。詳細は `docs/agents/triage-labels.md` を見る。
- Domain docs: single-context repo として root `CONTEXT.md` と `docs/adr/` を使う。詳細は `docs/agents/domain.md` を見る。

## Domain / Spec Decision Preflight

Kiro / SDD / OpenSpec / 設計レビュー / 実装計画に入る前に、必ず以下を設計判断の入力として確認する。

- root `CONTEXT.md`: canonical terms / avoid terms / invariants
- root `CONTEXT-MAP.md` があれば関連 context
- `docs/adr/`: 既に受け入れられた不可逆な設計判断
- `.kiro/steering/`: project-wide steering / product / tech / structure
- `.kiro/specs/**`: feature-level requirements / design / tasks
- `openspec/**`: public contract / capability-level requirements

`CONTEXT.md` の canonical terms / avoid terms / invariants、ADR の制約、Kiro / OpenSpec の仕様は、requirements / design / tasks / review / implementation の前提として扱う。

未定義のドメイン用語を見つけた場合は、直接 `CONTEXT.md` に追加せず、`/domain-modeling` または `/grill-with-docs` 経由で用語を確定する。

既存 ADR と矛盾する spec / design を見つけた場合は、黙って上書きせず矛盾を明示する。

ADR は spec の台帳ではない。Kiro / OpenSpec に、不可逆・非自明・trade-off を伴う設計判断が含まれる場合のみ `/domain-modeling` 経由で ADR 化を検討する。

## Domain / Spec Terminology Reconciliation

Kiro / SDD / OpenSpec の requirements / design / tasks / review を生成または更新した後は、次の phase、design validation、implementation、PR 化へ進む前に、必ず spec 内のドメイン用語・契約名・境界名を `CONTEXT.md` と照合する。

- `CONTEXT.md` に未登録のプロジェクト固有のドメイン用語、契約名、境界名を見つけた場合は、glossary gap として扱い、`/domain-modeling` または `/grill-with-docs` 経由で用語を確定してから `CONTEXT.md` に登録する。
- ただし、一般的な技術語、ファイル名、関数名、単発の実装詳細、一次的な作業ラベルは `CONTEXT.md` に登録しない。
- spec 側で同じ概念を `CONTEXT.md` と異なる表記で書いている場合は、spec を `CONTEXT.md` の canonical term に合わせて修正する。
- tasks 生成前、design validation 前、implementation 前、PR 化前には、この照合が完了していることを確認する。

## Review exclusion settings

- 人間の明示的な許可なしに `.coderabbit.yml` / `.coderabbit.yaml` を変更しないこと。
- `.coderabbit.yml` / `.coderabbit.yaml` の `reviews.path_filters` に書かれた対象はレビューしたり変更しないこと。

## Code Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### 5. Rules

Read these rules before implementing:

.agents/rules/**/*.md

---

ref @CC-SDD-CODEX.md
