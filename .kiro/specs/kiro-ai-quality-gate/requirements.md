# Requirements Document

## Project Description (Input)
takt-sdd の Kiro workflow 開発者は、Kiro-compatible な write/edit 系 workflow に AI 出力の最低品質ゲートを導入したい。現状は `kiro-impl` の実装結果が `review-task` へ直接進み、TAKT builtins に存在する `ai-antipattern-reviewer` / `ai-antipattern` policy / review-fix loop の資産を前段ゲートとして活用できていない。まず `kiro-impl` の `execute-task` 後に TAKT の `workflow_call` / callable subworkflow を使った `kiro-ai-quality-gate` を挟み、AIアンチパターンの review/fix loop、Kiro implementation 用の修正スコープ制約、`COMPLETE` / `need_replan` / `ABORT` の戻り値、後続 `review-task` と `verify-task-completion` による証跡確認、validation script / test による workflow shape 検出を確立したい。OpenSpec / `opsx:*` workflow への適用、requirements/design/tasks/discovery/batch への横展開、archive 機能はこの初期 spec の対象外とし、後続で別途検討する。

## Introduction
`kiro-ai-quality-gate` は、Kiro-compatible な write/edit 系 workflow の成果物を domain-specific review に渡す前に、AI特有のハルシネーション、スコープ逸脱、既存TAKT資産の不活用、証跡不足、修正したふりを検出・修復する最低品質ゲートである。

初期スコープでは `kiro-impl` の `execute-task` 後に適用し、後続の横展開に使える reusable な callable subworkflow 契約を確立する。OpenSpec / `opsx:*`、requirements/design/tasks/discovery/batch への横展開、archive 機能、上流 Kiro skill asset の直接変更は対象外とする。

## Requirements

### Requirement 1:

**User Story:** As a TAKT Kiro workflow maintainer, I want `kiro-impl` to pass implementation output through an AI quality gate before task review, so that downstream review does not spend effort on artifacts with obvious AI-generated defects.

#### Acceptance Criteria

1. When `execute-task` reports `STATUS READY_FOR_REVIEW`, the TAKT Kiro workflow set shall route the selected task result to the AI quality gate before `review-task`.
2. When the AI quality gate returns `COMPLETE`, the TAKT Kiro workflow set shall continue to `review-task`.
3. When the AI quality gate returns `need_replan`, the TAKT Kiro workflow set shall route the selected task back to `debug-task`.
4. When the AI quality gate returns `ABORT`, the TAKT Kiro workflow set shall stop the implementation workflow without updating task progress.

### Requirement 2:

**User Story:** As a TAKT Kiro workflow maintainer, I want the AI quality gate to be reusable as a callable Kiro subworkflow, so that the same quality gate contract can be expanded to other write/edit workflows after the initial `kiro-impl` rollout.

#### Acceptance Criteria

1. The TAKT Kiro workflow set shall provide a reusable AI quality gate contract for Kiro-compatible write/edit workflows.
2. When a caller invokes the AI quality gate with `artifact_scope: implementation`, the TAKT Kiro workflow set shall treat implementation reports and their changed files as the review target.
3. If required caller context is missing, the TAKT Kiro workflow set shall return a blocking result instead of allowing downstream review.
4. The TAKT Kiro workflow set shall keep OpenSpec / `opsx:*` workflows and Kiro horizontal rollout workflows out of the initial AI quality gate integration.

### Requirement 3:

**User Story:** As a TAKT Kiro workflow maintainer, I want the gate to reuse TAKT built-in AI antipattern review assets where compatible, so that existing TAKT quality knowledge is applied before Kiro-specific review.

#### Acceptance Criteria

1. When reviewing target artifacts, the TAKT Kiro workflow set shall evaluate AI-specific risks including hallucinated APIs, unverified assumptions, context mismatch, scope creep, unused or fabricated artifacts, and unsupported claims of completion.
2. The TAKT Kiro workflow set shall record AI antipattern review evidence in `kiro-ai-antipattern-review.md`.
3. If the AI antipattern review finds no blocking issue, the TAKT Kiro workflow set shall allow the gate to complete without unnecessary modification.
4. The TAKT Kiro workflow set shall preserve the existing Kiro task review as a downstream domain review rather than replacing it with the AI quality gate.

### Requirement 4:

**User Story:** As a TAKT Kiro workflow maintainer, I want AI antipattern findings to be repaired in a bounded loop, so that correctable AI defects are fixed before normal task review while persistent defects are sent back to planning/debug.

#### Acceptance Criteria

1. If the AI antipattern review finds actionable issues, the TAKT Kiro workflow set shall attempt a bounded fix within the selected task scope.
2. While actionable AI antipattern issues remain and the loop count is below 3, the TAKT Kiro workflow set shall continue the review/fix loop.
3. If actionable AI antipattern issues remain after 3 review attempts, the TAKT Kiro workflow set shall return `need_replan`.
4. If the gate cannot continue because required information, artifacts, or human decisions are missing, the TAKT Kiro workflow set shall return `ABORT`.

### Requirement 5:

**User Story:** As a Kiro implementation operator, I want AI quality gate fixes to stay inside the selected implementation task boundary, so that the gate cannot silently expand scope or mark progress prematurely.

#### Acceptance Criteria

1. When fixing an implementation-scope issue, the TAKT Kiro workflow set shall only change files justified by the selected task context and target implementation artifacts.
2. The TAKT Kiro workflow set shall not update `tasks.md` checkboxes or implementation progress notes from inside the AI quality gate.
3. If a fix requires task boundary changes, requirement/design reinterpretation, or progress updates, the TAKT Kiro workflow set shall return `need_replan`.
4. If target changed files cannot be resolved from implementation evidence, the TAKT Kiro workflow set shall return `ABORT`.

### Requirement 6:

**User Story:** As a downstream reviewer, I want every AI quality gate fix or no-fix decision to be recorded with evidence, so that false positives and unresolved risks can be audited.

#### Acceptance Criteria

1. The TAKT Kiro workflow set shall record AI antipattern fix decisions in `kiro-ai-antipattern-fix.md`.
2. When the gate fixes an issue, the TAKT Kiro workflow set shall include the affected finding, changed artifact summary, and verification evidence in the fix report.
3. If the gate decides that no fix is needed, the TAKT Kiro workflow set shall include evidence-backed rationale for each finding treated as false positive or overreach.
4. If evidence for a no-fix decision cannot be inspected, the TAKT Kiro workflow set shall return `ABORT`.

### Requirement 7:

**User Story:** As a TAKT Kiro workflow maintainer, I want downstream `review-task` and `verify-task-completion` to consume AI quality gate evidence, so that progress cannot be updated while unresolved AI antipattern findings remain.

#### Acceptance Criteria

1. When AI quality gate reports exist, `review-task` shall inspect unresolved findings, no-fix rationales, and scope guard evidence before accepting the implementation result.
2. When AI quality gate reports exist, `verify-task-completion` shall verify that the gate ended with an acceptable fix status before declaring the selected task safe to update.
3. If `review-task` rejects the AI quality gate evidence, the TAKT Kiro workflow set shall route the selected task through the existing review failure path.
4. The TAKT Kiro workflow set shall keep `update-progress` dependent on `verify-task-completion` output rather than making `update-progress` re-review AI gate reports.

### Requirement 8:

**User Story:** As a TAKT Kiro workflow maintainer, I want validation coverage for the new gate contract, so that future workflow edits cannot accidentally bypass the AI quality gate or drift from the agreed report contract.

#### Acceptance Criteria

1. The TAKT Kiro workflow set shall include validation coverage that fails when the AI quality gate workflow, `kiro-impl` routing, return statuses, loop threshold, or report contracts are missing.
2. The TAKT Kiro workflow set shall include test coverage for the initial `kiro-impl` AI quality gate integration.
3. The TAKT Kiro workflow set shall keep Japanese and English TAKT assets structurally aligned for the AI quality gate additions.
4. The TAKT Kiro workflow set shall document the project-local policy that upstream `.agents/skills/kiro-*` assets are not directly modified and TAKT workflow/facet prompts cover upstream ambiguity at higher prompt priority.
