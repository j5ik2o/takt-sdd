import test from "node:test";
import assert from "node:assert/strict";
import { validateKiroStatusValidationWorkflows } from "../scripts/validate-kiro-status-validation-workflows.mjs";

test("kiro status validation workflows remain internally consistent", () => {
  const result = validateKiroStatusValidationWorkflows();
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});
