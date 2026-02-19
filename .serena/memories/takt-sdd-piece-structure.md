# Takt SDD Piece Configuration Analysis

## Executive Summary

This document provides a complete overview of the takt SDD piece configurations, focusing on design-related pieces and how they chain together. The analysis covers movement structure, rules, error handling patterns, and recommendations for implementing a "fix-design" or revision workflow.

---

## 1. All Design-Related Pieces in the Project

### Main Piece Files Located At:
- **Project root**: `/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/takt-sdd/.takt/pieces/`
- **Test project**: `/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/takt-sdd/tests/qgrep/.takt/pieces/`
- **Reference**: `/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/takt-sdd/references/okite-ai/.takt/pieces/`

### Design-Related Piece Files:

1. **sdd-design.yaml** - SDD Phase 2: Generate technical design and discovery logs
   - Single movement: `generate-design`
   - Output: `design.md`, `research.md`
   - Rules: COMPLETE on success, ABORT if requirements not found

2. **sdd-validate-design.yaml** - SDD (Optional): Quality review of technical design with GO/NO-GO decision
   - Single movement: `validate-design`
   - Output: `design-review.md`
   - Rules: COMPLETE on GO, ABORT on NO-GO
   - **Key point**: ABORT terminates the piece (no re-attempt within piece)

3. **sdd.yaml** - Full SDD Workflow (Master piece)
   - Includes `generate-design` and `validate-design` movements
   - validate-design → NO-GO routes back to `generate-design` (NOT ABORT)
   - Complete pipeline: requirements → gap-analysis → design → validate-design → tasks → implementation → review

4. **sdd-requirements.yaml** - SDD Phase 1: Generate requirements in EARS format
   - Single movement: `generate-requirements`

5. **sdd-validate-gap.yaml** - SDD (Optional): Gap analysis between requirements and existing codebase
   - Single movement: `validate-gap`

6. **sdd-tasks.yaml** - SDD Phase 3: Generate implementation task list
   - Single movement: `generate-tasks`

---

## 2. Design Phase Movement Structure in Detail

### sdd-design.yaml (Generate Phase)

```yaml
name: sdd-design
max_movements: 15
initial_movement: generate-design

movements:
  - name: generate-design
    edit: true
    persona: planner
    policy: sdd-design
    instruction: generate-design
    output_contracts:
      report:
        - name: design.md
          format: sdd-design
        - name: research.md
          format: sdd-research
    rules:
      - condition: "設計完了、発見記録あり"
        next: COMPLETE
      - condition: "要件が見つからない、設計不可"
        next: ABORT
        appendix: |
          原因:
          - {問題点}
```

**Key Characteristics:**
- Max 15 movements allowed (for iteration within this piece)
- Can edit files (`edit: true`)
- Persona: planner
- Policy: sdd-design (focuses on architecture, components, interfaces)
- Knowledge: architecture, design-discovery
- Rules: 2 conditions only (success → COMPLETE, failure → ABORT)

---

### sdd-validate-design.yaml (Review Phase)

```yaml
name: sdd-validate-design
max_movements: 10
initial_movement: validate-design

movements:
  - name: validate-design
    edit: false  # Read-only
    persona: architecture-reviewer
    policy: sdd-design-review
    instruction: validate-design
    output_contracts:
      report:
        - name: design-review.md
          format: sdd-design-review
    rules:
      - condition: "GO（設計品質十分）"
        next: COMPLETE
      - condition: "NO-GO（重大な問題あり）"
        next: ABORT
        appendix: |
          重大な問題:
          - {問題の要約}
      - condition: "設計が見つからない"
        next: ABORT
```

**Key Characteristics:**
- Read-only (`edit: false`)
- Persona: architecture-reviewer
- Policy: sdd-design-review (quality criteria, GO/NO-GO judgment)
- 3 rule conditions: GO, NO-GO, Missing Design
- **CRITICAL**: Both NO-GO and missing design route to ABORT (piece failure)

---

### sdd.yaml (Master Piece with Chaining)

The master `sdd.yaml` piece demonstrates the **correct pattern for iteration**:

```yaml
movements:
  - name: generate-design
    edit: true
    persona: planner
    policy: sdd-design
    knowledge: [architecture, design-discovery]
    rules:
      - condition: "設計完了、発見記録あり"
        next: validate-design  # → Validate, not COMPLETE
      - condition: "要件が見つからない、設計不可"
        next: ABORT

  - name: validate-design
    edit: false
    persona: architecture-reviewer
    policy: sdd-design-review
    rules:
      - condition: "GO（設計品質十分）"
        next: generate-tasks  # Continue pipeline
      - condition: "NO-GO（重大な問題あり）"
        next: generate-design  # ← RE-ATTEMPT (key pattern!)
      - condition: "設計が見つかない"
        next: ABORT
```

**Critical Difference:**
- In `sdd.yaml`, NO-GO from validate-design → `generate-design` (re-attempt)
- In `sdd-validate-design.yaml`, NO-GO → `ABORT` (piece fails)
- This allows within-piece retry loops

---

## 3. How Movement Routing Works

### Rule Evaluation (5-Stage Fallback)

From takt engine documentation:

1. **Aggregate** (`all()`/`any()`) - For parallel parent steps
2. **Phase 3 tag** - `[STEP:N]` tag from status judgment output
3. **Phase 1 tag** - `[STEP:N]` tag from main execution output (fallback)
4. **AI judge (ai() only)** - AI evaluates `ai("condition text")` rules
5. **AI judge fallback** - AI evaluates ALL conditions as final resort

### Phase 3 Execution (Status Judgment)

The instruction builder auto-injects status output rules, allowing agents to output a `[STEP:0]` or `[STEP:1]` tag to indicate which condition was matched.

---

## 4. Special `next` Values

| Value | Meaning | Effect |
|-------|---------|--------|
| `COMPLETE` | Success | Piece ends successfully |
| `ABORT` | Failure | Piece ends with failure |
| `step-name` | Continue | Transition to named movement |

---

## 5. Existing "Fix" Pattern in sdd.yaml

The master piece demonstrates a robust **fix/iterate cycle pattern** used throughout the workflow:

### Example: Review → Fix Cycle

```yaml
movements:
  - name: reviewers
    parallel:
      - name: arch-review
        rules:
          - condition: approved
          - condition: needs_fix
      - name: qa-review
        rules:
          - condition: approved
          - condition: needs_fix
      - name: impl-validation
        rules:
          - condition: 検証合格
          - condition: 検証不合格
    rules:
      - condition: all("approved", "approved", "検証合格")
        next: supervise
      - condition: any("needs_fix", "検証不合格")
        next: fix

  - name: fix
    edit: true
    persona: coder
    policy: [coding, testing]
    rules:
      - condition: "修正完了"
        next: reviewers  # Loop back
      - condition: "判断できない、情報不足"
        next: plan
```

### Loop Monitoring

To prevent infinite loops, `sdd.yaml` uses `loop_monitors`:

```yaml
loop_monitors:
  - cycle: [reviewers, fix]
    threshold: 3
    judge:
      persona: supervisor
      instruction_template: |
        レビュー・修正サイクルが {cycle_count} 回繰り返されました。
        
        **判断基準:**
        - 各サイクルで新しい問題が発見・修正されているか
        - 同じ指摘が繰り返されていないか
      rules:
        - condition: "健全（進捗あり）"
          next: fix
        - condition: "非生産的（改善なし）"
          next: supervise
```

**Key Points:**
- After N cycles (threshold: 3), a supervisor reviews progress
- If progress detected → allow next iteration
- If no progress → escalate to next phase

---

## 6. Recommended Pattern: "Fix Design" Workflow

### Option A: Add Movement to Existing sdd-design.yaml

**RECOMMENDED** - Matches existing patterns in the codebase.

```yaml
name: sdd-design
max_movements: 20  # Increased from 15

movements:
  - name: generate-design
    edit: true
    persona: planner
    policy: sdd-design
    instruction: generate-design
    output_contracts:
      report:
        - name: design.md
          format: sdd-design
        - name: research.md
          format: sdd-research
    rules:
      - condition: "設計完了、発見記録あり"
        next: validate-design  # Change from COMPLETE
      - condition: "要件が見つからない、設計不可"
        next: ABORT

  - name: validate-design
    edit: false
    persona: architecture-reviewer
    policy: sdd-design-review
    instruction: validate-design
    output_contracts:
      report:
        - name: design-review.md
          format: sdd-design-review
    rules:
      - condition: "GO（設計品質十分）"
        next: COMPLETE
      - condition: "NO-GO（重大な問題あり）"
        next: fix-design  # Instead of ABORT
      - condition: "設計が見つからない"
        next: ABORT

  - name: fix-design
    edit: true
    persona: planner
    policy: sdd-design
    knowledge: [architecture, design-discovery]
    pass_previous_response: false  # Use reports as primary source
    instruction: fix-design  # New instruction
    output_contracts:
      report:
        - name: design.md
          format: sdd-design
    rules:
      - condition: "修正完了、改善対応"
        next: validate-design  # Loop back to review
      - condition: "修正不可、要件の問題"
        next: ABORT

loop_monitors:
  - cycle: [validate-design, fix-design]
    threshold: 3
    judge:
      persona: supervisor
      instruction_template: |
        設計レビュー・修正サイクルが {cycle_count} 回繰り返されました。
        
        **参照するレポート:**
        - 設計レビュー: {report:design-review.md}
        - 現在の設計: {report:design.md}
        
        **判断基準:**
        - 各サイクルで新しい問題が発見・修正されているか
        - 同じ指摘が繰り返されていないか
      rules:
        - condition: "健全（進捗あり）"
          next: fix-design
        - condition: "非生産的（改善なし）"
          next: ABORT
```

---

### Option B: Standalone "sdd-fix-design" Piece

For a separate piece file:

```yaml
name: sdd-fix-design
description: SDD（修正）- NO-GOフィードバックに基づき技術設計を修正し、品質向上を目指す
piece_config:
  provider_options:
    codex:
      network_access: true
    opencode:
      network_access: true
max_movements: 15
initial_movement: fix-design

instructions:
  fix-design: ../instructions/fix-design.md

report_formats:
  sdd-design: ../output-contracts/sdd-design.md
  sdd-design-review: ../output-contracts/sdd-design-review.md

movements:
  - name: fix-design
    edit: true
    persona: planner
    policy: sdd-design
    knowledge: [architecture, design-discovery]
    allowed_tools:
      - Read
      - Glob
      - Grep
      - Write
      - Bash
      - WebSearch
      - WebFetch
    required_permission_mode: edit
    pass_previous_response: false
    instruction: fix-design
    output_contracts:
      report:
        - name: design.md
          format: sdd-design
    rules:
      - condition: "修正完了"
        next: COMPLETE
      - condition: "修正不可、根本的な問題"
        next: ABORT
        appendix: |
          修正が困難な理由:
          - {理由1}
          - {理由2}
```

---

## 7. Instruction Template for fix-design

### Location
Create: `.takt/instructions/fix-design.md`

### Content Template

```markdown
技術設計ドキュメントをレビュー指摘に基づき修正し、品質向上を実現せよ。

**注意:** 修正対象の設計が存在しない場合、またはレビュー結果が見つからない場合はABORTする。

**やること:**

1. タスクから対象feature名を特定する
2. 以下のドキュメントを読み込む:
   - `.kiro/specs/{feature}/requirements.md`（要件）
   - `.kiro/specs/{feature}/design.md`（現在の設計）
   - `.kiro/specs/{feature}/design-review.md`（最新レビュー結果）
   - `.kiro/steering/` 配下の全ファイル（あれば）

3. レビュー指摘を分類する:
   - 根本的な矛盾（修正不可能 → ABORT）
   - 設計の改善可能な問題（修正対象）
   - 実装フェーズで対処可能な問題（注記として残す）

4. 各指摘に対する修正を実施する:
   - アーキテクチャの矛盾を解決
   - コンポーネント設計を改善
   - インターフェース定義を明確化
   - 要件との対応を強化

5. 修正内容をdesign.mdに反映する:
   - 影響を受けたセクションを更新
   - 修正の根拠をコメントで記載
   - 新しい決定事項を明記

6. トレーサビリティを確認する:
   - すべての要件が設計コンポーネントに紐づいているか確認
   - 前回指摘に対する対応が明確か確認

**修正の観点:**

| 観点 | 修正方法 |
|------|---------|
| アーキテクチャ不整合 | 既存パターンの採用、境界見直し |
| コンポーネント責務の曖昧さ | 責務の分割、明確な境界定義 |
| インターフェース不完全性 | 入出力、エラー処理の明確化 |
| 要件カバレッジ不足 | コンポーネント追加、相互参照の強化 |

**修正完了の判定:**

- すべてのレビュー指摘に対応している
- 根拠を示す修正が実装されている
- 要件との対応が完全である
- 既存アーキテクチャとの整合が確保されている

**修正不可の判定（ABORT対象）:**

- 指摘の根本が要件の矛盾にある
- 既存アーキテクチャとの根本的な矛盾がある
- 要件削除なしに修正できない場合
```

---

## 8. Loop Detection and Prevention

### How Loop Monitors Work

From `sdd.yaml`:

```yaml
loop_monitors:
  - cycle: [validate-design, fix-design]
    threshold: 3  # Trigger judge after 3 iterations
    judge:
      persona: supervisor
      instruction_template: |
        サイクルが {cycle_count} 回繰り返されました。
        
        **参照するレポート:**
        - {report:design-review.md}
        - {report:design.md}
        
        **判断基準:**
        - 各サイクルで新しい問題が発見・修正されているか
        - 同じ指摘が繰り返されていないか
      rules:
        - condition: "健全（進捗あり）"
          next: fix-design
        - condition: "非生産的（改善なし）"
          next: ABORT
```

**Mechanism:**
1. When a cycle (array of movement names) repeats threshold times, a judge step is automatically inserted
2. Judge step evaluates cycle progress using the supervisor persona
3. Can route back to cycle (if productive) or break out to next step

**Key Parameters:**
- `cycle`: Array of movement names that form the loop
- `threshold`: Number of iterations before judge evaluation (3-5 is typical)
- `judge`: Supervisor evaluation + rules for continuing vs. breaking

---

## 9. Movement Transitions in the Master Pipeline

### Full Design Phase Flow in sdd.yaml

```
generate-requirements
  ↓ (要件明確)
validate-gap
  ↓ (分析完了)
generate-design
  ↓ (設計完了)
validate-design  ← Review point
  ├─ GO → generate-tasks (Continue)
  └─ NO-GO → generate-design (Retry)
           (After 3 cycles: supervisor judges)
```

### Key Routing Rules

| From | Condition | To |
|------|-----------|-----|
| generate-design | 設計完了、発見記録あり | validate-design |
| generate-design | 要件が見つからない | ABORT |
| validate-design | GO | generate-tasks |
| validate-design | NO-GO | generate-design |
| validate-design | 設計が見つからない | ABORT |

---

## 10. Comparison: Standalone vs. Integrated Approach

### Standalone "sdd-fix-design.yaml"

**Pros:**
- Clear separation of concerns
- Reusable piece that can be invoked independently
- Simpler movement structure (single movement)
- No loop detection complexity

**Cons:**
- Disconnected from validate-design workflow
- User must manually chain pieces together
- No integrated NO-GO → fix → re-validate loop

### Integrated into "sdd-design.yaml"

**Pros:**
- Automatic NO-GO → fix-design → validate-design loop
- Loop detection and progress monitoring built-in
- Single, cohesive workflow
- Matches existing pattern in sdd.yaml

**Cons:**
- More complex piece YAML
- Increased max_movements required
- More state to track

---

## 11. Testing Recommendation for New Movement

### Test Cases Needed

1. **Happy Path**: Design passes validation (→ COMPLETE)
2. **NO-GO → Fix**: Design fails, fix is applied, re-validation passes
3. **Loop Detection**: After 3 cycles, supervisor judge is invoked
4. **Non-productive Loop**: Supervisor detects no progress → ABORT
5. **Missing Design**: No design file found → ABORT
6. **Unfixable Design**: Fundamental requirement conflict → ABORT

### Test Files Location
- Piece tests: `src/__tests__/piece/` or `src/__tests__/engine/`
- Use fixture piece files in `__tests__/fixtures/pieces/`

---

## 12. Related Files to Update

If implementing the integrated approach:

1. `.takt/pieces/sdd-design.yaml` - Add movements
2. `.takt/instructions/fix-design.md` - Create new instruction
3. `.takt/policies/sdd-design.md` - No change (rules already cover fixing)
4. `.takt/output-contracts/sdd-design.md` - No change (same output format)

If implementing standalone:

1. Create `.takt/pieces/sdd-fix-design.yaml` - New piece
2. Create `.takt/instructions/fix-design.md` - New instruction
3. No changes to existing pieces

---

## 13. Key Design Patterns Identified

### Pattern 1: NO-GO Does NOT Auto-ABORT in Master Pieces

In `sdd.yaml`, the NO-GO condition explicitly routes to the previous step:
```yaml
- condition: "NO-GO（重大な問題あり）"
  next: generate-design  # Retry, not ABORT
```

This allows iterative improvement before accepting failure.

### Pattern 2: Separate Pieces Can Have Different Rules

Standalone pieces like `sdd-validate-design.yaml` route NO-GO to ABORT:
```yaml
- condition: "NO-GO（重大な問題あり）"
  next: ABORT
```

This is appropriate when the piece is optional and user-invoked.

### Pattern 3: Loop Monitoring as Safety Net

Rather than hardcoding iteration limits, `loop_monitors` use supervisor judgment:
- Allows productive cycles to continue indefinitely
- Catches non-productive cycles automatically
- Prevents runaway loops while maximizing quality effort

### Pattern 4: Use `pass_previous_response: false` in Fix Steps

From the codebase changelog:
```
実行指示が長大化する問題を緩和 — implement/fix 系ムーブメントで 
`pass_previous_response: false` を設定し、Report Directory 内のレポートを
一次情報として優先する指示に変更
```

This prevents instructions from becoming too long by prioritizing report files over accumulated conversation history.

---

## Summary

The takt SDD architecture provides a flexible framework for design workflow with:

1. **Clear separation** between generation and validation
2. **Built-in retry capability** through movement routing
3. **Loop detection** to prevent infinite cycles
4. **Supervisor arbitration** for complex decisions
5. **Report-driven context** to keep instructions manageable

The recommended implementation is to **add movements to sdd-design.yaml** with:
- `validate-design` → NO-GO routes to `fix-design`
- `fix-design` → loops back to `validate-design`
- Loop monitor after 3 cycles for supervisor judgment

This matches the existing pattern in `sdd.yaml` and provides automatic, integrated workflow without requiring manual user intervention between steps.
