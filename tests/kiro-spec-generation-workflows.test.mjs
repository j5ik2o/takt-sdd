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

function assertOrderedTerms(content, terms, label) {
  let previousIndex = -1;
  for (const term of terms) {
    const index = content.indexOf(term);
    assert.notEqual(index, -1, `${label} should include ${term}`);
    assert.ok(index > previousIndex, `${label} should place ${term} after the previous term`);
    previousIndex = index;
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

test("task 7.1 quick sanity review contract exposes machine-readable verdict and fix targets", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const contractTerms = [
    "verdict",
    "findings",
    "requirements",
    "design",
    "tasks",
    "fix_targets",
    "PASS",
    "NEEDS_FIX",
    "BLOCKED",
    "coherence",
    "hidden prerequisite",
    "task annotation",
    "`summary`",
  ];

  for (const lang of ["en", "ja"]) {
    const path = `.takt/${lang}/facets/output-contracts/kiro-spec-sanity-review.md`;
    assertFacetTerms(repoRoot, path, contractTerms);
    const content = readFileSync(join(repoRoot, path), "utf8");
    assert.ok(content.startsWith("{extends: validation}"), `${path} should extend validation`);
    if (lang === "en") {
      assert.ok(content.includes("branch on `verdict`"), `${path} should branch on verdict`);
    } else {
      assert.ok(content.includes("`verdict` を参照して分岐する"), `${path} should branch on verdict`);
    }
  }
});

test("task 8.1 quick workflow composes standalone phase contracts in one YAML", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const orderedSteps = ["quick-init", "quick-requirements", "quick-design", "quick-tasks", "quick-sanity-review"];
  const workflowTerms = [
    "kiro-spec-init: ../facets/instructions/kiro-spec-init.md",
    "kiro-spec-requirements: ../facets/instructions/kiro-spec-requirements.md",
    "kiro-spec-design: ../facets/instructions/kiro-spec-design.md",
    "kiro-spec-tasks: ../facets/instructions/kiro-spec-tasks.md",
    "kiro-spec-quick: ../facets/instructions/kiro-spec-quick.md",
    "kiro-spec-generation: ../facets/policies/kiro-spec-generation.md",
    "kiro-spec-task-annotations: ../facets/policies/kiro-spec-task-annotations.md",
    "kiro-spec-generation-result: ../facets/output-contracts/kiro-spec-generation-result.md",
    "kiro-spec-sanity-review: ../facets/output-contracts/kiro-spec-sanity-review.md",
    "automatic mode",
    "interactive mode",
    "phase approval",
    "same auto-approve semantics",
    "verdict PASS",
    "quick-completion",
  ];
  const instructionTerms = [
    "quick-init",
    "quick-requirements",
    "quick-design",
    "quick-tasks",
    "quick-sanity-review",
    "automatic mode",
    "interactive mode",
    "phase approval",
    "standalone workflow",
    "same auto-approve semantics",
    "verdict PASS",
    "completion",
    "discovery",
    "batch",
    "implementation",
  ];
  const forbiddenTerms = [
    "workflow_call",
    "takt -w",
    "takt --workflow",
    "kiro-discovery",
    "kiro-spec-batch",
    "kiro-impl",
  ];

  for (const lang of ["en", "ja"]) {
    const workflowPath = `.takt/${lang}/workflows/kiro-spec-quick.yaml`;
    assertFacetTerms(repoRoot, workflowPath, workflowTerms);
    const workflow = readFileSync(join(repoRoot, workflowPath), "utf8");
    assertOrderedTerms(workflow, orderedSteps, workflowPath);
    for (const forbiddenTerm of forbiddenTerms) {
      assert.equal(workflow.includes(forbiddenTerm), false, `${workflowPath} should not include ${forbiddenTerm}`);
    }

    const instructionPath = `.takt/${lang}/facets/instructions/kiro-spec-quick.md`;
    assertFacetTerms(repoRoot, instructionPath, instructionTerms);
  }
});

test("kiro spec generation validation passes current spec generation surface", () => {
  const result = validateKiroSpecGenerationWorkflows();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(
    result.failures.some((failure) => failure.includes(".takt/en/workflows/kiro-spec-tasks.yaml")),
    false,
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

test("kiro spec generation validation detects language-only workflow and facet additions", () => {
  const root = makeFixture();
  writeFixtureFile(
    root,
    ".takt/en/workflows/kiro-spec-extra.yaml",
    [
      "name: kiro-spec-extra",
      "workflow_config:",
      "  provider_options:",
      "    codex:",
      "      network_access: true",
      "max_steps: 1",
      "initial_step: extra-step",
      "steps:",
      "  - name: extra-step",
      "    edit: false",
      "    persona: reviewer",
      "    required_permission_mode: read-only",
      "    instruction: kiro-spec-extra",
      "    rules:",
      "      - condition: validation.verdict PASS",
      "        next: COMPLETE",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    ".takt/en/facets/instructions/kiro-spec-extra.md",
    ["{extends: analysis}", "", "# Extra Instruction", "", "- Keep `phase` stable."].join("\n"),
  );

  const result = validateKiroSpecGenerationWorkflows({ repoRoot: root });

  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("workflows") &&
      failure.includes("kiro-spec-extra"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("facets/instructions") &&
      failure.includes("kiro-spec-extra"),
    ),
  );
});

test("kiro spec generation validation detects workflow machine field and markdown contract drift", () => {
  const root = makeFixture();
  const workflow = [
    "name: kiro-spec-drift",
    "description: ignored for parity",
    "workflow_config:",
    "  provider_options:",
    "    codex:",
    "      network_access: true",
    "max_steps: 2",
    "initial_step: drift-step",
    "instructions:",
    "  kiro-spec-drift: ../facets/instructions/kiro-spec-drift.md",
    "policies:",
    "  kiro-spec-generation: ../facets/policies/kiro-spec-generation.md",
    "report_formats:",
    "  kiro-spec-generation-result: ../facets/output-contracts/kiro-spec-generation-result.md",
    "steps:",
    "  - name: drift-step",
    "    edit: false",
    "    persona: reviewer",
    "    policy:",
    "      - kiro-spec-generation",
    "    required_permission_mode: read-only",
    "    instruction: kiro-spec-drift",
    "    output_contracts:",
    "      report:",
    "        - name: kiro-spec-drift-result.md",
    "          format: kiro-spec-generation-result",
    "    rules:",
    "      - condition: validation.verdict PASS and phase quick",
    "        next: COMPLETE",
  ].join("\n");
  const driftedWorkflow = workflow
    .replace("initial_step: drift-step", "initial_step: translated-step")
    .replace("  - name: drift-step", "  - name: translated-step")
    .replace("instruction: kiro-spec-drift", "instruction: kiro-spec-translated")
    .replace("format: kiro-spec-generation-result", "format: kiro-spec-generation-result-ja")
    .replace("next: COMPLETE", "next: ABORT");
  writeFixtureFile(root, ".takt/en/workflows/kiro-spec-drift.yaml", workflow);
  writeFixtureFile(root, ".takt/ja/workflows/kiro-spec-drift.yaml", driftedWorkflow);
  writeFixtureFile(
    root,
    ".takt/en/facets/output-contracts/kiro-spec-drift.md",
    ["{extends: validation}", "", "- `phase`", "- `featureName`", "- `updatedFiles`"].join("\n"),
  );
  writeFixtureFile(
    root,
    ".takt/ja/facets/output-contracts/kiro-spec-drift.md",
    ["{extends: validation}", "", "- `phase`", "- `featureName`", "- `translatedFiles`"].join("\n"),
  );

  const result = validateKiroSpecGenerationWorkflows({ repoRoot: root });

  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("workflow machine field") &&
      failure.includes("initial_step"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("workflow machine field") &&
      failure.includes("steps[0].name"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("workflow machine field") &&
      failure.includes("format"),
    ),
  );
  assert.ok(
    result.failures.some((failure) =>
      failure.includes("LANGUAGE_PARITY_DRIFT") &&
      failure.includes("markdown contract terms") &&
      failure.includes("updatedFiles"),
    ),
  );
});
