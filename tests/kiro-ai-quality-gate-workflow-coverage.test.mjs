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

test("spec generation AI quality gate workflow is callable and separates spec reports from implementation reports", () => {
  const requiredTerms = [
    "subworkflow:",
    "callable: true",
    "visibility: internal",
    "kiro-spec-ai-antipattern-review.md",
    "kiro-spec-ai-antipattern-fix.md",
    "No AI-specific issues",
    "AI-specific issues found",
    "request-replan",
    "ambiguous",
    "blocked",
    "internally inconsistent",
    "return: need_replan",
  ];

  for (const language of languages) {
    const path = join(repoRoot, ".takt", language, "workflows", "kiro-spec-ai-quality-gate.yaml");
    const content = readFileSync(path, "utf8");

    for (const term of requiredTerms) {
      assert.ok(content.includes(term), `${path} should include ${term}`);
    }
    assert.equal(content.includes("kiro-ai-antipattern-review.md"), false, `${path} should not reuse implementation review report name`);
  }
});

test("spec generation AI quality gate uses generation-specific fix instruction and output contract", () => {
  const requiredInstructionTerms = [
    "kiro-spec-ai-antipattern-review.md",
    "kiro-spec-ai-antipattern-fix.md",
    "current spec artifact boundary",
    "FIXED",
    "NO_FIX_NEEDED",
    "NEED_REPLAN",
    "BLOCKED",
  ];
  const requiredContractTerms = [
    "STATUS",
    "finding_decisions",
    "changed_files",
    "scope_guard",
    "validation_evidence",
    "no_fix_rationale",
    "missing_context",
    "kiro-spec-ai-antipattern-fix.md",
  ];

  for (const language of languages) {
    const workflowPath = join(repoRoot, ".takt", language, "workflows", "kiro-spec-ai-quality-gate.yaml");
    const workflowContent = readFileSync(workflowPath, "utf8");
    assert.ok(workflowContent.includes("kiro-ai-antipattern-fix-spec-generation"));
    assert.ok(workflowContent.includes("kiro-spec-ai-antipattern-fix-result"));

    const instructionPath = join(
      repoRoot,
      ".takt",
      language,
      "facets",
      "instructions",
      "kiro-ai-antipattern-fix-spec-generation.md",
    );
    const instructionContent = readFileSync(instructionPath, "utf8");
    for (const term of requiredInstructionTerms) {
      assert.ok(instructionContent.includes(term), `${instructionPath} should include ${term}`);
    }

    const contractPath = join(
      repoRoot,
      ".takt",
      language,
      "facets",
      "output-contracts",
      "kiro-spec-ai-antipattern-fix-result.md",
    );
    const contractContent = readFileSync(contractPath, "utf8");
    for (const term of requiredContractTerms) {
      assert.ok(contractContent.includes(term), `${contractPath} should include ${term}`);
    }
  }
});

test("downstream generation review facets consume spec AI quality gate evidence", () => {
  const facetNames = [
    "kiro-spec-requirements-review.md",
    "kiro-validate-design-readiness.md",
    "kiro-spec-tasks-review.md",
    "kiro-spec-quick-sanity-review.md",
  ];
  const requiredTerms = [
    "kiro-spec-ai-antipattern-review.md",
    "kiro-spec-ai-antipattern-fix.md",
    "unresolved",
    "stale",
    "cross-run",
    "evidence-free",
    "optional fix report",
  ];

  for (const language of languages) {
    for (const facetName of facetNames) {
      const path = join(repoRoot, ".takt", language, "facets", "instructions", facetName);
      const content = readFileSync(path, "utf8");
      for (const term of requiredTerms) {
        assert.ok(content.includes(term), `${path} should include ${term}`);
      }
    }
  }
});
