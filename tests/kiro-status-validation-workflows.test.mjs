import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { validateKiroStatusValidationWorkflows } from "../scripts/validate-kiro-status-validation-workflows.mjs";

function makeValidationFixture() {
  const repoRoot = join(import.meta.dirname, "..");
  const root = mkdtempSync(join(tmpdir(), "kiro-status-validation-"));
  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  writeFile(root, "package.json", readFileSync(join(repoRoot, "package.json"), "utf8"));
  return root;
}

function writeFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function readFixtureFile(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function assertHasFailure(result, expected) {
  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes(expected)),
    `expected failure including "${expected}", got:\n${result.failures.join("\n")}`,
  );
}

test("kiro status validation workflows remain internally consistent", () => {
  const result = validateKiroStatusValidationWorkflows();
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test("task 14 rejects single-step or non-report read-only workflow shape", () => {
  const root = makeValidationFixture();
  writeFile(
    root,
    ".takt/en/workflows/kiro-validate-gap.yaml",
    [
      "name: kiro-validate-gap",
      "description: Broken single prompt wrapper",
      "max_steps: 1",
      "initial_step: prompt",
      "",
      "instructions:",
      "  kiro-validate-gap-readiness: ../facets/instructions/kiro-validate-gap-readiness.md",
      "",
      "report_formats:",
      "  kiro-validation-result: ../facets/output-contracts/kiro-validation-result.md",
      "",
      "steps:",
      "  - name: prompt",
      "    edit: false",
      "    required_permission_mode: readonly",
      "    instruction: kiro-validate-gap-readiness",
      "    output_contracts:",
      "      report:",
      "        - name: kiro-gap-validation-result.md",
      "          format: kiro-validation-result",
      "    rules:",
      "      - condition: DECISION GO",
      "        next: COMPLETE",
      "      - condition: DECISION NO-GO",
      "        next: ABORT",
      "      - condition: DECISION MANUAL_VERIFY_REQUIRED",
      "        next: ABORT",
    ].join("\n"),
  );

  const result = validateKiroStatusValidationWorkflows({ repoRoot: root });
  assertHasFailure(result, "must use read-only collect -> classify/validate -> report steps");
});

test("task 15 rejects validation facets without Kiro skill thin adapter metadata", () => {
  const root = makeValidationFixture();
  const path = ".takt/en/facets/instructions/kiro-validate-gap-readiness.md";
  writeFile(root, path, readFixtureFile(root, path).replace(/^extends_skill: .+\n/m, ""));

  const result = validateKiroStatusValidationWorkflows({ repoRoot: root });
  assertHasFailure(result, "must declare extends_skill: kiro-validate-gap");
});

test("task 16 rejects standalone validation workflows that route on validation.verdict instead of DECISION", () => {
  const root = makeValidationFixture();
  const path = ".takt/en/workflows/kiro-validate-impl.yaml";
  writeFile(root, path, readFixtureFile(root, path).replace("condition: DECISION GO", "condition: validation.verdict PASS"));

  const result = validateKiroStatusValidationWorkflows({ repoRoot: root });
  assertHasFailure(result, "must not route Kiro skill adapter results through validation.verdict or review.verdict");
});

test("task 16 rejects downstream adapter steps that stop using DECISION as the primary Kiro field", () => {
  const root = makeValidationFixture();
  const path = ".takt/en/workflows/kiro-impl.yaml";
  writeFile(root, path, readFixtureFile(root, path).replace("condition: DECISION GO", "condition: validation.verdict PASS"));

  const result = validateKiroStatusValidationWorkflows({ repoRoot: root });
  assertHasFailure(result, "must keep DECISION as the primary Kiro skill field");
});
