# Requirements Document

## Introduction

`kiro-ai-quality-gate-workflow-coverage` は、PR #90 で `kiro-impl` に導入した AI quality gate の信頼性契約を、Kiro workflow 群へ必要な範囲で横展開するための spec である。対象は `.takt/{en,ja}/workflows/kiro-*` と関連 Kiro facet / validator / test であり、すべての Kiro workflow について gate 適用可否を分類したうえで、適用対象だけに AI antipattern review / fix gate を接続する。

この spec は、`cc-sdd-*`、`opsx-*`、OpenSpec-compatible workflow、upstream `.agents/skills/kiro-*` asset を対象にしない。また、read-only status / validation workflow を edit workflow に変えない。Kiro workflow ごとの分類、PR #90 由来の 6 点契約、generation-scoped gate の成果物境界、検証と smoke coverage を要求として定義する。

この改訂では、`kiro-discovery` を単なる downstream delegation ではなく、discovery-owned artifact を書く workflow として扱う。`kiro-discovery` が `brief.md` や roadmap artifact を生成・更新する場合は、discovery 完了報告の前に discovery-scoped AI quality gate を通し、spec generation artifact 向けの gate とは別の境界で AI antipattern を検出・是正する。

## Boundary Context

- **In scope（対象範囲）**: Kiro workflow coverage inventory、gate 適用対象と対象外の分類、generation / edit workflow の AI quality gate 契約、`kiro-discovery` の discovery artifact gate 契約、Kiro-specific facet の追加または更新、validator / test / smoke coverage による drift 検出、en/ja workflow parity。
- **Out of scope（対象外）**: `cc-sdd-*` workflow、`opsx-*` workflow、OpenSpec-compatible workflow、upstream `.agents/skills/kiro-*` asset の直接変更、`CC-SDD-CODEX.md` の直接編集、read-only validation / status workflow への修正ループ追加、全 `kiro-*` workflow への機械的な `workflow_call` 挿入、`kiro-spec-batch` への artifact-level AI fix loop 追加。
- **Adjacent expectations（隣接システム／スペックへの期待）**: `kiro-ai-quality-gate` は初期 gate 契約と PR #90 の学びを提供し、`kiro-spec-generation-workflows` は generation workflow の既存 review / repair / finalize 境界を提供する。`kiro-shared-workflow-contracts` は workflow shape validation と callable subworkflow boundary を提供する。`kiro-discovery` の gate は discovery-owned artifact だけを扱い、後続 spec generation workflow の artifact-level review を置き換えない。

## Project Description (Input)
TAKT の Kiro workflow 開発者は、PR #90 で得た信頼性上の学びを `kiro-impl` 初期導入だけで終わらせず、他の Kiro workflow にも必要な範囲で適用したい。明示的な横展開境界がないと、他の Kiro write/edit または spec generation workflow では、domain-specific review gate の前に AI 特有のハルシネーション、スコープ逸脱、証跡不足、曖昧な review outcome、runtime wiring regressions を取りこぼす可能性が残る。

現在、`kiro-ai-quality-gate` は callable subworkflow として存在し、`kiro-impl` に統合済みである。PR #90 では、次の 6 点が重要な契約として確認された: relative path による `workflow_call`、built-in `ai-antipattern-review` に合わせた routing vocabulary、ambiguous / blocked / inconsistent outcome 用の catch-all replan routing、optional な fix report、replan / repair 可能な loop exhaustion の非 `ABORT` 化、caller 側 `loop_monitors.cycle` への gate step 追加。

この変更では、すべての Kiro workflow について PR #90 の 6 点に対する分類結果を持たせる。分類結果は、既存 gate で covered、generation-scoped gate が必要、discovery artifact gate が必要、orchestration として個別判断、read-only のため対象外、のいずれかである。gate 適用対象になった spec generation、discovery artifact generation、edit workflow は、domain-specific review、discovery report、または finalize の前に適切な AI quality gate を通す。read-only な validation / status workflow は read-only のまま維持し、修正ループを追加しない。

## Requirements

### Requirement 1: Kiro workflow coverage inventory を定義する

**Objective:** TAKT Kiro workflow maintainer として、全 Kiro workflow の AI quality gate 適用状態を一覧できるようにしたい。そうすることで、必要な workflow だけに gate を適用し、対象外 workflow の理由も後から検証できる。

#### Acceptance Criteria

1. When Kiro AI quality gate coverage is evaluated, the TAKT Kiro workflow set shall classify every `.takt/{en,ja}/workflows/kiro-*` workflow into exactly one coverage category.
2. The TAKT Kiro workflow set shall support coverage categories for existing gate coverage, generation-scoped gate required, discovery artifact gate required, orchestration-specific decision required, read-only out of scope, and intentionally not applicable.
3. When a workflow is classified as out of scope, the TAKT Kiro workflow set shall record the user-observable or operator-observable reason for that classification.
4. If a Kiro workflow cannot be classified from available evidence, the TAKT Kiro workflow set shall report the workflow as requiring maintainer decision rather than silently treating it as covered.

### Requirement 2: Gate eligibility を成果物生成境界で判断する

**Objective:** TAKT Kiro workflow maintainer として、AI quality gate の適用対象を成果物生成や修正のある workflow に限定したい。そうすることで、read-only workflow や orchestration workflow に不要な修正ループを混入させない。

#### Acceptance Criteria

1. When a Kiro workflow generates or repairs artifacts that proceed to domain-specific review or finalization, the TAKT Kiro workflow set shall treat the workflow as eligible for AI quality gate evaluation.
2. When a Kiro workflow only reads evidence, validates state, or reports status without writing artifacts, the TAKT Kiro workflow set shall keep the workflow read-only and out of AI fix loop scope.
3. Where a Kiro workflow performs orchestration or decomposition and may write planning artifacts, the TAKT Kiro workflow set shall require an explicit gate applicability decision before adding review/fix behavior.
4. If applying the gate would change a workflow from read-only to edit-capable behavior, the TAKT Kiro workflow set shall reject that coverage plan.
5. The TAKT Kiro workflow set shall not add AI quality gate calls to all `kiro-*` workflows mechanically.
6. Where `kiro-discovery` writes discovery-owned `brief.md` or roadmap artifacts, the TAKT Kiro workflow set shall treat those artifacts as eligible for discovery-scoped AI quality gate evaluation.
7. The TAKT Kiro workflow set shall keep discovery-scoped gate findings separate from implementation-scoped fix instructions.

### Requirement 3: PR #90 の 6 点契約を gate 適用対象に要求する

**Objective:** TAKT Kiro workflow maintainer として、PR #90 で発見した routing と loop の失敗モードを再発させたくない。そうすることで、横展開後の gate が runtime wiring や曖昧な review outcome で壊れない。

#### Acceptance Criteria

1. When an eligible Kiro workflow calls an AI quality gate subworkflow, the TAKT Kiro workflow set shall use a relative workflow path rather than a bare workflow name.
2. When an AI antipattern review result is routed, the TAKT Kiro workflow set shall use routing vocabulary compatible with the built-in `ai-antipattern-review` contract.
3. If an AI antipattern review outcome is ambiguous, blocked, or internally inconsistent, the TAKT Kiro workflow set shall route to a replan, repair, or maintainer-decision outcome instead of leaving the workflow without a matched path.
4. When the first AI antipattern review finds no blocking issue, the TAKT Kiro workflow set shall allow completion without requiring a fix report.
5. If an AI review/fix loop reaches its threshold while replan or repair remains possible, the TAKT Kiro workflow set shall return the corresponding replan or repair outcome instead of bluntly aborting.
6. When a caller workflow inserts an AI quality gate step into an existing monitored cycle, the TAKT Kiro workflow set shall include that gate step in the caller's loop monitor cycle.
7. When `kiro-discovery` calls an AI quality gate subworkflow, the TAKT Kiro workflow set shall apply the same routing and loop contracts to discovery-specific outcomes.

### Requirement 4: Generation-scoped gate は spec artifact の境界を守る

**Objective:** spec 作成者として、requirements、design、tasks、quick などの spec generation 成果物を domain review 前に AI quality gate で確認したい。そうすることで、AI 特有の誤った前提や証跡不足が spec lifecycle metadata に昇格される前に検出される。

#### Acceptance Criteria

1. When a generation-scoped gate reviews a requirements draft, the TAKT Kiro workflow set shall evaluate AI-specific risks before the requirements artifact is promoted as generated.
2. When a generation-scoped gate reviews a design draft or research artifact, the TAKT Kiro workflow set shall evaluate AI-specific risks before the design artifact is finalized.
3. When a generation-scoped gate reviews a task plan, the TAKT Kiro workflow set shall evaluate AI-specific risks before tasks are marked generated or ready for implementation.
4. If an AI quality issue can be corrected within the current generation artifact boundary, the TAKT Kiro workflow set shall route the workflow through the appropriate repair path before domain-specific review or finalization.
5. If an AI quality issue requires changing an upstream phase, changing roadmap decomposition, or expanding the current artifact boundary, the TAKT Kiro workflow set shall return a replan or upstream-repair outcome rather than silently editing unrelated artifacts.

### Requirement 5: Gate evidence を後続 review / finalize が消費する

**Objective:** downstream reviewer と workflow operator として、AI quality gate の結果が後続判断に反映されることを確認したい。そうすることで、未解決の AI antipattern finding を無視して review pass や lifecycle promotion が進むことを防げる。

#### Acceptance Criteria

1. When an AI quality gate produces a review report, the downstream Kiro review or finalize step shall inspect unresolved AI antipattern findings before accepting the artifact.
2. When an optional fix report exists, the downstream Kiro review or finalize step shall reject blocked, stale, cross-run, or evidence-free no-fix outcomes before accepting the artifact.
3. When no fix report exists because the first AI antipattern review found no blocking issue, the downstream Kiro review or finalize step shall not treat the missing fix report as a failure.
4. If downstream review rejects AI quality gate evidence, the TAKT Kiro workflow set shall route through the workflow's existing repair, replan, or blocked path.
5. The TAKT Kiro workflow set shall keep progress or lifecycle promotion dependent on the appropriate verified review/finalize result rather than making promotion steps re-review raw gate reports independently.
6. When `kiro-discovery` produces a discovery report after writing artifacts, the discovery report step shall account for unresolved discovery-scoped AI antipattern findings before reporting completion.

### Requirement 6: discovery artifact gate と read-only / orchestration 境界を維持する

**Objective:** TAKT Kiro workflow maintainer として、品質ゲート横展開によって既存 workflow の責務を崩したくない。そうすることで、status、validation、batch の operator expectations を壊さず、`kiro-discovery` が所有する discovery artifact には必要な AI quality gate coverage を追加できる。

#### Acceptance Criteria

1. While `kiro-spec-status` or `kiro-validate-*` workflows remain read-only, the TAKT Kiro workflow set shall not add edit-capable AI fix behavior to those workflows.
2. When `kiro-discovery` writes `brief.md` or roadmap artifacts, the TAKT Kiro workflow set shall evaluate discovery-scoped AI quality before reporting discovery complete.
3. If `kiro-discovery` AI quality findings can be corrected within discovery-owned artifacts, the TAKT Kiro workflow set shall route through discovery-scoped repair before completion.
4. If `kiro-discovery` AI quality findings require different decomposition, existing spec ownership changes, or human clarification, the TAKT Kiro workflow set shall route to replan or maintainer-decision behavior instead of silently editing unrelated spec artifacts.
5. Where `kiro-spec-batch` orchestrates worker results and cross-spec review, the TAKT Kiro workflow set shall classify whether AI quality gate coverage belongs to worker generation workflows, batch aggregation, or neither.
6. If a workflow is classified as orchestration-only out of scope, the TAKT Kiro workflow set shall document the adjacent workflow that owns artifact-level AI quality review.
7. The TAKT Kiro workflow set shall keep roadmap checkbox markers out of implementation progress decisions when classifying coverage.

### Requirement 7: Validation と smoke coverage で drift を検出する

**Objective:** maintainer として、AI quality gate coverage の契約 drift を release 前に検出したい。そうすることで、prompt prose だけに頼らず、workflow wiring と report semantics の回帰を止められる。

#### Acceptance Criteria

1. When repository validation runs, the TAKT Kiro workflow set shall detect eligible Kiro workflows that bypass required AI quality gate coverage.
2. When repository validation runs, the TAKT Kiro workflow set shall detect forbidden AI fix loop additions to read-only status or validation workflows.
3. When repository validation runs, the TAKT Kiro workflow set shall detect drift from the relative `workflow_call`, routing vocabulary, catch-all routing, optional fix report, loop exhaustion, and caller loop monitor contracts.
4. When runtime smoke coverage runs for AI quality gate wiring, the TAKT Kiro workflow set shall exercise at least one deterministic successful gate path for a covered workflow.
5. If validator or smoke coverage cannot determine whether a workflow is covered or intentionally out of scope, the TAKT Kiro workflow set shall fail with an actionable classification finding.
6. When repository validation runs, the TAKT Kiro workflow set shall detect missing discovery-scoped AI quality gate coverage for `kiro-discovery`.
7. When repository validation runs, the TAKT Kiro workflow set shall detect implementation-scoped fix instructions wired into `kiro-discovery` discovery artifact review.

### Requirement 8: Language parity と upstream asset 境界を守る

**Objective:** TAKT Kiro workflow maintainer として、Kiro AI quality gate coverage を en/ja 資産で一貫させつつ、upstream Kiro skill asset を直接改変しないようにしたい。そうすることで、ローカル TAKT prompt priority による補正と上流資産の追従性を両立できる。

#### Acceptance Criteria

1. When AI quality gate coverage changes a Kiro workflow available in both language trees, the TAKT Kiro workflow set shall keep the English and Japanese workflow structures aligned.
2. When AI quality gate coverage changes a Kiro facet available in both language trees, the TAKT Kiro workflow set shall keep machine fields, report names, and routing terms aligned across languages.
3. The TAKT Kiro workflow set shall not require direct modification of upstream `.agents/skills/kiro-*` source assets.
4. Where upstream Kiro skill behavior is ambiguous or incomplete for TAKT execution, the TAKT Kiro workflow set shall express the runtime correction in TAKT workflow, facet, validator, or project-local documentation.
5. If a language-pair drift affects gate coverage, the TAKT Kiro workflow set shall report the drift before the workflow is treated as covered.
