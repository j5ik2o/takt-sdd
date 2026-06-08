import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getKiroWorkflowCoverageEntries,
  kiroWorkflowCoverageCategories,
} from "../scripts/kiro-ai-quality-gate-contracts.mjs";

const repoRoot = join(import.meta.dirname, "..");
const languages = ["en", "ja"];

function listKiroWorkflowNames(language) {
  return readdirSync(join(repoRoot, ".takt", language, "workflows"))
    .filter((file) => file.startsWith("kiro-") && file.endsWith(".yaml"))
    .map((file) => file.replace(/\.yaml$/, ""))
    .sort();
}

test("kiro AI quality gate coverage inventory classifies every Kiro workflow exactly once", () => {
  const entries = getKiroWorkflowCoverageEntries();
  const entryNames = entries.map((entry) => entry.workflowName).sort();

  assert.deepEqual(listKiroWorkflowNames("en"), listKiroWorkflowNames("ja"));
  assert.deepEqual(entryNames, listKiroWorkflowNames("en"));
  assert.equal(new Set(entryNames).size, entryNames.length);

  for (const entry of entries) {
    assert.ok(kiroWorkflowCoverageCategories.includes(entry.category), `${entry.workflowName} category is known`);
    assert.match(entry.reason, /\S/, `${entry.workflowName} has an observable reason`);
  }
});

test("kiro AI quality gate coverage inventory records current Kiro workflow boundaries", () => {
  const byName = new Map(getKiroWorkflowCoverageEntries().map((entry) => [entry.workflowName, entry]));

  assert.equal(byName.get("kiro-impl").category, "existing_gate_coverage");
  assert.equal(byName.get("kiro-impl").allowedGateCall, "./kiro-ai-quality-gate.yaml");
  assert.equal(byName.get("kiro-spec-requirements").category, "generation_scoped_gate_required");
  assert.equal(byName.get("kiro-spec-requirements").allowedGateCall, "./kiro-spec-ai-quality-gate.yaml");
  assert.equal(byName.get("kiro-spec-quick").category, "generation_scoped_gate_required");
  assert.equal(byName.get("kiro-spec-init").category, "intentionally_not_applicable");
  assert.equal(byName.get("kiro-discovery").category, "orchestration_delegated");
  assert.equal(byName.get("kiro-spec-batch").category, "orchestration_delegated");

  for (const name of ["kiro-spec-status", "kiro-validate-design", "kiro-validate-gap", "kiro-validate-impl"]) {
    assert.equal(byName.get(name).category, "read_only_out_of_scope", `${name} stays read-only`);
  }
});

test("kiro AI quality gate coverage policy facets explain categories without duplicating the inventory table", () => {
  const workflowNames = listKiroWorkflowNames("en");
  const requiredTerms = [
    "scripts/kiro-ai-quality-gate-contracts.mjs",
    "existing_gate_coverage",
    "generation_scoped_gate_required",
    "orchestration_decision_required",
    "orchestration_delegated",
    "read_only_out_of_scope",
    "intentionally_not_applicable",
    "maintainer_decision_required",
    "roadmap checkbox",
  ];

  for (const language of languages) {
    const path = join(repoRoot, ".takt", language, "facets", "policies", "kiro-ai-quality-gate-coverage.md");
    const content = readFileSync(path, "utf8");

    for (const term of requiredTerms) {
      assert.ok(content.includes(term), `${path} should include ${term}`);
    }
    for (const workflowName of workflowNames) {
      assert.equal(content.includes(`| ${workflowName} `), false, `${path} must not duplicate the inventory table`);
    }
  }
});
