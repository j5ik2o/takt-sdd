# Research & Design Decisions

## Summary
- **Feature（機能）**: `kiro-ai-quality-gate`
- **Discovery Scope（ディスカバリー範囲）**: Extension
- **Key Findings（主要な発見）**:
  - TAKT には `subworkflow.callable` と `workflow_call` が既存機能として存在し、built-in `default` / `default-draft` が呼び出しパターンの参考になる。
  - built-in `default-draft` は実装ステップを含み、非生産的な AI antipattern loop を `COMPLETE` に落とすため、Kiro implementation gate としてそのまま採用しない。
  - `kiro-impl` の既存 validation は nested Kiro workflow を禁止しているため、許可対象を `kiro-ai-quality-gate` に限定する形で検証契約を更新する必要がある。

## Research Log

### TAKT callable subworkflow の既存パターン
- **Context（背景）**: AI quality gate を独立した reusable subworkflow として設計できるか確認した。
- **Sources Consulted（参照した情報源）**:
  - `node_modules/takt/builtins/ja/workflows/default.yaml`
  - `node_modules/takt/builtins/ja/workflows/default-draft.yaml`
  - `node_modules/takt/builtins/en/workflows/draft.yaml`
  - `node_modules/takt/builtins/skill/references/yaml-schema.md`
- **Findings（発見）**:
  - caller workflow は `kind: workflow_call` / `call: <subworkflow>` / `args` / `rules` で callable subworkflow を呼び出す。
  - callable workflow は `subworkflow.callable: true`、`returns`、`params` を持つ。
  - `params` の宣言型は `facet_ref` と `facet_ref[]` に限定される。
  - `facet_ref[]` params は built-in `draft` / `peer-review` で既存実績がある。
- **Implications（含意）**:
  - `kiro-ai-quality-gate` は TAKT 既存機能だけで表現できる。
  - 新しい orchestration engine や shell 経由の nested workflow 実行は不要。

### built-in AI antipattern 資産の適合性
- **Context（背景）**: `ai-antipattern-reviewer` と関連 policy / output contract を Kiro 初期 gate に使えるか確認した。
- **Sources Consulted（参照した情報源）**:
  - `node_modules/takt/builtins/ja/workflows/default-draft.yaml`
  - `node_modules/takt/builtins/ja/facets/output-contracts/ai-antipattern-review.md`
  - `node_modules/takt/builtins/ja/facets/instructions/loop-monitor-ai-antipattern-fix.md`
- **Findings（発見）**:
  - AI review は `ai-antipattern-reviewer` persona、`review` / `ai-antipattern` policy、`ai-antipattern-review` output contract の組み合わせで既に表現されている。
  - `default-draft` は `implement` step を内包するため、`kiro-impl` の `execute-task` 後 gate と責務が重なる。
  - `default-draft` の非生産的 loop は `COMPLETE` へ進むが、Kiro implementation gate では `debug-task` に戻すため `need_replan` が必要である。
- **Implications（含意）**:
  - review output contract は built-in を参照し、report name だけ Kiro 用に `kiro-ai-antipattern-review.md` とする。
  - fix instruction と fix output contract は Kiro selected task boundary を表現するため local TAKT facet として追加する。

### `kiro-impl` integration points
- **Context（背景）**: 初期 rollout を `kiro-impl` のみに限定し、既存の review/debug/verify/progress path と矛盾しない挿入点を確認した。
- **Sources Consulted（参照した情報源）**:
  - `.takt/ja/workflows/kiro-impl.yaml`
  - `.takt/ja/facets/instructions/kiro-review-task.md`
  - `.takt/ja/facets/instructions/kiro-verify-task-completion.md`
  - `.takt/ja/facets/output-contracts/kiro-implementation-result.md`
- **Findings（発見）**:
  - 現在の `execute-task` は `STATUS READY_FOR_REVIEW` を直接 `review-task` に送る。
  - `review-task` は selected task boundary と validation evidence を見るが、AI antipattern report は入力契約に含まれていない。
  - `verify-task-completion` は checkbox update 前の最終 gate だが、AI gate reports を検証入力に含めていない。
  - `update-progress` は `verify-task-completion` の `safe_to_update_progress` に依存する構造で、AI report を直接読ませる必要はない。
- **Implications（含意）**:
  - routing は `execute-task -> ai-quality-gate -> review-task` に変更する。
  - `review-task` と `verify-task-completion` の instruction facet だけを拡張し、`update-progress` には AI report 読み取り責務を追加しない。

### Validation contract
- **Context（背景）**: workflow drift を機械的に検出する既存方針に沿って AI gate を保護する方法を確認した。
- **Sources Consulted（参照した情報源）**:
  - `scripts/validate-kiro-iterative-implementation-workflow.mjs`
  - `tests/kiro-iterative-implementation-workflow.test.mjs`
  - `.kiro/steering/tech.md`
  - `.kiro/steering/structure.md`
- **Findings（発見）**:
  - validation script は step order、facet refs、output contract refs、loop monitor drift、language parity を検出している。
  - 現在は `workflow_call` / nested Kiro workflow を boundary drift として禁止する検査がある。
  - fixture tests は current repository と意図的 drift を両方検証するパターンを採る。
- **Implications（含意）**:
  - validation script は `kiro-ai-quality-gate` workflow と `kiro-impl` の許可された `workflow_call` を明示的に検証する。
  - tests は bypass、missing report contract、loop threshold drift、downstream evidence hook drift、language parity drift を追加する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Direct inline steps in `kiro-impl` | `kiro-impl.yaml` に AI review/fix steps を直接追加する | 変更箇所が少ない | 横展開時に重複し、callable contract が残らない | 初期 rollout は簡単だが Requirements 2 と弱く整合 |
| Use built-in `default-draft` directly | `execute-task` 後に `default-draft` を呼ぶ | built-in reuse が最大 | 実装 step 重複、loop return semantics 不一致、report names 不一致 | 不採用 |
| Kiro-specific callable gate | `kiro-ai-quality-gate` subworkflow を追加し、built-in review assets を参照する | 既存機能を使いながら Kiro selected task boundary を表現できる | 新規 YAML/facet と validation 更新が必要 | 採用 |

## Design Decisions

### Decision: Kiro 専用 callable gate を追加する
- **Context（背景）**: gate は `kiro-impl` 以外にも横展開できる契約にする必要があるが、初期実装は `kiro-impl` のみで成功させる。
- **Alternatives Considered（検討した代替案）**:
  1. `kiro-impl` に inline steps を追加する。
  2. built-in `default-draft` をそのまま呼ぶ。
  3. Kiro 専用 `kiro-ai-quality-gate` callable subworkflow を追加する。
- **Selected Approach（採用したアプローチ）**: 3。TAKT の `workflow_call` を使い、Kiro 用の routing / reports / scope guard を定義する。
- **Rationale（根拠）**: built-in mechanism を再利用しつつ、Kiro selected task boundary と `need_replan` routing を表現できる。
- **Trade-offs（トレードオフ）**: 初期ファイル数は増えるが、横展開時の契約が明確になる。
- **Follow-up（フォローアップ）**: 非 facet の context は workflow args にせず、Kiro implementation 固定の prompt contract と validation で表現する。

### Decision: AI review は built-in output contract を使い、fix は Kiro local contract を追加する
- **Context（背景）**: review 観点は汎用 AI antipattern として built-in にあるが、fix 結果は Kiro implementation progress guard を含む必要がある。
- **Alternatives Considered（検討した代替案）**:
  1. review/fix とも built-in をそのまま使う。
  2. review/fix とも Kiro local contract を作る。
  3. review は built-in、fix は Kiro local contract に分ける。
- **Selected Approach（採用したアプローチ）**: 3。
- **Rationale（根拠）**: AI finding schema は再利用し、Kiro 固有の `FIXED` / `NO_FIX_NEEDED` / `NEED_REPLAN` / `BLOCKED` と scope guard を local contract で明示する。
- **Trade-offs（トレードオフ）**: report が2種類になるが、downstream review が判断すべき証跡が明確になる。
- **Follow-up（フォローアップ）**: `review-task` と `verify-task-completion` に report consumption を追加する。

### Decision: `update-progress` は AI report を直接読まない
- **Context（背景）**: progress update は tasks.md の checkbox / Implementation Notes の更新責務に集中している。
- **Alternatives Considered（検討した代替案）**:
  1. `update-progress` で AI gate reports を再検証する。
  2. `verify-task-completion` で gate evidence を検証し、`update-progress` は既存の `safe_to_update_progress` だけに従う。
- **Selected Approach（採用したアプローチ）**: 2。
- **Rationale（根拠）**: progress writer に review 責務を混ぜないことで境界が保たれる。
- **Trade-offs（トレードオフ）**: verify instruction の責務は増えるが、progress update の安全条件は単純なまま残る。
- **Follow-up（フォローアップ）**: validation で `verify-task-completion` の gate evidence hook と `update-progress` の非直接参照を検出する。

## Risks & Mitigations
- 非 facet の context を workflow_call args として表現したくなる — `fix_instruction` と `domain_knowledge` だけを facet params にし、target reports や artifact resolution は implementation 固定の prompt contract に閉じ込める。
- AI fix が selected task boundary を越える — fix instruction と output contract に scope guard を置き、validation と downstream review で evidence を要求する。
- Gate が正しい no-fix 判断を `COMPLETE` にしすぎる — `NO_FIX_NEEDED` は finding ごとの evidence を必須にし、review/verify が再評価する。
- Existing validation の nested workflow 禁止と衝突する — `kiro-ai-quality-gate` だけを許可し、他の nested Kiro workflow は引き続き禁止する。

## References
- `node_modules/takt/builtins/ja/workflows/default.yaml` — `workflow_call` caller pattern。
- `node_modules/takt/builtins/ja/workflows/default-draft.yaml` — AI antipattern review/fix loop reference。
- `node_modules/takt/builtins/ja/facets/output-contracts/ai-antipattern-review.md` — review report contract。
- `.takt/ja/workflows/kiro-impl.yaml` — initial integration target。
- `scripts/validate-kiro-iterative-implementation-workflow.mjs` — workflow contract validation pattern。

---

# Implementation Gap Analysis

## Summary
- **Feature（機能）**: `kiro-ai-quality-gate`
- **Analysis Scope（分析範囲）**: approved requirements と既存 `.takt/{en,ja}` workflow/facet、TAKT builtins、validator/test の差分確認。
- **Key Findings（主要な発見）**:
  - `workflow_call` と callable subworkflow は TAKT builtins と engine schema に既存実績があり、採用可能。
  - `kiro-impl` は現状 `execute-task -> review-task` 直結で、AI quality gate step と gate reports は未実装。
  - Validator は現在 nested Kiro workflow を全面禁止しており、`kiro-ai-quality-gate` の許可例外と gate shape 検査を同時に追加する必要がある。
  - `kiro-review-task` / `kiro-verify-task-completion` は selected task review/verify に集中しており、AI gate reports の入力契約は未追加。

## Requirement-to-Asset Map

| Requirement | Existing Assets | Gap |
|-------------|-----------------|-----|
| 1.1, 1.2, 1.3, 1.4 | `.takt/{en,ja}/workflows/kiro-impl.yaml` | Missing: `ai-quality-gate` workflow_call step と `execute-task` routing change |
| 2.1, 2.2, 2.3, 2.4 | TAKT `workflow_call` / `subworkflow.callable` schema, built-in `default.yaml` | Missing: `.takt/{en,ja}/workflows/kiro-ai-quality-gate.yaml` |
| 3.1, 3.2, 3.3, 3.4 | built-in `ai-antipattern-reviewer`, `ai-antipattern`, `ai-antipattern-review` | Constraint: report name は Kiro 用に `kiro-ai-antipattern-review.md` へ変更する |
| 4.1, 4.2, 4.3, 4.4 | built-in `default-draft.yaml` loop pattern, `loop-monitor-ai-antipattern-fix` | Missing: Kiro 用 loop return semantics。非生産的 loop は `COMPLETE` ではなく `need_replan` |
| 5.1, 5.2, 5.3, 5.4 | `kiro-implementation-result` の `changed_files`, `selected_task`; `kiro-impl-task-progress` policy | Missing: implementation-scope fix instruction と progress update 禁止を含む fix contract |
| 6.1, 6.2, 6.3, 6.4 | built-in review contract | Missing: `kiro-ai-antipattern-fix.md` 用 output contract |
| 7.1, 7.2, 7.3, 7.4 | `.takt/{en,ja}/facets/instructions/kiro-review-task.md`, `kiro-verify-task-completion.md` | Missing: gate reports consumption と `NO_FIX_NEEDED` evidence evaluation |
| 8.1, 8.2, 8.3 | `scripts/validate-kiro-iterative-implementation-workflow.mjs`, `tests/kiro-iterative-implementation-workflow.test.mjs` | Missing: gate workflow/facet/report parity と bypass drift tests |
| 8.4 | root docs currently do not include project-local TAKT policy file | Missing: `TAKT.md` |

## Existing Integration Surfaces

### `kiro-impl.yaml`
- Current path: `execute-task` `STATUS READY_FOR_REVIEW` routes directly to `review-task`.
- Existing loop monitors cover `execute-task` / `debug-task` and `execute-task` / `review-task` / `debug-task`; AI review/fix loop belongs inside the new callable gate, not the parent loop.
- Contract note already rejects standalone `kiro-review`, `kiro-debug`, and `kiro-verify-completion` workflows. This remains compatible because `kiro-ai-quality-gate` is not a replacement standalone adapter; it is a reusable gate.

### Built-in TAKT assets
- `default-draft.yaml` proves callable AI review/fix loop shape and threshold 3.
- `default-draft.yaml` is not directly reusable because it owns an `implement` step and routes unproductive AI loop to `COMPLETE`.
- TAKT workflow params are limited to `facet_ref` / `facet_ref[]`, so implementation context must remain fixed in Kiro prompt contracts, not arbitrary workflow args.

### Validator and tests
- Existing validator parses workflow blocks with lightweight text scanning, not full YAML AST.
- Existing tests use fixture mutation to prove drift detection.
- Current validator hard-fails on any `workflow_call` / nested Kiro workflow mention in `kiro-impl.yaml`; this must become an allowlist for exactly `call: kiro-ai-quality-gate`.

## Implementation Approach Options

### Option A: Extend `kiro-impl.yaml` inline
- **Description**: Add `ai-antipattern-review` and `ai-antipattern-fix` steps directly in `kiro-impl.yaml`.
- **Strengths**: Fewer new workflow files; simple initial wiring.
- **Risks / Limitations**: Violates reusable subworkflow intent; duplicates logic for future rollout; harder to test gate as a discrete contract.
- **Assessment**: Not preferred.

### Option B: Add Kiro-specific callable gate
- **Description**: Add `.takt/{en,ja}/workflows/kiro-ai-quality-gate.yaml` and call it from `kiro-impl.yaml`.
- **Strengths**: Matches requirements and TAKT existing workflow_call pattern; localizes AI review/fix loop; future rollout can reuse interface.
- **Risks / Limitations**: Requires validator exception for this workflow_call and additional parity checks.
- **Assessment**: Preferred.

### Option C: Call built-in `default-draft`
- **Description**: Reuse built-in `default-draft` directly after `execute-task`.
- **Strengths**: Maximal built-in reuse.
- **Risks / Limitations**: Duplicates implementation responsibility; wrong unproductive-loop semantics; wrong report names and Kiro evidence contract.
- **Assessment**: Not viable for this feature.

## Gaps and Constraints

- **Missing workflow assets**: `kiro-ai-quality-gate.yaml` does not exist in either language.
- **Missing local facets**: implementation-specific fix instruction and fix output contract are absent.
- **Constraint**: `.agents/skills/kiro-*` remains upstream asset and must not be edited.
- **Constraint**: `workflow_call` args cannot carry arbitrary strings or string arrays; only facet refs are supported.
- **Constraint**: Existing validator uses text parsing; gate checks should prefer robust local helpers already present (`stepBlocks`, `ruleBlocks`, `containsAll`) rather than introducing a new parser.
- **Unknown**: Runtime report overwrite/namespace semantics for repeated review/fix attempts should be validated with static shape tests first and adjusted only if actual TAKT execution shows report lookup issues.

## Effort and Risk

- **Effort**: M (3-7 days). Multiple workflow/facet pairs, validator updates, and fixture tests are required, but all use established repository patterns.
- **Risk**: Medium. TAKT workflow_call exists, but the parent validator currently rejects nested Kiro workflow calls and must be carefully narrowed to avoid reopening unrelated workflow_call usage.

## Recommendations for Task Generation

- Generate tasks using Option B.
- Put validation/test updates early enough that each workflow/facet addition can be checked mechanically.
- Keep implementation context fixed to `kiro-task-implementation-result.md` and `changed_files`; do not add arbitrary workflow args.
- Add explicit fixture tests for:
  - direct `execute-task -> review-task` bypass,
  - missing callable gate workflow,
  - missing `COMPLETE` / `need_replan` / `ABORT` routing,
  - loop threshold drift,
  - missing gate report references in `review-task` / `verify-task-completion`,
  - accidental AI report review responsibility in `update-progress`.
