---
extends_skill: kiro-discovery
extends_skill_section: "## Step 2: Determine Action Path"
---

{extends: plan}

# Kiro Discovery Instruction

## Kiro-specific delta

Classify a user work request into one Kiro discovery `actionPath` and decide whether to stop, write `brief.md`, update `.kiro/steering/roadmap.md`, or return `blockingReason`. Keep this adapter limited to routing and artifact planning; do not generate requirements, design, tasks, or implementation edits.

## Inputs

- User work request and optional feature name hint.
- Existing `.kiro/specs/*/spec.json` inventory.
- Existing `.kiro/steering/roadmap.md` when present.
- Steering file existence under `.kiro/steering/`.
- `kiro-discovery-routing` policy.

## Routing Procedure

1. Collect lightweight project context: spec inventory, roadmap presence, and top-level structure.
2. Select exactly one `actionPath`: `EXISTING_SPEC_UPDATE`, `DIRECT_IMPLEMENTATION`, `SINGLE_SPEC`, `MULTI_SPEC`, or `MIXED_DECOMPOSITION`.
3. For `EXISTING_SPEC_UPDATE` and `DIRECT_IMPLEMENTATION`, do not write new discovery artifacts. Return a concrete `nextAction`.
4. For `SINGLE_SPEC`, plan or write `.kiro/specs/<feature>/brief.md`.
5. For `MULTI_SPEC` and `MIXED_DECOMPOSITION`, plan or write `.kiro/steering/roadmap.md` and each new spec `brief.md`.
6. Roadmap checklist markers represent spec readiness only. Keep new or unapproved specs as `[ ]`; use `[x]` only when `spec.json.phase == "tasks-generated"`, requirements/design/tasks approvals, `ready_for_implementation == true`, and required artifact existence are confirmed.
7. Read implementation progress from task checkboxes in `.kiro/specs/<feature>/tasks.md`; do not infer implementation completion from roadmap markers.
8. For `MIXED_DECOMPOSITION`, keep existing spec updates and direct implementation candidates as `awarenessOnlyItems`.
9. If the action path or boundary ownership is ambiguous, return `blockingReason` and keep `createdFiles` empty.

## Brief Artifact Structure

When discovery writes `.kiro/specs/<feature>/brief.md`, include these sections exactly so `kiro-spec-init` can use the file as source of truth:

- `## Problem`
- `## Current State`
- `## Desired Outcome`
- `## Approach`
- `## Scope`
- `## Boundary Candidates`
- `## Out of Boundary`
- `## Upstream / Downstream`

Keep the brief scoped to the target feature. Do not place existing spec updates or direct implementation candidates inside a new feature brief unless they are explicitly marked as adjacent context.

## Output Mapping

- Return `kiro-discovery-result` with `actionPath`, `reason`, `createdFiles`, `plannedFiles`, `nextAction`, `blockingReason`, and `awarenessOnlyItems`.
- Preserve JSON key, path, script name, and enum spelling exactly.
- Do not mix OpenSpec artifacts into `.kiro/*` discovery artifact source of truth.

## Discovery AI Gate Evidence

Before `report-discovery` returns completion for `SINGLE_SPEC`, `MULTI_SPEC`, or `MIXED_DECOMPOSITION`, inspect the namespaced subworkflow evidence for the current run:

- `reports/subworkflows/iteration-*--step-ai-quality-gate-discovery--workflow-kiro-discovery-ai-quality-gate/kiro-discovery-ai-antipattern-review.md`
- optional fix report: `reports/subworkflows/iteration-*--step-ai-quality-gate-discovery--workflow-kiro-discovery-ai-quality-gate/kiro-discovery-ai-antipattern-fix.md`

Treat unresolved findings, stale evidence, cross-run evidence, evidence-free no-fix claims, or implementation/spec generation report names such as `kiro-ai-antipattern-review.md` and `kiro-spec-ai-antipattern-review.md` as not complete. Missing `kiro-discovery-ai-antipattern-fix.md` is acceptable only when the first-pass `kiro-discovery-ai-antipattern-review.md` reports no blocking findings.
