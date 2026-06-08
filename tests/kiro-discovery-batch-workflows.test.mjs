import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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

function writeSkillFixtures(root, specBatchContent = "## Step 2: Build Dependency Waves\n\n## Step 4: Cross-Spec Review\n") {
  writeFixtureFile(root, ".agents/skills/kiro-discovery/SKILL.md", "## Step 2: Determine Action Path\n");
  writeFixtureFile(root, ".agents/skills/kiro-spec-batch/SKILL.md", specBatchContent);
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

test("roadmap parser rejects malformed dependency-order lines", () => {
  const roadmap = [
    "# Roadmap",
    "",
    "## Specs (dependency order)",
    "- [ ] feature-a -- Valid feature. Dependencies: none",
    "- feature-b -- Missing checklist marker. Dependencies: feature-a",
    "feature-c -- Missing bullet. Dependencies: feature-a",
  ].join("\n");

  const result = parseRoadmap(roadmap);

  assert.equal(result.specs.length, 1);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.every((error) => error.includes("invalid roadmap spec entry")));
});

test("roadmap parser rejects duplicate dependency-order features", () => {
  const roadmap = [
    "# Roadmap",
    "",
    "## Specs (dependency order)",
    "- [x] feature-a -- Existing completion. Dependencies: none",
    "- [ ] feature-a -- Duplicate pending entry. Dependencies: none",
  ].join("\n");

  const result = parseRoadmap(roadmap);
  const wavePlan = buildDependencyWaves([
    { featureName: "feature-a", description: "Existing completion", dependencies: [], status: "done" },
    { featureName: "feature-a", description: "Duplicate pending entry", dependencies: [], status: "pending" },
  ]);

  assert.deepEqual(result.specs.map((spec) => spec.status), ["done"]);
  assert.ok(result.errors.some((error) => error.includes("duplicate roadmap spec entry: feature-a")));
  assert.equal(wavePlan.ok, false);
  assert.ok(wavePlan.errors.some((error) => error.includes("duplicate roadmap spec entry: feature-a")));
});

test("roadmap parser rejects empty dependency-order spec section", () => {
  const roadmap = [
    "# Roadmap",
    "",
    "## Specs (dependency order)",
    "",
    "## Existing Spec Updates",
    "- [ ] old-feature -- Awareness only.",
  ].join("\n");

  const result = parseRoadmap(roadmap);
  const wavePlan = buildDependencyWaves([]);

  assert.deepEqual(result.specs, []);
  assert.ok(result.errors.some((error) => error.includes("missing roadmap spec entries")));
  assert.equal(result.errors.some((error) => error.includes("missing ## Specs (dependency order) section")), false);
  assert.equal(wavePlan.ok, false);
  assert.ok(wavePlan.errors.some((error) => error.includes("missing roadmap spec entries")));
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

test("validation reports roadmap missing dependencies once", () => {
  const root = copyCurrentTaktFixture();
  writeFixtureFile(
    root,
    ".kiro/steering/roadmap.md",
    [
      "# Roadmap",
      "",
      "## Specs (dependency order)",
      "- [ ] feature-a -- Depends on a missing feature. Dependencies: missing-feature",
    ].join("\n"),
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });
  const missingDependencyFailures = result.failures.filter((failure) =>
    failure.includes("feature-a has missing dependency missing-feature"),
  );

  assert.equal(result.ok, false);
  assert.equal(missingDependencyFailures.length, 1);
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
    assert.ok(
      workflow.includes(
        "plannedFiles include every new spec brief.md and .kiro/steering/roadmap.md and awarenessOnlyItems non-empty and separated and actionPath MIXED_DECOMPOSITION",
      ),
      `${workflowPath} should require mixed decomposition brief and roadmap planning`,
    );
    assert.ok(
      workflow.includes(
        "createdFiles include every new spec brief.md and .kiro/steering/roadmap.md and awarenessOnlyItems non-empty and actionPath MIXED_DECOMPOSITION",
      ),
      `${workflowPath} should require mixed decomposition awareness-only items before reporting`,
    );
    assert.ok(
      workflow.includes(
        "actionPath MIXED_DECOMPOSITION and every new spec brief.md present and .kiro/steering/roadmap.md present and awarenessOnlyItems non-empty",
      ),
      `${workflowPath} should require roadmap and awareness-only items before mixed decomposition completion`,
    );
    assert.ok(
      workflow.includes("actionPath MULTI_SPEC and every new spec brief.md present and .kiro/steering/roadmap.md present"),
      `${workflowPath} should require roadmap and every new spec brief before multi-spec completion`,
    );
    assert.equal(
      workflow.includes("actionPath MULTI_SPEC and every new spec brief.md present\n"),
      false,
      `${workflowPath} should not allow multi-spec completion without roadmap`,
    );
    assert.equal(
      workflow.includes("actionPath MIXED_DECOMPOSITION and every new spec brief.md present and awarenessOnlyItems non-empty\n"),
      false,
      `${workflowPath} should not allow mixed decomposition completion without roadmap`,
    );
    assert.equal(
      workflow.includes("actionPath MIXED_DECOMPOSITION and awarenessOnlyItems present"),
      false,
      `${workflowPath} should not allow empty awareness-only items for mixed decomposition`,
    );
    assert.ok(
      workflow.includes("blockingReason present or artifact write failed or brief.md roadmap contradiction found"),
      `${workflowPath} should abort discovery reports on artifact failures and roadmap contradictions`,
    );
    assert.ok(
      workflow.includes(
        "required plannedFiles missing for actionPath SINGLE_SPEC or actionPath MULTI_SPEC or actionPath MIXED_DECOMPOSITION",
      ),
      `${workflowPath} should route incomplete discovery plans to reporting`,
    );
    assert.ok(
      workflow.includes(
        "required createdFiles missing for actionPath SINGLE_SPEC or actionPath MULTI_SPEC or actionPath MIXED_DECOMPOSITION",
      ),
      `${workflowPath} should route incomplete discovery writes to reporting`,
    );
    assert.ok(
      workflow.includes("required discovery artifacts missing"),
      `${workflowPath} should abort reports when required discovery artifacts are missing`,
    );
    const classifyBlock = workflow.indexOf("blockingReason present or action path ambiguous");
    const classifySuccess = workflow.indexOf(
      "actionPath SINGLE_SPEC or actionPath MULTI_SPEC or actionPath MIXED_DECOMPOSITION",
    );
    const planBlock = workflow.indexOf("blockingReason present or brief.md roadmap contradiction found");
    const planSuccess = workflow.indexOf("plannedFiles include target brief.md and actionPath SINGLE_SPEC");
    const writeBlock = workflow.indexOf("artifact write failed or blockingReason present");
    const writeSuccess = workflow.indexOf("createdFiles include target brief.md and actionPath SINGLE_SPEC");
    assert.ok(classifyBlock >= 0 && classifyBlock < classifySuccess, `${workflowPath} should classify blockers first`);
    assert.ok(planBlock >= 0 && planBlock < planSuccess, `${workflowPath} should plan blockers first`);
    assert.ok(writeBlock >= 0 && writeBlock < writeSuccess, `${workflowPath} should route write blockers first`);

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
      "missing roadmap spec entries",
      "invalid roadmap spec entry",
      "duplicate roadmap spec entry",
      "all roadmap specs already complete",
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
    const parseBlockRule =
      "roadmap missing or missing dependency or circular dependency or missing brief.md or invalid roadmap spec entry or duplicate roadmap spec entry or missing roadmap spec entries";
    const parseSuccessRule =
      "roadmap parsed from ## Specs (dependency order) and awareness-only sections separated and no missing brief.md and no invalid roadmap spec entry and no duplicate roadmap spec entry and no missing roadmap spec entries";
    const waveBlockRule =
      "wave planning blocked or missing roadmap spec entries or invalid roadmap spec entry or duplicate roadmap spec entry";
    assert.ok(workflow.includes(parseBlockRule), `${workflowPath} should name hard roadmap parse errors`);
    assert.ok(workflow.includes(parseSuccessRule), `${workflowPath} should gate success on no hard parse errors`);
    assert.ok(
      workflow.indexOf(parseBlockRule) < workflow.indexOf(parseSuccessRule),
      `${workflowPath} should block roadmap parse errors before planning waves`,
    );
    assert.ok(workflow.includes(waveBlockRule), `${workflowPath} should block hard parse errors during wave planning`);
    assert.equal(
      workflow.includes("roadmap parsed from ## Specs (dependency order) and awareness-only sections separated\n"),
      false,
      `${workflowPath} should not allow parsed roadmap to bypass missing brief checks`,
    );
    assert.equal(
      workflow.includes("condition: all roadmap specs already complete\n"),
      false,
      `${workflowPath} should not route empty roadmaps as already complete`,
    );
    assert.ok(workflow.includes("condition: all roadmap specs already complete and roadmap spec entries present"));
    assert.ok(workflow.includes("verdict PASS"));
    assert.ok(workflow.includes("verdict NEEDS_FIX"));
    assert.ok(workflow.includes("verdict DECOMPOSITION_RETURN"));
    assert.equal(workflow.includes("condition: DECOMPOSITION_RETURN or loop_monitors.threshold reached"), false);
    assert.equal(workflow.includes("crossSpecReview PASS"), false);
    assert.ok(
      workflow.indexOf("condition: all roadmap specs already complete and roadmap spec entries present") <
        workflow.indexOf("condition: verdict PASS"),
      `${workflowPath} should route already-complete roadmaps through cross-spec review before finalization`,
    );
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

test("validation rejects en/ja workflow structure drift", () => {
  const root = copyCurrentTaktFixture();
  const path = ".takt/ja/workflows/kiro-discovery.yaml";
  writeFixtureFile(
    root,
    path,
    readFileSync(join(root, path), "utf8").replace("  - name: plan-discovery-artifacts", "  - name: plan-discovery-artifacts-ja"),
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("LANGUAGE_PARITY_DRIFT")));
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

test("validation rejects missing built-in facet parent", () => {
  const root = copyCurrentTaktFixture();
  const repoRoot = join(import.meta.dirname, "..");
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  const path = ".takt/en/facets/instructions/kiro-discovery.md";
  writeFixtureFile(
    root,
    path,
    readFileSync(join(root, path), "utf8").replace("{extends: plan}", "{extends: missing-parent}"),
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("missing-parent")));
});

test("validation rejects missing skill adapter section", () => {
  const root = copyCurrentTaktFixture();
  writeSkillFixtures(root, "## Step 2: Build Dependency Waves\n");

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("## Step 4: Cross-Spec Review")));
});

test("validation rejects independent remediation retry counters", () => {
  const root = copyCurrentTaktFixture();
  const path = ".takt/en/workflows/kiro-spec-batch.yaml";
  writeFixtureFile(
    root,
    path,
    `${readFileSync(join(root, path), "utf8")}\nretryCount: 3\n`,
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("independent retry counter")));
});

test("validation rejects unconnected discovery batch facets", () => {
  const root = copyCurrentTaktFixture();
  writeFixtureFile(
    root,
    ".takt/en/facets/policies/kiro-unused-discovery-policy.md",
    "{extends: research}\n\n# Unused Discovery Policy\n",
  );

  const result = validateKiroDiscoveryBatchWorkflows({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-unused-discovery-policy.md")));
});
