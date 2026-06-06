import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { validateKiroSpecGenerationWorkflows } from "../scripts/validate-kiro-spec-generation-workflows.mjs";

function makeFixture() {
  return mkdtempSync(join(tmpdir(), "kiro-spec-generation-"));
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function assertFacetTerms(root, path, terms) {
  const fullPath = join(root, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  const content = readFileSync(fullPath, "utf8");
  for (const term of terms) {
    assert.ok(content.includes(term), `${path} should include ${term}`);
  }
}

test("task 2.1 shared spec generation policy and result contract are available in both languages", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const policyTerms = [
    "phase gate",
    "artifact write",
    "metadata update",
    "blocking result",
    ".kiro/specs/<feature>",
    "spec.json",
    "requirements-generated",
    "design-generated",
    "tasks-generated",
    "ready_for_implementation",
  ];
  const resultTerms = [
    "phase",
    "validation",
    "featureName",
    "updatedFiles",
    "nextAction",
    "blockingReason",
    "PASS",
    "NEEDS_FIX",
    "BLOCKED",
  ];

  for (const lang of ["en", "ja"]) {
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/policies/kiro-spec-generation.md`, policyTerms);
    assertFacetTerms(
      repoRoot,
      `.takt/${lang}/facets/output-contracts/kiro-spec-generation-result.md`,
      resultTerms,
    );
  }
});

test("kiro spec generation validation reports current missing generation surface without requiring downstream workflows", () => {
  const result = validateKiroSpecGenerationWorkflows();

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("WORKFLOW_MISSING") && failure.includes(".takt/en/workflows/kiro-spec-init.yaml"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("FACET_MISSING") &&
      failure.includes(".takt/ja/facets/instructions/kiro-spec-init.md"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("QUICK_COMPOSITION_DRIFT") && failure.includes("kiro-spec-quick.yaml missing"),
    ),
  );
  assert.equal(result.failures.some((failure) => failure.includes("kiro-discovery")), false);
  assert.equal(result.failures.some((failure) => failure.includes("kiro-spec-batch")), false);
  assert.equal(result.failures.some((failure) => failure.includes("kiro-impl")), false);
});

test("kiro spec generation validation detects lifecycle drift", () => {
  const root = makeFixture();
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(
      root,
      `.takt/${lang}/facets/policies/kiro-spec-lifecycle.md`,
      [
        "# Kiro Spec Lifecycle Policy",
        "",
        "- initialized",
        "- design-generated",
        "- tasks-generated",
        "- approvals.requirements.generated",
        "- approvals.requirements.approved",
        "- approvals.design.generated",
        "- approvals.design.approved",
        "- approvals.tasks.generated",
        "- approvals.tasks.approved",
        "- ready_for_implementation",
        "- auto-approve",
      ].join("\n"),
    );
  }

  const result = validateKiroSpecGenerationWorkflows({ repoRoot: root });

  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LIFECYCLE_DRIFT") && failure.includes("requirements-generated"),
    ),
  );
});

test("kiro spec generation validation detects quick workflow composition drift", () => {
  const root = makeFixture();
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(
      root,
      `.takt/${lang}/workflows/kiro-spec-quick.yaml`,
      [
        "name: kiro-spec-quick",
        "steps:",
        "  - name: quick-init",
        "    workflow_call: kiro-spec-init",
        "  - name: quick-requirements",
        "    command: takt -w kiro-spec-requirements",
        "  - name: quick-design",
        "  - name: quick-tasks",
        "  - name: quick-sanity-review",
      ].join("\n"),
    );
  }

  const result = validateKiroSpecGenerationWorkflows({ repoRoot: root });

  assert.ok(
    result.failures.some((failure) =>
      failure.includes("QUICK_COMPOSITION_DRIFT") && failure.includes("workflow_call"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("QUICK_COMPOSITION_DRIFT") && failure.includes("nested takt"),
    ),
  );
});

test("kiro spec generation validation detects nested takt execution with equals workflow option", () => {
  const root = makeFixture();
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(
      root,
      `.takt/${lang}/workflows/kiro-spec-quick.yaml`,
      [
        "name: kiro-spec-quick",
        "steps:",
        "  - name: quick-init",
        "  - name: quick-requirements",
        "    command: takt --workflow=kiro-spec-requirements",
        "  - name: quick-design",
        "  - name: quick-tasks",
        "  - name: quick-sanity-review",
      ].join("\n"),
    );
  }

  const result = validateKiroSpecGenerationWorkflows({ repoRoot: root });

  assert.ok(
    result.failures.some((failure) =>
      failure.includes("QUICK_COMPOSITION_DRIFT") && failure.includes("nested takt"),
    ),
  );
});
