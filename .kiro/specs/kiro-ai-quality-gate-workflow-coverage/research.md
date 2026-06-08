# Gap Analysis: kiro-ai-quality-gate-workflow-coverage

## Analysis Context

- **Feature**: `kiro-ai-quality-gate-workflow-coverage`
- **Date**: 2026-06-08
- **Requirements status**: `requirements-generated`, not yet approved
- **Analysis scope**: `.takt/{en,ja}/workflows/kiro-*`, related Kiro facets, repository validators, and tests
- **External research**: Not needed. The feature is a brownfield TAKT workflow/facet/validator change using existing local runtime and built-in assets.

## Current State Summary

The repository already has a callable `kiro-ai-quality-gate` integrated into `kiro-impl`. That implementation covers the PR #90 lessons for implementation output:

- `kiro-impl` routes `execute-task -> ai-quality-gate -> review-task`.
- The caller uses `kind: workflow_call` and `call: ./kiro-ai-quality-gate.yaml`.
- `kiro-ai-quality-gate` uses built-in `ai-antipattern-reviewer`, `ai-antipattern`, `ai-antipattern-review`, and `loop-monitor-ai-antipattern-fix`.
- `kiro-impl` review / verify facets consume `kiro-ai-antipattern-review.md` and optional `kiro-ai-antipattern-fix.md`.
- `tests/kiro-ai-quality-gate-runtime-smoke.test.mjs` validates one deterministic runtime path through `npm run kiro:impl`.

The remaining Kiro workflow set has no comparable coverage inventory or generation-scoped AI gate:

- Generation workflows: `kiro-spec-requirements`, `kiro-spec-design`, `kiro-spec-tasks`, `kiro-spec-quick`.
- Single-step generation/init workflow: `kiro-spec-init`.
- Orchestration/decomposition workflows: `kiro-discovery`, `kiro-spec-batch`.
- Read-only workflows: `kiro-spec-status`, `kiro-validate-design`, `kiro-validate-gap`, `kiro-validate-impl`.

## Requirement-to-Asset Map

| Requirement | Existing assets | Gap |
|---|---|---|
| R1 coverage inventory | Kiro workflow files exist in both `.takt/en` and `.takt/ja`; validators enumerate Kiro workflows | Missing: explicit coverage category for every Kiro workflow |
| R2 eligibility by artifact boundary | Workflow YAML has `edit: true/false`; read-only validators reject edit behavior in status/validate workflows | Missing: eligibility model that distinguishes generation, implementation, orchestration, and read-only |
| R3 PR #90 six contracts | `kiro-iterative-implementation` validator enforces most six contracts for `kiro-impl`; shared validator allows only current call site | Missing: generalized validation for additional eligible Kiro callers |
| R4 generation-scoped gate | Spec generation workflows already have generate/review/repair/finalize loops | Missing: AI antipattern gate before domain review/finalize and generation-scoped fix instruction |
| R5 downstream evidence consumption | `kiro-review-task` and `kiro-verify-task-completion` consume implementation gate reports | Missing: equivalent evidence consumption rules for spec generation review/finalize steps |
| R6 read-only/orchestration boundary | `validate-kiro-status-validation-workflows` and shared validator enforce read-only shape | Missing: documented classification for discovery/batch and protection against mechanical gate insertion |
| R7 validator/smoke coverage | Existing validators and runtime smoke cover `kiro-impl`; test patterns are available | Missing: coverage validator and at least one deterministic smoke path for generation-scoped gate |
| R8 language/upstream boundary | en/ja parity patterns and `TAKT.md` policy exist | Missing: parity checks for new gate coverage assets and classification docs |

## Existing Implementation Details

### Kiro implementation gate

Relevant assets:

- `.takt/{en,ja}/workflows/kiro-ai-quality-gate.yaml`
- `.takt/{en,ja}/workflows/kiro-impl.yaml`
- `.takt/{en,ja}/facets/instructions/kiro-ai-antipattern-fix-implementation.md`
- `.takt/{en,ja}/facets/output-contracts/kiro-ai-antipattern-fix-result.md`
- `.takt/{en,ja}/facets/instructions/kiro-review-task.md`
- `.takt/{en,ja}/facets/instructions/kiro-verify-task-completion.md`
- `scripts/validate-kiro-iterative-implementation-workflow.mjs`
- `tests/kiro-iterative-implementation-workflow.test.mjs`
- `tests/kiro-ai-quality-gate-runtime-smoke.test.mjs`

The current gate is reusable at the workflow schema level because it accepts `fix_instruction` and `domain_knowledge` as facet refs. However, the current workflow description, report names, and validator assumptions are implementation-centered. The existing fix instruction explicitly targets implementation scope and forbids progress artifact updates. This should not be blindly reused for requirements/design/tasks drafts.

### Kiro spec generation workflows

Relevant workflows:

- `kiro-spec-requirements`: `generate-requirements -> review-requirements -> repair-requirements -> finalize-requirements`
- `kiro-spec-design`: `generate-design -> review-design -> repair-design -> finalize-design`
- `kiro-spec-tasks`: `generate-tasks -> review-tasks -> repair-tasks -> finalize-tasks`
- `kiro-spec-quick`: expanded sequence for init, requirements, design, tasks, sanity review

These workflows already defer artifact writing and lifecycle promotion until review/finalize boundaries:

- Draft generation/repair steps return draft content and keep `updatedFiles` empty.
- Dedicated read-only review steps inspect draft content.
- Finalize steps write artifacts and update `spec.json`.
- `loop_monitors.threshold` owns retry bounds.

This shape is a good insertion point for AI quality checks, but gate placement needs care. The least disruptive candidate is between draft generation/repair and domain review:

- `generate-requirements -> ai-quality-gate -> review-requirements`
- `repair-requirements -> ai-quality-gate -> review-requirements`
- analogous design/tasks/quick phase paths

If the gate is placed after domain review, AI-specific defects may be found too late, after the domain reviewer has already spent effort. If placed before draft readiness, the gate may not have stable artifacts to inspect.

### Read-only workflows

Relevant workflows:

- `kiro-spec-status`
- `kiro-validate-design`
- `kiro-validate-gap`
- `kiro-validate-impl`

These already follow read-only collect/classify-or-validate/report shapes and validators reject:

- `loop_monitors`
- `edit: true`
- `required_permission_mode: edit`
- repair/debug steps
- nested Kiro workflow calls

They should remain out of AI fix loop scope. A validator should detect accidental gate insertion here.

### Orchestration workflows

Relevant workflows:

- `kiro-discovery`
- `kiro-spec-batch`

`kiro-discovery` can write `brief.md` and roadmap artifacts. `kiro-spec-batch` orchestrates dependency waves, worker dispatch, cross-spec review, remediation coordination, and batch finalization. These are not pure read-only workflows, but their responsibility is not identical to requirements/design/tasks artifact generation.

The likely design posture is:

- classify them explicitly;
- do not add the generation gate mechanically;
- decide whether artifact-level AI review belongs inside discovery/batch or is delegated to downstream spec generation workflows.

## Validator Constraints and Integration Risks

### Shared workflow_call boundary

`scripts/validate-kiro-shared-contracts.mjs` currently allows exactly one Kiro `workflow_call`: the `ai-quality-gate` step in `kiro-impl.yaml` with `call: ./kiro-ai-quality-gate.yaml`. Any new Kiro caller will fail unless this allowlist evolves.

Risk: simply adding `workflow_call` to spec generation workflows will break shared validation.

Design implication: introduce an explicit allowlist model keyed by workflow name, step name, and relative call path, and keep every other nested Kiro workflow call forbidden.

### Spec generation workflow_call prohibition

`scripts/validate-kiro-spec-generation-workflows.mjs` rejects `workflow_call` in `kiro-spec-quick.yaml` to prevent quick path from delegating to standalone workflows. That rule is correct for phase reuse, but it will conflict with an AI gate if implemented via `workflow_call` inside quick.

Risk: a naive gate insertion into `kiro-spec-quick` will trip an existing validator that was designed for a different failure mode.

Design implication: either narrow the prohibition to phase workflow calls, or implement quick AI gate coverage as expanded steps instead of `workflow_call`. The design must preserve the intent that quick does not shell out or call standalone phase workflows.

### Existing implementation validator is gate-specific

`validate-kiro-iterative-implementation-workflow.mjs` contains detailed checks for:

- `kiro-impl` caller routing;
- `kiro-ai-quality-gate` shape;
- built-in review vocabulary;
- optional fix report semantics;
- loop monitor and replan routing;
- runtime smoke alignment.

Risk: duplicating this logic for generation workflows could create parallel validator drift and large spaghetti condition growth.

Design implication: factor reusable validation helpers or create a dedicated Kiro AI gate coverage validator that shares the contract terms instead of copy-pasting checks into multiple validators.

## Gaps

### Missing capabilities

- No coverage inventory artifact or validator-backed classification for all Kiro workflows.
- No generation-scoped AI fix instruction.
- No generation-scoped AI fix output contract if implementation fix result semantics are too task-specific.
- No caller routing for AI quality gate in spec generation workflows.
- No downstream generation review/finalize evidence consumption rules for AI gate reports.
- No validator coverage for eligible generation workflows bypassing gate coverage.
- No deterministic runtime smoke for generation-scoped AI gate wiring.
- No updated shared `workflow_call` boundary model for multiple approved gate call sites.

### Constraints

- Read-only validation/status workflows must stay read-only.
- Quick path must not use `workflow_call` for phase reuse or shell out to nested `takt`.
- `cc-sdd-*`, `opsx-*`, OpenSpec-compatible workflows, and upstream `.agents/skills/kiro-*` are out of scope.
- en/ja assets must remain structurally aligned.
- Prompt prose is insufficient; validation/test coverage must enforce the wiring.

### Research Needed in design phase

- Decide whether the existing `kiro-ai-quality-gate.yaml` should become scope-neutral through parameterized fix instructions, or whether a separate `kiro-spec-ai-quality-gate.yaml` is cleaner.
- Decide report naming for generation-scoped AI reports to avoid ambiguity between implementation and generation runs.
- Decide whether `kiro-spec-init` should be covered by a gate or explicitly classified as not applicable due to minimal template-based initialization.
- Decide whether `kiro-discovery` and `kiro-spec-batch` own any AI quality gate behavior or only classify/delegate to downstream generation workflows.

## Implementation Options

### Option A: Extend existing `kiro-ai-quality-gate`

Extend the existing callable gate by passing a generation-specific `fix_instruction` and domain knowledge. Keep one gate workflow and add callers from eligible generation workflows.

**Pros**

- Reuses PR #90 runtime-proven callable workflow.
- Minimizes new workflow files.
- Keeps the six-contract implementation in one place.

**Cons**

- Current gate name, description, reports, and validator checks are implementation-colored.
- A single gate may accumulate conditional language for implementation vs generation scope.
- Quick path and shared workflow_call validators still need careful allowlist updates.

**Effort**: M  
**Risk**: Medium. Good reuse, but risk of overgeneralizing the implementation gate.

### Option B: Create a generation-scoped callable gate

Add `kiro-spec-ai-quality-gate.yaml` with generation-specific fix instruction and report semantics. Use it only from requirements/design/tasks generation workflows and potentially quick.

**Pros**

- Keeps implementation and spec generation boundaries explicit.
- Avoids overloading implementation fix report semantics.
- Makes downstream review/finalize evidence rules easier to state.

**Cons**

- More files and more validator coverage.
- Some six-contract checks will be duplicated unless helpers are extracted.
- Runtime smoke must cover at least one new generation path.

**Effort**: M to L  
**Risk**: Medium. Cleaner boundary, but more integration points.

### Option C: Inventory and validator first, gate rollout second

First implement the coverage inventory and validators that classify all Kiro workflows and detect illegal gate placement. Then add generation-scoped gate coverage in a follow-up.

**Pros**

- Reduces risk of mechanical over-application.
- Forces explicit discovery/batch/init/read-only decisions before wiring changes.
- Can be small and reviewable.

**Cons**

- Does not immediately protect generation artifacts.
- Requires a second implementation slice.

**Effort**: S to M  
**Risk**: Low. Primarily validation/documentation, less runtime behavior change.

### Option D: Hybrid rollout

Implement an explicit coverage inventory and validator model first, then add generation-scoped gate coverage for the highest-value generation workflows (`kiro-spec-requirements`, `kiro-spec-design`, `kiro-spec-tasks`) in the same spec. Treat `kiro-spec-quick`, `kiro-spec-init`, `kiro-discovery`, and `kiro-spec-batch` as explicit design decisions rather than automatic targets.

**Pros**

- Balances behavior change with classification safety.
- Keeps design from pushing gate calls into every workflow.
- Provides immediate value on the main generation phases.
- Leaves quick/discovery/batch ambiguity visible instead of hidden.

**Cons**

- More design decisions than Option C.
- Needs careful validator refactoring to avoid duplicated gate checks.

**Effort**: L  
**Risk**: Medium. Broad but bounded; best aligned with requirements.

## Recommended Direction for Design

Use Option D unless the design phase finds `workflow_call` validator changes too invasive. The design should:

- introduce an explicit Kiro AI gate coverage inventory;
- make workflow eligibility a first-class validation concept;
- prefer a generation-scoped gate or clearly parameterized shared gate over reusing the implementation fix instruction blindly;
- update shared workflow_call boundary checks through an allowlist rather than weakening the nested workflow ban;
- protect read-only workflows with negative tests;
- add one deterministic runtime smoke path for generation-scoped gate wiring;
- keep quick/discovery/batch decisions explicit and conservative.

## Complexity and Risk

- **Effort**: L. The feature spans workflow YAML, facets, validators, tests, and runtime smoke coverage across en/ja assets.
- **Risk**: Medium. The behavior change is constrained to Kiro workflows, but validator allowlists and quick path composition rules can regress if broadened carelessly.

## Open Questions for Design

1. Should generation-scoped gate reports reuse `kiro-ai-antipattern-review.md` / `kiro-ai-antipattern-fix.md`, or use phase-specific names such as `kiro-spec-ai-antipattern-review.md`?
2. Should `kiro-spec-quick` call a gate subworkflow or inline equivalent gate steps to preserve the existing quick-path no-workflow-call rule?
3. Is `kiro-spec-init` sufficiently template-bound to classify as intentionally not applicable?
4. Should `kiro-discovery` output be AI-reviewed in discovery, or should `brief.md` risk be handled when `kiro-spec-init` / generation reads it?
5. Should `kiro-spec-batch` only aggregate worker results and delegate artifact-level AI review to the generation workers?

## Design Synthesis Update

### Discovery Type

Light discovery was sufficient because this is an extension of existing TAKT workflow, facet, validator, and test assets. No new external dependency is introduced.

### Decisions

- Use a separate `kiro-spec-ai-quality-gate.yaml` rather than making the implementation gate scope-neutral. This keeps implementation progress semantics separate from spec generation draft semantics.
- Use generation-specific report names: `kiro-spec-ai-antipattern-review.md` and optional `kiro-spec-ai-antipattern-fix.md`. This avoids ambiguity when a run contains both implementation and spec generation evidence.
- Keep `kiro-spec-quick` on the reusable subworkflow path, but narrow the existing validator prohibition: quick still must not call standalone phase workflows, while `./kiro-spec-ai-quality-gate.yaml` is the only allowed gate call.
- Classify `kiro-spec-init` as intentionally not applicable because it initializes the spec shell from brief/template inputs and does not have a stable generated draft review boundary.
- Classify `kiro-discovery` and `kiro-spec-batch` as orchestration delegated. Discovery/batch do not gain artifact-level AI fix loops in this spec; downstream spec generation workflows own artifact-level gate coverage.
- Put the authoritative machine-readable coverage inventory and call allowlist in `scripts/kiro-ai-quality-gate-contracts.mjs`. Keep `.takt/{en,ja}/facets/policies/kiro-ai-quality-gate-coverage.md` as a human-facing explanation of category semantics and decision criteria, not as a duplicated per-workflow classification table.

### Boundary Synthesis

The main boundary is not "all Kiro workflows get a gate." The boundary is "workflow outputs that become spec artifacts through generation/review/finalize get a generation-scoped AI gate, and every other Kiro workflow gets an explicit classification." This preserves read-only workflows and prevents orchestration workflows from silently becoming edit/fix workflows.

Coverage classification has one canonical machine source. The policy facet explains the meaning of the categories and how operators should reason about them, but does not duplicate the workflow-by-workflow table.

### Implementation Risk Notes

- `validate-kiro-shared-contracts.mjs` currently allows only the `kiro-impl` call site. The design requires an allowlist helper rather than weakening the nested workflow ban.
- `validate-kiro-spec-generation-workflows.mjs` currently rejects `workflow_call` in `kiro-spec-quick.yaml`. The design narrows that check to reject phase workflow reuse while allowing the single approved AI quality gate call.
- The validator surface can grow quickly if every script copies PR #90 checks. The design centralizes contract vocabulary and allowed call sites in one helper to avoid validator drift.
