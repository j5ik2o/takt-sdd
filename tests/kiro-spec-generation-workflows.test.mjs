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

test("kiro spec generation validation reports current missing downstream generation surface", () => {
  const result = validateKiroSpecGenerationWorkflows();

  assert.equal(result.ok, false);
  assert.equal(
    result.failures.some((failure) => failure.includes(".takt/en/workflows/kiro-spec-tasks.yaml")),
    false,
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("FACET_MISSING") &&
      failure.includes(".takt/ja/facets/instructions/kiro-spec-quick.md"),
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

test("task 4.1 requirements workflow connects EARS generation, review gate, and lifecycle update", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const workflowTerms = [
    "requirements.md",
    "requirements-generated",
    "EARS",
    "kiro-spec-generation-result",
    "brief.md",
    "steering context",
    "existing draft",
    "requirements rules",
    "requirements review gate",
    "scope ambiguity",
    "acceptance criteria",
    "numeric IDs",
    "approvals.requirements.generated",
    "design component",
    "workflow YAML",
    "implementation file",
    "kiro-spec-generation: ../facets/policies/kiro-spec-generation.md",
    "kiro-spec-generation-result: ../facets/output-contracts/kiro-spec-generation-result.md",
  ];
  const instructionTerms = [
    "requirements.md",
    "EARS",
    "requirements-generated",
    "BLOCKED",
    "brief.md",
    "steering context",
    "existing draft",
    "requirements rules",
    "requirements review gate",
    "scope ambiguity",
    "acceptance criteria",
    "numeric IDs",
    "approvals.requirements.generated",
    "design component",
    "workflow YAML",
    "implementation file",
  ];

  for (const lang of ["en", "ja"]) {
    assertFacetTerms(repoRoot, `.takt/${lang}/workflows/kiro-spec-requirements.yaml`, workflowTerms);
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/instructions/kiro-spec-requirements.md`, instructionTerms);
  }
});

test("task 6.1 tasks workflow requires canonical task annotations and ready state handling", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const workflowTerms = [
    "tasks.md",
    "tasks-generated",
    "_Boundary:_",
    "_Depends:_",
    "kiro-spec-generation-result",
    "kiro-spec-task-annotations: ../facets/policies/kiro-spec-task-annotations.md",
    "requirements/design approval gate",
    "task generation",
    "task plan review",
    "task graph sanity review",
    "observable completion",
    "numeric requirements",
    "approvals.requirements.approved",
    "approvals.design.approved",
    "approvals.tasks.generated",
    "approvals.tasks.approved",
    "ready_for_implementation",
    "auto-approve",
  ];
  const instructionTerms = [
    "tasks.md",
    "_Boundary:_",
    "_Depends:_",
    "tasks-generated",
    "requirements/design approval gate",
    "task generation",
    "task plan review",
    "task graph sanity review",
    "observable completion",
    "numeric requirements",
    "ready_for_implementation",
    "auto-approve",
  ];
  const policyTerms = [
    "_Boundary:_",
    "_Depends:_",
    "none",
    "(P)",
    "executable task",
    "observable completion",
    "numeric requirements",
    "non-overlapping boundary",
    "dependency graph",
  ];

  for (const lang of ["en", "ja"]) {
    assertFacetTerms(repoRoot, `.takt/${lang}/workflows/kiro-spec-tasks.yaml`, workflowTerms);
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/instructions/kiro-spec-tasks.md`, instructionTerms);
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/policies/kiro-spec-task-annotations.md`, policyTerms);

    const workflow = readFileSync(join(repoRoot, `.takt/${lang}/workflows/kiro-spec-tasks.yaml`), "utf8");
    const autoApproveRule = "validation.verdict PASS and auto-approve and approvals.tasks.approved true and ready_for_implementation true";
    const normalRule = "validation.verdict PASS and not auto-approve and phase tasks";
    assert.ok(workflow.includes(autoApproveRule), `${lang} tasks workflow should require ready state for auto-approve`);
    assert.ok(workflow.includes(normalRule), `${lang} tasks workflow should exclude auto-approve from normal completion`);
    assert.ok(workflow.indexOf(autoApproveRule) < workflow.indexOf(normalRule), `${lang} auto-approve rule should run first`);
  }

  const template = readFileSync(join(repoRoot, ".kiro/settings/templates/specs/tasks.md"), "utf8");
  assert.ok(template.includes("_Boundary:_ {{COMPONENT_NAMES}}"));
  assert.ok(template.includes("_Depends:_ {{TASK_IDS_OR_NONE}}"));
  assert.ok(template.includes("_Depends:_ none"));
  assert.equal(/\boptional\b/i.test(template), false);
  assert.equal(/Only for/i.test(template), false);
  assert.equal(/omit/i.test(template), false);
});

test("task 5.1 design workflow connects research, required sections, review gate, and lifecycle update", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const workflowTerms = [
    "design.md",
    "research.md",
    "design-generated",
    "requirements approval gate",
    "-y",
    "auto-approve",
    "discovery/research",
    "design synthesis",
    "design review gate",
    "requirements/design gap",
    "Boundary Commitments",
    "File Structure Plan",
    "Requirements Traceability",
    "approvals.requirements.approved",
    "approvals.design.generated",
    "kiro-spec-generation: ../facets/policies/kiro-spec-generation.md",
    "kiro-spec-generation-result: ../facets/output-contracts/kiro-spec-generation-result.md",
  ];
  const instructionTerms = [
    "design.md",
    "research.md",
    "design-generated",
    "requirements approval gate",
    "-y",
    "auto-approve",
    "discovery/research",
    "design synthesis",
    "design review gate",
    "requirements/design gap",
    "Boundary Commitments",
    "File Structure Plan",
    "Requirements Traceability",
    "approvals.requirements.approved",
    "approvals.design.generated",
  ];

  for (const lang of ["en", "ja"]) {
    assertFacetTerms(repoRoot, `.takt/${lang}/workflows/kiro-spec-design.yaml`, workflowTerms);
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/instructions/kiro-spec-design.md`, instructionTerms);
  }
});

test("task 3.1 init workflow captures brief reuse and initialized artifact contract", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const workflowTerms = [
    "spec.json",
    "requirements.md",
    "initialized",
    "brief.md",
    "description source",
    "brief-only directory",
    "template",
    "feature name conflict",
    "roadmap",
    "OpenSpec",
    "kiro-spec-generation: ../facets/policies/kiro-spec-generation.md",
    "kiro-spec-generation-result: ../facets/output-contracts/kiro-spec-generation-result.md",
  ];
  const instructionTerms = [
    "spec.json",
    "requirements.md",
    "initialized",
    "brief.md",
    "description source",
    "brief-only directory",
    "template",
    "feature name conflict",
    "roadmap",
    "OpenSpec",
  ];

  for (const lang of ["en", "ja"]) {
    assertFacetTerms(repoRoot, `.takt/${lang}/workflows/kiro-spec-init.yaml`, workflowTerms);
    assertFacetTerms(repoRoot, `.takt/${lang}/facets/instructions/kiro-spec-init.md`, instructionTerms);
  }
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
