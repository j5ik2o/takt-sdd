import test from "node:test";
import assert from "node:assert/strict";
import {
  validateKiroSharedContracts,
  validateKiroSkillSourceInstruction,
  validateKiroWorkflowCallBoundary,
} from "../scripts/validate-kiro-shared-contracts.mjs";
import {
  getAllowedKiroAiQualityGateCallSites,
  getKiroAiQualityGateContractTerms,
} from "../scripts/kiro-ai-quality-gate-contracts.mjs";

test("kiro shared workflow contracts remain internally consistent", () => {
  const result = validateKiroSharedContracts();
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test("workflow_call boundary allows only the Kiro AI quality gate call site", () => {
  const content = `name: kiro-impl
steps:
  - name: ai-quality-gate
    kind: workflow_call
    call: ./kiro-ai-quality-gate.yaml
  - name: hidden-nested-workflow
    kind: workflow_call
    call: ./kiro-spec-design.yaml
`;

  const failures = validateKiroWorkflowCallBoundary(content, "kiro-impl.yaml", ".takt/en/workflows/kiro-impl.yaml");

  assert.deepEqual(failures, [".takt/en/workflows/kiro-impl.yaml must not use workflow_call for Kiro workflow reuse"]);
});

test("Kiro skill adapter facets must instruct runtime agents to read the source skill", () => {
  const failures = validateKiroSkillSourceInstruction(
    `{extends: review-coding}

# Adapter

Return VERDICT only.
`,
    { label: "kiro-review-task.md" },
  );

  assert.deepEqual(failures, ["kiro-review-task.md missing Kiro Skill Source skill name or section instruction"]);
});

test("Kiro skill adapter source instruction accepts explicit skill and section references", () => {
  const failures = validateKiroSkillSourceInstruction(
    [
      "## Kiro Skill Source",
      "",
      "Before executing this instruction, invoke `$kiro-review` or `/kiro-review` and read the resolved `SKILL.md`.",
      "Apply the `## Outputs` section from `$kiro-review` or `/kiro-review` as this step's source of truth.",
      "This facet defines only the adapter delta for the TAKT workflow.",
    ].join("\n"),
    { skill: "kiro-review", section: "## Outputs", label: "kiro-review-task.md" },
  );

  assert.deepEqual(failures, []);
});

test("workflow_call boundary allows approved implementation and spec generation gate call sites", () => {
  const callSites = getAllowedKiroAiQualityGateCallSites();
  assert.ok(callSites.some((site) => site.workflowName === "kiro-impl" && site.callPath === "./kiro-ai-quality-gate.yaml"));
  assert.ok(
    callSites.some(
      (site) =>
        site.workflowName === "kiro-spec-requirements" &&
        site.stepName === "ai-quality-gate-requirements" &&
        site.callPath === "./kiro-spec-ai-quality-gate.yaml",
    ),
  );
  assert.ok(
    callSites.some(
      (site) =>
        site.workflowName === "kiro-spec-quick" &&
        site.stepName === "quick-ai-quality-gate-tasks" &&
        site.callPath === "./kiro-spec-ai-quality-gate.yaml",
    ),
  );

  const requirementsGate = `name: kiro-spec-requirements
steps:
  - name: ai-quality-gate-requirements
    kind: workflow_call
    call: ./kiro-spec-ai-quality-gate.yaml
`;
  assert.deepEqual(validateKiroWorkflowCallBoundary(requirementsGate, "kiro-spec-requirements.yaml"), []);

  const quickGate = `name: kiro-spec-quick
steps:
  - name: quick-ai-quality-gate-tasks
    kind: workflow_call
    call: ./kiro-spec-ai-quality-gate.yaml
  - name: quick-phase-reuse
    kind: workflow_call
    call: ./kiro-spec-tasks.yaml
`;
  assert.deepEqual(validateKiroWorkflowCallBoundary(quickGate, "kiro-spec-quick.yaml"), [
    "kiro-spec-quick.yaml must not use workflow_call for Kiro workflow reuse",
  ]);
});

test("workflow_call boundary accepts every helper-approved gate call site", () => {
  for (const site of getAllowedKiroAiQualityGateCallSites()) {
    const content = `name: ${site.workflowName}
steps:
  - name: ${site.stepName}
    kind: workflow_call
    call: ${site.callPath}
`;

    assert.deepEqual(validateKiroWorkflowCallBoundary(content, `${site.workflowName}.yaml`), []);
  }
});

test("Kiro AI quality gate contract terms expose PR 90 wiring semantics", () => {
  const terms = getKiroAiQualityGateContractTerms();

  assert.deepEqual(terms.implementation.reviewReports, ["kiro-ai-antipattern-review.md"]);
  assert.deepEqual(terms.implementation.optionalFixReports, ["kiro-ai-antipattern-fix.md"]);
  assert.deepEqual(terms.specGeneration.reviewReports, ["kiro-spec-ai-antipattern-review.md"]);
  assert.deepEqual(terms.specGeneration.optionalFixReports, ["kiro-spec-ai-antipattern-fix.md"]);
  assert.ok(terms.shared.routingTerms.includes("No AI-specific issues"));
  assert.ok(terms.shared.catchAllTerms.includes("ambiguous"));
  assert.ok(terms.shared.loopOutcomeTerms.includes("need_replan"));
});
