import test from "node:test";
import assert from "node:assert/strict";
import { validateKiroSharedContracts, validateKiroWorkflowCallBoundary } from "../scripts/validate-kiro-shared-contracts.mjs";

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
