## 1. Major-Version Surface

- [ ] 1.1 Bump `package.json` to the next major version and update package metadata affected by the breaking workflow surface.
- [ ] 1.2 Replace canonical npm scripts with `kiro:*` entrypoints and decide whether old `cc-sdd:*` scripts are removed or retained as migration shims.
- [ ] 1.3 Update README and agent guidance to explain the breaking migration from `cc-sdd:*` to TAKT-native `kiro:*` workflows.

## 2. Shared Kiro Workflow Contracts

- [ ] 2.1 Add shared output contracts for Kiro status, validation result, review verdict, debug decision, and completion verification.
- [ ] 2.2 Add a skill identity resolver that normalizes `kiro-impl`, `$kiro-impl`, and `/kiro-impl` style references and chooses host-specific source roots such as `.claude/skills` or `.agents/skills`.
- [ ] 2.3 Add shared instructions and policies for reading `.kiro/steering/`, resolving feature names, and updating `.kiro/specs/<feature>/spec.json`.
- [ ] 2.4 Add workflow validation checks that cover the new Kiro workflow YAML, facet file references, and skill source resolution.

## 3. Status and Validation Workflows

- [ ] 3.1 Implement `kiro-spec-status` as a read-only TAKT workflow that reports feature phase, approvals, and readiness.
- [ ] 3.2 Implement `kiro-validate-gap` and `kiro-validate-design` as TAKT workflows with parseable GO/NO-GO outputs.
- [ ] 3.3 Implement `kiro-validate-impl` as a TAKT workflow that checks task completion, tests/build evidence, and remaining manual verification requirements.

## 4. Specification Generation Workflows

- [ ] 4.1 Implement `kiro-spec-init` and `kiro-spec-requirements` as TAKT workflows that create or update `.kiro/specs/<feature>/spec.json` and `requirements.md`.
- [ ] 4.2 Implement `kiro-spec-design` as a TAKT workflow that generates `design.md` and `research.md` from approved requirements and gap context.
- [ ] 4.3 Implement `kiro-spec-tasks` as a TAKT workflow that generates boundary-aware `tasks.md` from approved design and requirements.
- [ ] 4.4 Implement `kiro-spec-quick` as a TAKT workflow or script composition that runs init, requirements, design, and tasks with explicit approval behavior.

## 5. Discovery and Batch Workflows

- [ ] 5.1 Implement `kiro-discovery` as a TAKT workflow that routes new work into direct implementation, single spec, multi-spec roadmap, existing spec update, or mixed decomposition.
- [ ] 5.2 Implement `kiro-spec-batch` as a TAKT-controlled dependency-wave workflow that reads `.kiro/steering/roadmap.md` and creates pending specs.
- [ ] 5.3 Add cross-spec review behavior for batch output to detect duplicated ownership, interface mismatch, dependency gaps, and boundary overlap.

## 6. Iterative Implementation Workflow

- [ ] 6.1 Implement `kiro-impl` planning as a TAKT workflow step that selects exactly one eligible task from `.kiro/specs/<feature>/tasks.md`.
- [ ] 6.2 Implement the one-task execution step with task boundary, dependency, validation-command, and feature-flag guidance.
- [ ] 6.3 Implement `kiro-review` as an internal review sub-workflow with an APPROVED/REJECTED output contract.
- [ ] 6.4 Implement `kiro-debug` as an internal debug sub-workflow with RETRY_TASK, BLOCK_TASK, and STOP_FOR_HUMAN decisions.
- [ ] 6.5 Implement `kiro-verify-completion` as an internal completion gate before updating `tasks.md`.
- [ ] 6.6 Implement task checkbox updates, blocker notes, and implementation notes only after the required gates pass.

## 7. Verification

- [ ] 7.1 Add representative `.kiro` fixture projects or smoke tests for status, validation, spec generation, batch, and implementation routing.
- [ ] 7.2 Run TAKT workflow/facet validation for both Japanese and English workflow sets included in the release scope.
- [ ] 7.3 Run OpenSpec strict validation for `takt-native-kiro-workflows`.
- [ ] 7.4 Run repository formatting and diff checks before publishing the major-version change.
