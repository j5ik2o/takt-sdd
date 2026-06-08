import test from "node:test";
import assert from "node:assert/strict";
import { validateKiroSharedContracts, validateKiroWorkflowCallBoundary } from "../scripts/validate-kiro-shared-contracts.mjs";
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
