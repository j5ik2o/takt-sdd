import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildDependencyWaves,
  parseRoadmap,
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
