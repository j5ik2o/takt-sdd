{extends: plan}

## Kiro Skill Source

Before executing this instruction, invoke `$kiro-spec-init` or `/kiro-spec-init` and read the resolved `SKILL.md`.
Apply the `## Execution Steps` section from `$kiro-spec-init` or `/kiro-spec-init` as this step's source of truth.
This facet defines only the adapter delta for the TAKT workflow.

# Kiro Spec Init Instruction

## Kiro-specific delta

Initialize one `.kiro/specs/<feature>/` directory. The output state is `initialized`, with `spec.json` and draft `requirements.md` written consistently. Keep this phase limited to spec initialization; do not update roadmap or OpenSpec artifacts.

## Inputs

- `featureName` or a feature name candidate from the invocation.
- An invocation description.
- Optional `.kiro/specs/<feature>/brief.md`.
- Template guidance from `.kiro/settings/templates/specs/init.json` and `.kiro/settings/templates/specs/requirements-init.md`.

## Initialization procedure

1. Resolve the canonical feature directory as `.kiro/specs/<feature>/`.
2. Choose the description source:
   - If `brief.md` exists, use `brief.md` as the description source.
   - Otherwise, use the invocation description as the description source.
3. If the target directory is a brief-only directory, reuse it. A brief-only directory contains `brief.md` and no initialized `spec.json`, `requirements.md`, `design.md`, or `tasks.md`.
4. If the feature directory already contains `spec.json`, `requirements.md`, `design.md`, or `tasks.md`, treat it as a feature name conflict. Return `validation.verdict: "BLOCKED"` with `blockingReason: "feature name conflict"` and do not overwrite the existing spec.
5. Read `.kiro/settings/templates/specs/init.json` for the initial `spec.json` and `.kiro/settings/templates/specs/requirements-init.md` for draft `requirements.md`. If either required template or local equivalent cannot be found, return `BLOCKED` with a template finding instead of inventing a new structure.
6. Write `.kiro/specs/<feature>/spec.json` with:
   - `feature_name`: the canonical feature name.
   - `phase`: `initialized`.
   - `approvals.requirements.generated`: false.
   - `approvals.requirements.approved`: false.
   - `approvals.design.generated`: false.
   - `approvals.design.approved`: false.
   - `approvals.tasks.generated`: false.
   - `approvals.tasks.approved`: false.
   - `ready_for_implementation`: false.
7. Write draft `.kiro/specs/<feature>/requirements.md` from the selected description source and template. The draft may be incomplete, but it must be explicit that requirements are not generated or approved yet.
8. Preserve `brief.md` unchanged when it exists.
9. Do not edit `.kiro/steering/roadmap.md`, `roadmap.md`, `openspec/`, or any OpenSpec artifact during init.

## Result mapping

- On success, return `phase: "init"`, `validation.verdict: "PASS"`, `featureName`, `updatedFiles` containing `spec.json` and `requirements.md`, and `nextAction` pointing to `kiro-spec-requirements`.
- On a feature name conflict, template problem, missing description source, or unsafe artifact write, return `validation.verdict: "BLOCKED"` and keep `updatedFiles` empty or limited to files that were already safely written.
- `evidence` must mention the resolved description source, whether a brief-only directory was reused, the template source used, and that roadmap/OpenSpec artifacts were not updated.
