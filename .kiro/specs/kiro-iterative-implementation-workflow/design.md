# Design Document

## Overview

`kiro-iterative-implementation-workflow` は、Kiro-compatible spec の implementation phase を TAKT workflow として実行可能にします。対象ユーザーは `kiro-impl` を使う実装者、reviewer、maintainer です。承認済み `tasks.md` から 1 task を選び、境界を固定して実装し、internal review/debug/completion verification を通過した場合だけ進捗 artifact を更新します。

この spec は code edit を伴う最後の workflow slice です。`kiro-shared-workflow-contracts` の review/debug/completion output contract、artifact operation policy、lifecycle policy を参照し、`kiro-status-validation-workflows` の readiness/validation signal と `kiro-spec-generation-workflows` が生成した task annotation を入力にします。spec generation、batch orchestration、public surface migration は取り込みません。

### Goals

- `kiro-impl` が実装開始前に readiness と task annotation を確認できる
- 1 iteration で 1 task のみを実行し、boundary/dependency/validation plan を固定できる
- `kiro-review`、`kiro-debug`、`kiro-verify-completion` を internal sub-workflow として接続できる
- completion verification が `COMPLETE` になるまで checkbox と実装メモを更新しない
- workflow/facet/contract drift を repository-local validation で検出できる

### Non-Goals

- requirements/design/tasks の生成または修正
- `kiro-discovery`、`kiro-spec-batch`、cross-spec review、roadmap 更新
- `kiro:*` npm script surface、major-version migration、legacy shim
- PR monitoring、GitHub review comment 対応、CI gate の実行
- OpenSpec artifact と `.kiro/*` artifact の統合

## Boundary Commitments

### This Spec Owns

- `kiro-impl` の planning、one-task execution、review/debug/verify loop、progress update workflow
- internal `kiro-review`、`kiro-debug`、`kiro-verify-completion` の workflow/facet wiring
- task boundary、dependency、validation plan、feature flag/manual verification 前提を implementation plan に出す規約
- selected task の checkbox、blocker notes、implementation notes、verification evidence の更新タイミング
- implementation workflow の validation harness

### Out of Boundary

- `kiro-spec-init`、requirements/design/tasks/quick の artifact generation
- `kiro-discovery` と `kiro-spec-batch` の roadmap/batch orchestration
- `kiro-spec-status` と `kiro-validate-*` の read-only validation full behavior
- `kiro-workflow-surface` の public command migration
- repo-specific PR monitoring、CI failure triage、GitHub review thread resolution

### Allowed Dependencies

- `kiro-shared-workflow-contracts` の `kiro-review-verdict`、`kiro-debug-decision`、`kiro-completion-verification`、`kiro-validation-result`、`kiro-artifact-operations`、`kiro-spec-lifecycle`
- `kiro-status-validation-workflows` の readiness/status/implementation validation verdict
- `kiro-spec-generation-workflows` が生成する `tasks.md` の `_Boundary:_`、`_Depends:_`、numeric requirement coverage、observable completion detail
- 既存 `.takt/{en,ja}/workflows/cc-sdd-impl.yaml` と対応 facet の配置・step 構成パターン
- repository-local Node.js 22+ validation script と test runner

### Revalidation Triggers

- shared review/debug/completion contract の verdict enum、field name、tag の変更
- `tasks.md` task annotation、checkbox、blocker/implementation notes の形式変更
- `spec.json` ready state または approval semantics の変更
- `kiro-status-validation-workflows` の readiness/verdict 語彙変更
- implementation workflow が複数 task batch や downstream orchestration を再導入するとき

## Architecture

### Existing Architecture Analysis

既存の `cc-sdd-impl` workflow は `plan`、`implement`、`ai_review`、`ai_fix`、`supervise` の流れを持ち、未完了 task をバッチ化して実装し、実装 step 内で `tasks.md` の checkbox を更新します。Kiro 版ではこの shape を参考にしますが、batch 実装ではなく one-task iteration に限定し、checkbox 更新を completion verification の後に移動します。

上流 spec では、shared contract が review/debug/completion verdict を定義し、status/validation workflow が read-only readiness を返し、spec generation workflow が task annotation を生成します。本 spec はこれらの出力を消費する実行 workflow です。

### Architecture Pattern & Boundary Map

Selected pattern: gated one-task implementation loop。planning、execution、review、debug、completion verification、progress update を明確に分け、progress update は completion gate の後だけ許可します。

```mermaid
graph TB
    Caller --> ImplWorkflow
    ImplWorkflow --> ReadinessGate
    ReadinessGate --> TaskPlanner
    TaskPlanner --> TaskExecutor
    TaskExecutor -->|validation PASS| ReviewWorkflow
    TaskExecutor -->|validation failed| DebugWorkflow
    ReviewWorkflow --> CompletionVerifier
    ReviewWorkflow --> DebugWorkflow
    DebugWorkflow --> TaskExecutor
    DebugWorkflow --> ProgressUpdater
    CompletionVerifier --> ProgressUpdater
    StatusValidation --> ReadinessGate
    SharedContracts --> ImplWorkflow
    SharedContracts --> ReviewWorkflow
    SharedContracts --> DebugWorkflow
    SharedContracts --> CompletionVerifier
    KiroWorkspace --> ReadinessGate
    KiroWorkspace --> TaskPlanner
    ProgressUpdater --> KiroWorkspace
    Harness --> ImplWorkflow
```

Key decisions:

- `TaskPlanner` は実行可能な 1 task だけを選ぶ。複数 task の batch は扱わない。
- `TaskExecutor` は code edit と validation evidence 収集を行うが、checkbox は更新しない。
- `TaskExecutor` の validation failure は review を経由せず、直接 `DebugWorkflow` に渡す。
- `ReviewWorkflow`、`DebugWorkflow`、`CompletionVerifier` は shared output contract の machine verdict で分岐する。
- `ProgressUpdater` は completion verdict が `COMPLETE` のときだけ selected task に限定して `tasks.md` を更新する。
- validation harness は workflow/facet の順序、shared contract reference、out-of-boundary reference を検証する。
- Kiro-specific implementation facets は shared `BuiltinFacetInheritancePolicy` に従い、`node_modules/takt/builtins/{lang}/facets` の coding/testing/review/debug 相当の built-in facet を継承できる場合は差分だけを書く。

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Workflow runtime | TAKT workflow YAML | `kiro-impl` と internal sub-workflow の step orchestration | `.takt/{en,ja}/workflows/` に配置 |
| Facets | TAKT facet Markdown | planning、execution、review/debug/verify、progress update の instruction/policy | built-in facet 継承を優先し、`.takt/{en,ja}/facets/` に配置 |
| Built-in facet inheritance | TAKT builtins facet Markdown | coding/testing/review 系の親 facet と差分記述 | shared `BuiltinFacetInheritancePolicy` を参照 |
| Shared contracts | Kiro shared contract facets | review/debug/completion/validation verdict と artifact policy | 上流 spec の成果物を参照 |
| Spec workspace | `.kiro/specs/<feature>` | `tasks.md` と `spec.json` の input/progress artifact | roadmap は read-only input にも含めない |
| Validation | Node.js 22+ script/test | workflow order、facet reference、boundary drift を検出 | implementation behavior の完全実行は対象外 |

## File Structure Plan

### Directory Structure

```text
.
├── .takt/
│   ├── en/
│   │   ├── workflows/
│   │   │   ├── kiro-impl.yaml
│   │   │   ├── kiro-review.yaml
│   │   │   ├── kiro-debug.yaml
│   │   │   └── kiro-verify-completion.yaml
│   │   └── facets/
│   │       ├── instructions/
│   │       │   ├── kiro-impl-plan-one-task.md
│   │       │   ├── kiro-impl-execute-task.md
│   │       │   ├── kiro-impl-update-progress.md
│   │       │   ├── kiro-review-task.md
│   │       │   ├── kiro-debug-task.md
│   │       │   └── kiro-verify-task-completion.md
│   │       └── policies/
│   │           └── kiro-impl-task-progress.md
│   ├── ja/
│   │   ├── workflows/
│   │   │   ├── kiro-impl.yaml
│   │   │   ├── kiro-review.yaml
│   │   │   ├── kiro-debug.yaml
│   │   │   └── kiro-verify-completion.yaml
│   │   └── facets/
│   │       ├── instructions/
│   │       │   ├── kiro-impl-plan-one-task.md
│   │       │   ├── kiro-impl-execute-task.md
│   │       │   ├── kiro-impl-update-progress.md
│   │       │   ├── kiro-review-task.md
│   │       │   ├── kiro-debug-task.md
│   │       │   └── kiro-verify-task-completion.md
│   │       └── policies/
│   │           └── kiro-impl-task-progress.md
├── scripts/
│   └── validate-kiro-iterative-implementation-workflow.mjs
└── tests/
    └── kiro-iterative-implementation-workflow.test.mjs
```

### Created Files

- `.takt/{en,ja}/workflows/kiro-impl.yaml` — readiness gate、one-task planning、execution、review/debug/verify、progress update を接続する main workflow。
- `.takt/{en,ja}/workflows/kiro-review.yaml` — selected task の実装結果を shared review verdict contract で判定する internal workflow。
- `.takt/{en,ja}/workflows/kiro-debug.yaml` — validation/review failure の root cause と `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` decision を返す internal workflow。
- `.takt/{en,ja}/workflows/kiro-verify-completion.yaml` — selected task の implementation、review、evidence、remaining work を completion verification contract へ写像する internal workflow。
- `.takt/{en,ja}/facets/instructions/kiro-impl-plan-one-task.md` — feature readiness、task annotation、eligible task selection、implementation plan 出力の手順。
- `.takt/{en,ja}/facets/instructions/kiro-impl-execute-task.md` — selected task の scope-limited code edit、test update、validation evidence collection の手順。
- `.takt/{en,ja}/facets/instructions/kiro-impl-update-progress.md` — completion 後の selected task checkbox、blocker、implementation notes 更新手順。
- `.takt/{en,ja}/facets/instructions/kiro-review-task.md` — task-local review verdict 作成手順。
- `.takt/{en,ja}/facets/instructions/kiro-debug-task.md` — root-cause-first debug decision 作成手順。
- `.takt/{en,ja}/facets/instructions/kiro-verify-task-completion.md` — completion verification evidence と remaining work の判定手順。
- `.takt/{en,ja}/facets/policies/kiro-impl-task-progress.md` — checkbox 更新前の completion gate、selected task 限定更新、blocker/notes 形式の policy。
- `scripts/validate-kiro-iterative-implementation-workflow.mjs` — workflow/facet references、shared contract reference、one-task gate order、boundary exclusions を検証する script。
- `tests/kiro-iterative-implementation-workflow.test.mjs` — validation script を repository-local test runner から実行する regression test。

### Modified Files

- `tests/kiro-iterative-implementation-workflow.test.*` — implementation workflow validation を既存 test/check command で検出できる場所に追加する。`package.json` の script wiring と `kiro:*` public surface の追加は本 spec では扱わない。

### Component to File Mapping

- `KiroImplementationWorkflow` — `.takt/{en,ja}/workflows/kiro-impl.yaml`
- `KiroImplementationReadinessGate` — `.takt/{en,ja}/workflows/kiro-impl.yaml`、`.takt/{en,ja}/facets/instructions/kiro-impl-plan-one-task.md`
- `KiroOneTaskPlanner` — `.takt/{en,ja}/facets/instructions/kiro-impl-plan-one-task.md`
- `KiroTaskExecutor` — `.takt/{en,ja}/facets/instructions/kiro-impl-execute-task.md`
- `KiroReviewSubWorkflow` — `.takt/{en,ja}/workflows/kiro-review.yaml`、`.takt/{en,ja}/facets/instructions/kiro-review-task.md`
- `KiroDebugSubWorkflow` — `.takt/{en,ja}/workflows/kiro-debug.yaml`、`.takt/{en,ja}/facets/instructions/kiro-debug-task.md`
- `KiroCompletionVerifier` — `.takt/{en,ja}/workflows/kiro-verify-completion.yaml`、`.takt/{en,ja}/facets/instructions/kiro-verify-task-completion.md`
- `KiroTaskProgressUpdater` — `.takt/{en,ja}/facets/instructions/kiro-impl-update-progress.md`、`.takt/{en,ja}/facets/policies/kiro-impl-task-progress.md`
- `IterativeImplementationValidationHarness` — `scripts/validate-kiro-iterative-implementation-workflow.mjs`、`tests/kiro-iterative-implementation-workflow.test.mjs`

## System Flows

### One Task Implementation Flow

```mermaid
sequenceDiagram
    participant Caller
    participant Impl
    participant Workspace
    participant Executor
    participant Review
    participant Debug
    participant Verify
    participant Updater
    Caller->>Impl: feature
    Impl->>Workspace: read spec state and tasks
    Impl->>Impl: select one eligible task
    Impl->>Executor: execute selected task
    Executor-->>Impl: changes, evidence, validation verdict
    alt validation PASS
        Impl->>Review: review task result
        Review-->>Impl: GO or NO_GO
        alt GO
            Impl->>Verify: verify completion
            Verify-->>Impl: COMPLETE or not
            alt COMPLETE
                Impl->>Updater: update selected task only
            else not COMPLETE
                Impl->>Debug: investigate incomplete verification
            end
        else NO_GO
            Impl->>Debug: investigate review findings
        end
    else validation failed
        Impl->>Debug: investigate validation failure
    end
    Debug-->>Impl: retry block or stop
```

Review が `NO_GO` または validation が失敗した場合、`Debug` が `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` を返します。`Updater` は `Verify` が `COMPLETE` を返した場合だけ実行されます。

### Task State Flow

```mermaid
stateDiagram-v2
    [*] --> ReadyCheck
    ReadyCheck --> Blocked: not ready
    ReadyCheck --> Planned: ready
    Planned --> Executing: one task selected
    Planned --> Blocked: no eligible task
    Executing --> Reviewing: evidence collected
    Executing --> Debugging: validation failed
    Reviewing --> Verifying: GO
    Reviewing --> Debugging: NO_GO
    Debugging --> Executing: RETRY_TASK
    Debugging --> Blocked: BLOCK_TASK
    Debugging --> Human: STOP_FOR_HUMAN
    Verifying --> Completed: COMPLETE
    Verifying --> Debugging: incomplete
    Completed --> [*]
```

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | readiness と artifact state 確認 | KiroImplementationReadinessGate | Status contract, Artifact policy | One Task Implementation |
| 1.2 | ready でない feature の停止 | KiroImplementationReadinessGate | Validation result contract | Task State |
| 1.3 | task annotation 不足の blocker | KiroOneTaskPlanner | Task annotation policy | One Task Implementation |
| 1.4 | readiness 確認の read-only 境界 | KiroImplementationReadinessGate | Artifact policy | One Task Implementation |
| 2.1 | eligible task selection | KiroOneTaskPlanner | Task plan output | One Task Implementation |
| 2.2 | one-task iteration | KiroOneTaskPlanner, KiroImplementationWorkflow | Workflow rules | Task State |
| 2.3 | eligible task 不在の停止 | KiroOneTaskPlanner, KiroDebugSubWorkflow | Debug decision contract | Task State |
| 2.4 | batch orchestration 非依存 | KiroImplementationWorkflow | Boundary policy | One Task Implementation |
| 3.1 | boundary/dependency/coverage plan | KiroOneTaskPlanner | Implementation plan report | One Task Implementation |
| 3.2 | change scope と validation plan | KiroTaskExecutor | Execution report | One Task Implementation |
| 3.3 | design boundary 矛盾の block | KiroOneTaskPlanner, KiroDebugSubWorkflow | Debug decision contract | Task State |
| 3.4 | unverified item の分離 | KiroTaskExecutor, KiroCompletionVerifier | Evidence contract | One Task Implementation |
| 4.1 | selected task の code edit | KiroTaskExecutor | Service workflow | One Task Implementation |
| 4.2 | validation evidence collection | KiroTaskExecutor | Validation result contract | One Task Implementation |
| 4.3 | validation failure で checkbox 更新しない | KiroTaskExecutor, KiroTaskProgressUpdater | Progress policy | Task State |
| 4.4 | selected task 限定更新 | KiroTaskProgressUpdater | Artifact policy | One Task Implementation |
| 5.1 | internal review verdict | KiroReviewSubWorkflow | Review verdict contract | One Task Implementation |
| 5.2 | actionable findings mapping | KiroReviewSubWorkflow | Review verdict contract | One Task Implementation |
| 5.3 | debug decision | KiroDebugSubWorkflow | Debug decision contract | Task State |
| 5.4 | stop for human の blocker | KiroDebugSubWorkflow, KiroTaskProgressUpdater | Debug decision, Progress policy | Task State |
| 6.1 | completion verification | KiroCompletionVerifier | Completion verification contract | One Task Implementation |
| 6.2 | incomplete で checkbox 更新しない | KiroCompletionVerifier, KiroTaskProgressUpdater | Progress policy | Task State |
| 6.3 | complete 後の task progress update | KiroTaskProgressUpdater | Artifact operation policy | One Task Implementation |
| 6.4 | machine verdict と summary 分離 | KiroReviewSubWorkflow, KiroDebugSubWorkflow, KiroCompletionVerifier | Shared output contracts | One Task Implementation |
| 7.1 | workflow/facet/contract reference validation | IterativeImplementationValidationHarness | Validation script | Harness validation |
| 7.2 | gate order validation | IterativeImplementationValidationHarness | Validation script | Harness validation |
| 7.3 | boundary violation detection | IterativeImplementationValidationHarness | Validation script | Harness validation |
| 7.4 | PR/CI/OpenSpec 非依存 | IterativeImplementationValidationHarness | Validation scope | Harness validation |
| 7.5 | built-in facet inheritance validation | IterativeImplementationValidationHarness | Validation script | Harness validation |

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies | Contracts |
|-----------|--------------|--------|--------------|------------------|-----------|
| KiroImplementationWorkflow | Workflow | implementation loop 全体の step と分岐を制御する | 2.2, 2.4 | shared contracts P0 | Service |
| KiroImplementationReadinessGate | Workflow | feature と artifact が実装可能か確認する | 1.1, 1.2, 1.4 | status validation P0, artifact policy P0 | Service, State |
| KiroOneTaskPlanner | Workflow | eligible な 1 task と execution plan を決める | 1.3, 2.1, 2.2, 2.3, 3.1, 3.3 | tasks.md P0, design.md P0 | Service, State |
| KiroTaskExecutor | Workflow | selected task の実装と evidence 収集を行う | 3.2, 3.4, 4.1, 4.2, 4.3 | validation plan P0 | Service, Batch |
| KiroReviewSubWorkflow | Workflow | task-local review verdict を返す | 5.1, 5.2, 6.4 | review contract P0 | Service |
| KiroDebugSubWorkflow | Workflow | failure の root cause と次 action を返す | 2.3, 3.3, 5.3, 5.4 | debug contract P0 | Service |
| KiroCompletionVerifier | Workflow | completion 可否と remaining work を判定する | 3.4, 6.1, 6.2, 6.4 | completion contract P0 | Service |
| KiroTaskProgressUpdater | Workflow | selected task の checkbox/blocker/notes を更新する | 4.3, 4.4, 5.4, 6.2, 6.3 | artifact policy P0 | State |
| IterativeImplementationValidationHarness | Validation | workflow drift と boundary violation を検出する | 7.1, 7.2, 7.3, 7.4, 7.5 | workflow YAML P0 | Batch |

### Workflow Layer

#### KiroImplementationWorkflow

| Field | Detail |
|-------|--------|
| Intent | `kiro-impl` の main workflow として one-task loop の順序を制御する |
| Requirements | 2.2, 2.4 |

**Responsibilities & Constraints**

- readiness gate、planning、execution、review、debug、completion verification、progress update の順序を workflow rule で表現する。
- selected task は workflow state の中心情報として扱い、同一 iteration で複数 task に拡張しない。
- `kiro-spec-batch` や roadmap orchestration には依存しない。

**Dependencies**

- Inbound: caller — feature 名を渡す (P0)
- Outbound: shared output contracts — rule condition の machine verdict を参照する (P0)
- Outbound: internal sub-workflows — review/debug/verify を呼ぶ (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

##### Service Interface

```typescript
interface KiroImplementationWorkflow {
  run(input: KiroImplInput): KiroImplResult;
}
```

- Preconditions: feature 名が解決できる。
- Postconditions: selected task が complete した場合だけ progress update が実行される。
- Invariants: 1 iteration の selected task は最大 1 件。

#### KiroImplementationReadinessGate

| Field | Detail |
|-------|--------|
| Intent | code edit 前に feature lifecycle と artifact consistency を確認する |
| Requirements | 1.1, 1.2, 1.4 |

**Responsibilities & Constraints**

- `spec.json`、phase artifacts、approval、ready state を status/validation contract に沿って読む。
- readiness 不足は `BLOCKED` として返し、artifact を生成・修正しない。

**Dependencies**

- Outbound: `kiro-status-validation-workflows` — readiness signal を参照する (P0)
- Outbound: `KiroArtifactAccessPolicy` — artifact missing/error category を参照する (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management

- State model: `.kiro/specs/<feature>/spec.json` と phase artifact の current state。
- Persistence & consistency: read-only。矛盾は finding として返す。
- Concurrency strategy: progress update 前に selected task の checkbox を再読する。

#### KiroOneTaskPlanner

| Field | Detail |
|-------|--------|
| Intent | `tasks.md` から eligible な 1 task と implementation plan を決める |
| Requirements | 1.3, 2.1, 2.2, 2.3, 3.1, 3.3 |

**Responsibilities & Constraints**

- unchecked task、dependency、blocker、task order から実行可能な task を選ぶ。
- `_Boundary:_`、`_Depends:_`、numeric requirement coverage、observable completion detail を plan に含める。
- `_Depends:_ none` は empty dependency set として解釈し、数値 dependency は同じ `tasks.md` 内の task id として解釈する。
- boundary が design と矛盾する場合は実装へ進めない。

**Dependencies**

- Inbound: `KiroImplementationReadinessGate` — ready state を受け取る (P0)
- Outbound: `.kiro/specs/<feature>/tasks.md` — task list を読む (P0)
- Outbound: `.kiro/specs/<feature>/design.md` — component boundary を照合する (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### Service Interface

```typescript
interface KiroOneTaskPlanner {
  selectTask(input: TaskPlanningInput): TaskPlanningResult;
}
```

- Preconditions: tasks artifact が存在し、generated/approved state が満たされている。
- Postconditions: `selectedTask` または blocking decision のどちらかを返す。
- Invariants: `selectedTask` は unchecked かつ dependency が満たされている。

#### KiroTaskExecutor

| Field | Detail |
|-------|--------|
| Intent | selected task の boundary 内で code edit と validation evidence を収集する |
| Requirements | 3.2, 3.4, 4.1, 4.2, 4.3 |

**Responsibilities & Constraints**

- plan に含まれる変更範囲だけを実装する。
- task に対応する test/build/check を実行し、command、result、未確認項目を分ける。
- validation failure では progress update を呼ばず、debug に必要な context を返す。

**Dependencies**

- Inbound: `KiroOneTaskPlanner` — selected task と validation plan を受け取る (P0)
- Outbound: repository source files — selected boundary 内で編集する (P0)
- Outbound: test runner/build command — evidence を収集する (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [x] / State [ ]

##### Batch / Job Contract

- Trigger: selected task が確定したとき。
- Input / validation: task boundary、dependency、validation plan、feature flag prerequisite。
- Output / destination: implementation result、changed files、validation evidence、manual verification requirement。
- Idempotency & recovery: retry は `KiroDebugSubWorkflow` の `RETRY_TASK` decision がある場合に限定する。

#### KiroReviewSubWorkflow

| Field | Detail |
|-------|--------|
| Intent | selected task の実装結果を task-local にレビューする |
| Requirements | 5.1, 5.2, 6.4 |

**Responsibilities & Constraints**

- review scope は selected task と関連 requirement/design boundary に限定する。
- verdict は shared `kiro-review-verdict` の machine field と human summary に分ける。
- `NO_GO` findings は actionable で、対象 task と requirement を持つ。

**Dependencies**

- Inbound: `KiroTaskExecutor` — implementation result と evidence を受け取る (P0)
- Outbound: `kiro-review-verdict` — verdict shape を参照する (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

#### KiroDebugSubWorkflow

| Field | Detail |
|-------|--------|
| Intent | validation failure と review finding から root cause と次 action を決める |
| Requirements | 2.3, 3.3, 5.3, 5.4 |

**Responsibilities & Constraints**

- root cause、retry eligibility、selected action、abort reason を分ける。
- `RETRY_TASK`、`BLOCK_TASK`、`STOP_FOR_HUMAN` を workflow rule が参照できる machine decision として返す。
- `STOP_FOR_HUMAN` では追加実装を続けない。

**Dependencies**

- Inbound: `KiroTaskExecutor`、`KiroReviewSubWorkflow` — failure context を受け取る (P0)
- Outbound: `kiro-debug-decision` — decision shape を参照する (P0)
- Outbound: `KiroTaskProgressUpdater` — blocker notes を残す場合に接続する (P1)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

#### KiroCompletionVerifier

| Field | Detail |
|-------|--------|
| Intent | checkbox 更新前に selected task の完了可否を検証する |
| Requirements | 3.4, 6.1, 6.2, 6.4 |

**Responsibilities & Constraints**

- implementation result、validation evidence、review verdict、remaining work を照合する。
- `COMPLETE`、`INCOMPLETE`、`BLOCKED` を shared contract に従って返す。
- evidence がない項目を complete 根拠に含めない。

**Dependencies**

- Inbound: `KiroTaskExecutor`、`KiroReviewSubWorkflow` — evidence と verdict を受け取る (P0)
- Outbound: `kiro-completion-verification` — completion shape を参照する (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

#### KiroTaskProgressUpdater

| Field | Detail |
|-------|--------|
| Intent | selected task の checkbox、blocker、implementation notes を安全に更新する |
| Requirements | 4.3, 4.4, 5.4, 6.2, 6.3 |

**Responsibilities & Constraints**

- completion verdict が `COMPLETE` の場合だけ selected task の checkbox を `- [x]` にする。
- `BLOCK_TASK` または `STOP_FOR_HUMAN` では checkbox を更新せず、blocker notes を selected task へ残す。
- selected task 外の progress artifact は変更しない。

**Dependencies**

- Inbound: `KiroCompletionVerifier`、`KiroDebugSubWorkflow` — completion/debug decision を受け取る (P0)
- Outbound: `.kiro/specs/<feature>/tasks.md` — selected task section だけを更新する (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management

- State model: selected task checkbox、blocker notes、implementation notes、verification evidence。
- Persistence & consistency: update 前に current checkbox を再読し、他 worker の変更があれば上書きしない。
- Concurrency strategy: selected task section のみを最小差分で更新する。

### Validation Layer

#### IterativeImplementationValidationHarness

| Field | Detail |
|-------|--------|
| Intent | implementation workflow の safety gate と boundary drift を検出する |
| Requirements | 7.1, 7.2, 7.3, 7.4, 7.5 |

**Responsibilities & Constraints**

- en/ja workflow/facet parity、shared contract reference、gate order を検証する。
- Kiro-specific implementation facet が `BuiltinFacetInheritancePolicy` に従い、継承可能な built-in facet を全文コピーしていないことを検証する。
- `kiro-impl` が `kiro-spec-*` generation、`kiro-spec-batch`、major-version surface、PR monitoring を成功条件にしていないことを検出する。
- full code edit behavior は実行せず、workflow contract の drift detection に限定する。

**Dependencies**

- Inbound: repository test runner — validation script を実行する (P0)
- Outbound: `.takt/{en,ja}/workflows/kiro-*.yaml`、`.takt/{en,ja}/facets/` — file references を検証する (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [x] / State [ ]

##### Batch / Job Contract

- Trigger: repository-local test/check。
- Input / validation: expected workflow/facet files、contract names、gate order、forbidden references。
- Output / destination: pass/fail と actionable finding。
- Idempotency & recovery: filesystem read-only validation として何度実行しても artifact を変更しない。

## Integration and Validation Notes

- validation test は既存 test/check command で検出される場所に追加し、`package.json` の script wiring と `kiro:*` script surface の追加は行わない。
- validation harness は shared contract 実装が未作成の場合に missing reference を明示するが、下流 PR/CI 状態は見ない。
- built-in facet を継承できる planning/execution/review/debug/verify instruction は親候補を棚卸しし、Kiro 固有の task boundary、checkbox 更新 gate、completion verification だけを差分として記述する。
- implementation workflow は他 worker の進捗と競合しうるため、progress update 前に `tasks.md` の selected task section を再読し、checkbox が変わっていれば更新を停止する。

## Open Questions / Risks

- selected task の implementation notes 形式は、上流 task generation の最終 artifact format と合わせて実装時に確認する。
- 既存 `cc-sdd-impl` の report directory 依存をどこまで Kiro 版に残すかは、workflow YAML 実装時に shared output contract と照合して決める。
- validation command の自動推定は過剰になりやすいため、task/design から明示できない項目は manual verification requirement に倒す。
