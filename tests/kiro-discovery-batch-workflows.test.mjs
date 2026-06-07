import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildDependencyWaves,
  parseRoadmap,
  validateBatchPlanPrerequisites,
  validateKiroDiscoveryBatchWorkflows,
} from "../scripts/validate-kiro-discovery-batch-workflows.mjs";

function makeFixture() {
  return mkdtempSync(join(tmpdir(), "kiro-discovery-batch-"));
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function copyCurrentTaktFixture() {
  const repoRoot = join(import.meta.dirname, "..");
  const root = makeFixture();
  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  return root;
}

test("validation harness reports missing discovery/batch workflow bundle", () => {
  const root = makeFixture();
  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-discovery.yaml missing")));
  assert.ok(result.failures.some((failure) => failure.includes("kiro-spec-batch.yaml missing")));
  assert.ok(result.failures.some((failure) => failure.includes("kiro-discovery-result.md missing")));
  assert.ok(result.failures.some((failure) => failure.includes("kiro-cross-spec-review.md missing")));
});

test("roadmap parser separates dependency-order specs from awareness-only sections", () => {
  const roadmap = [
    "# Roadmap",
    "",
    "## Specs (dependency order)",
    "- [x] foundation -- Shared contracts. Dependencies: none",
    "- [ ] feature-a -- First pending feature. Dependencies: foundation",
    "- [ ] feature-b -- Independent feature. Dependencies: foundation",
    "- [ ] feature-c -- Downstream feature. Dependencies: feature-a, feature-b",
    "",
    "## Existing Spec Updates",
    "- [ ] old-feature -- Awareness only. Dependencies: feature-a",
    "",
    "## Direct Implementation Candidates",
    "- [ ] docs-cleanup -- Awareness only.",
  ].join("\n");

  const result = parseRoadmap(roadmap);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.specs.map((spec) => [spec.featureName, spec.status, spec.dependencies]),
    [
      ["foundation", "done", []],
      ["feature-a", "pending", ["foundation"]],
      ["feature-b", "pending", ["foundation"]],
      ["feature-c", "pending", ["feature-a", "feature-b"]],
    ],
  );
  assert.deepEqual(result.awarenessOnlySections, ["Existing Spec Updates", "Direct Implementation Candidates"]);
});

test("dependency wave planner rejects missing dependencies and cycles", () => {
  const missingDependency = buildDependencyWaves([
    { featureName: "feature-a", description: "A", dependencies: ["missing"], status: "pending" },
  ]);
  assert.equal(missingDependency.ok, false);
  assert.ok(missingDependency.errors.some((error) => error.includes("missing dependency")));

  const cycle = buildDependencyWaves([
    { featureName: "feature-a", description: "A", dependencies: ["feature-b"], status: "pending" },
    { featureName: "feature-b", description: "B", dependencies: ["feature-a"], status: "pending" },
  ]);
  assert.equal(cycle.ok, false);
  assert.ok(cycle.errors.some((error) => error.includes("circular dependency")));
});

test("batch plan prerequisites reject pending specs without brief", () => {
  const root = makeFixture();
  const result = validateBatchPlanPrerequisites(root, [
    { featureName: "done-feature", description: "Done", dependencies: [], status: "done" },
    { featureName: "pending-feature", description: "Pending", dependencies: [], status: "pending" },
  ]);

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(".kiro/specs/pending-feature/brief.md")));
  assert.equal(result.errors.some((error) => error.includes("done-feature")), false);
});

test("batch plan prerequisites accept pending specs with brief", () => {
  const root = makeFixture();
  writeFixtureFile(root, ".kiro/specs/pending-feature/brief.md", "# Brief: pending-feature\n");

  const result = validateBatchPlanPrerequisites(root, [
    { featureName: "pending-feature", description: "Pending", dependencies: [], status: "pending" },
  ]);

  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test("validation harness rejects workflow reuse shims", () => {
  const root = makeFixture();
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(
      root,
      `.takt/${lang}/workflows/kiro-discovery.yaml`,
      [
        "name: kiro-discovery",
        "initial_step: prompt",
        "steps:",
        "  - name: prompt",
        "    instruction: kiro-discovery",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      `.takt/${lang}/workflows/kiro-spec-batch.yaml`,
      [
        "name: kiro-spec-batch",
        "initial_step: dispatch",
        "steps:",
        "  - name: dispatch",
        "    instruction: kiro-spec-batch",
        "    rules:",
        "      - condition: shell takt -w kiro-spec-quick",
        "        next: COMPLETE",
      ].join("\n"),
    );
  }

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("must not be a single-step prompt wrapper")));
  assert.ok(result.failures.some((failure) => failure.includes("must not use shell takt -w")));
});

test("discovery routing policy and result contract define stable action path fields", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    for (const path of [
      `.takt/${lang}/facets/policies/kiro-discovery-routing.md`,
      `.takt/${lang}/facets/output-contracts/kiro-discovery-result.md`,
    ]) {
      assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
      const content = readFileSync(join(repoRoot, path), "utf8");
      for (const term of [
        "EXISTING_SPEC_UPDATE",
        "DIRECT_IMPLEMENTATION",
        "SINGLE_SPEC",
        "MULTI_SPEC",
        "MIXED_DECOMPOSITION",
      ]) {
        assert.ok(content.includes(term), `${path} should include ${term}`);
      }
    }
    const contract = readFileSync(
      join(repoRoot, `.takt/${lang}/facets/output-contracts/kiro-discovery-result.md`),
      "utf8",
    );
    for (const field of ["actionPath", "createdFiles", "nextAction", "blockingReason"]) {
      assert.ok(contract.includes(field), `discovery result contract should include ${field}`);
    }
  }
});

test("kiro-discovery workflow uses multi-step routing and skill adapter metadata", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    const workflowPath = `.takt/${lang}/workflows/kiro-discovery.yaml`;
    assert.equal(existsSync(join(repoRoot, workflowPath)), true, `${workflowPath} should exist`);
    const workflow = readFileSync(join(repoRoot, workflowPath), "utf8");
    for (const step of [
      "classify-action-path",
      "plan-discovery-artifacts",
      "write-discovery-artifacts",
      "report-discovery",
    ]) {
      assert.ok(workflow.includes(`name: ${step}`), `${workflowPath} should include ${step}`);
    }
    assert.ok(workflow.includes("kiro-discovery-result"), `${workflowPath} should report kiro-discovery-result`);

    const instructionPath = `.takt/${lang}/facets/instructions/kiro-discovery.md`;
    assert.equal(existsSync(join(repoRoot, instructionPath)), true, `${instructionPath} should exist`);
    const instruction = readFileSync(join(repoRoot, instructionPath), "utf8");
    assert.ok(instruction.includes("extends_skill: kiro-discovery"));
    assert.ok(instruction.includes('extends_skill_section: "## Step 2: Determine Action Path"'));
    assert.ok(instruction.includes("{extends: plan}"));
  }
});

test("discovery artifacts define required brief sections and write path", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    const instruction = readFileSync(join(repoRoot, `.takt/${lang}/facets/instructions/kiro-discovery.md`), "utf8");
    const contract = readFileSync(join(repoRoot, `.takt/${lang}/facets/output-contracts/kiro-discovery-result.md`), "utf8");
    for (const term of [
      "## Problem",
      "## Current State",
      "## Desired Outcome",
      "## Approach",
      "## Scope",
      "## Boundary Candidates",
      "## Out of Boundary",
      "## Upstream / Downstream",
      ".kiro/specs/<feature>/brief.md",
    ]) {
      assert.ok(instruction.includes(term), `instruction should include ${term}`);
      assert.ok(contract.includes(term), `contract should include ${term}`);
    }
  }
});

test("roadmap dependency wave policy keeps awareness-only sections out of batch input", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    const policyPath = `.takt/${lang}/facets/policies/kiro-roadmap-dependency-waves.md`;
    assert.equal(existsSync(join(repoRoot, policyPath)), true, `${policyPath} should exist`);
    const policy = readFileSync(join(repoRoot, policyPath), "utf8");
    for (const term of [
      "## Specs (dependency order)",
      "Existing Spec Updates",
      "Direct Implementation Candidates",
      "awareness-only",
      "Dependencies: none",
      "circular dependency",
    ]) {
      assert.ok(policy.includes(term), `${policyPath} should include ${term}`);
    }
  }
});

test("kiro-spec-batch workflow uses dynamic worker dispatch without workflow reuse shims", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    const workflowPath = `.takt/${lang}/workflows/kiro-spec-batch.yaml`;
    assert.equal(existsSync(join(repoRoot, workflowPath)), true, `${workflowPath} should exist`);
    const workflow = readFileSync(join(repoRoot, workflowPath), "utf8");
    for (const step of [
      "parse-roadmap",
      "plan-waves",
      "dispatch-wave",
      "cross-spec-review",
      "coordinate-remediation",
      "finalize-batch",
    ]) {
      assert.ok(workflow.includes(`name: ${step}`), `${workflowPath} should include ${step}`);
    }
    assert.ok(workflow.includes("dynamic subagent dispatch"));
    assert.ok(workflow.includes("loop_monitors.threshold"));
    assert.equal(/\btakt\s+-w\b|\btakt\s+.*\s-w\s+/.test(workflow), false);
    assert.equal(workflow.includes("workflow_call"), false);

    const instructionPath = `.takt/${lang}/facets/instructions/kiro-spec-batch.md`;
    assert.equal(existsSync(join(repoRoot, instructionPath)), true, `${instructionPath} should exist`);
    const instruction = readFileSync(join(repoRoot, instructionPath), "utf8");
    assert.ok(instruction.includes("extends_skill: kiro-spec-batch"));
    assert.ok(instruction.includes('extends_skill_section: "## Step 2: Build Dependency Waves"'));
    assert.ok(instruction.includes("kiro-spec-generation-workflows"));
  }
});

test("cross-spec review contract exposes machine-readable issue routing", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    for (const path of [
      `.takt/${lang}/facets/instructions/kiro-cross-spec-review.md`,
      `.takt/${lang}/facets/policies/kiro-cross-spec-boundaries.md`,
      `.takt/${lang}/facets/output-contracts/kiro-cross-spec-review.md`,
    ]) {
      assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
      const content = readFileSync(join(repoRoot, path), "utf8");
      for (const term of [
        "data model consistency",
        "interface alignment",
        "duplicate functionality",
        "dependency completeness",
        "affectedSpecs",
        "suggestedFix",
        "DECOMPOSITION_RETURN",
        "repairTarget",
      ]) {
        assert.ok(content.includes(term), `${path} should include ${term}`);
      }
    }
  }
});

test("batch summary contract separates worker results from implementation readiness", () => {
  const repoRoot = join(import.meta.dirname, "..");
  for (const lang of ["en", "ja"]) {
    const path = `.takt/${lang}/facets/output-contracts/kiro-batch-summary.md`;
    assert.equal(existsSync(join(repoRoot, path)), true, `${path} should exist`);
    const content = readFileSync(join(repoRoot, path), "utf8");
    for (const term of [
      "wavePlan",
      "featureResults",
      "failedFeatures",
      "awarenessOnlyItems",
      "crossSpecReview",
      "implementationReady",
      "worker-local",
      "DECOMPOSITION_RETURN",
      "nextAction",
    ]) {
      assert.ok(content.includes(term), `${path} should include ${term}`);
    }
  }
});

test("validation rejects en/ja machine enum drift", () => {
  const root = copyCurrentTaktFixture();
  const path = ".takt/ja/facets/output-contracts/kiro-discovery-result.md";
  writeFixtureFile(
    root,
    path,
    readFileSync(join(root, path), "utf8").replaceAll("MIXED_DECOMPOSITION", "MIXED_SPLIT"),
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("MIXED_DECOMPOSITION")));
});

test("package exposes discovery batch validation commands", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const scripts = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).scripts;

  assert.equal(
    scripts["validate:kiro-discovery-batch-workflows"],
    "node scripts/validate-kiro-discovery-batch-workflows.mjs",
  );
  assert.equal(
    scripts["test:kiro-discovery-batch-workflows"],
    "node --test tests/kiro-discovery-batch-workflows.test.mjs",
  );
});
