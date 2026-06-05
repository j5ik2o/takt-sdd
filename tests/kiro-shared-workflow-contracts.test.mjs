import test from "node:test";
import assert from "node:assert/strict";
import { validateKiroSharedContracts } from "../scripts/validate-kiro-shared-contracts.mjs";

test("kiro shared workflow contracts remain internally consistent", () => {
  const result = validateKiroSharedContracts();
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});
