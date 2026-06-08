import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  getKiroWorkflowCoverageEntries,
  kiroWorkflowCoverageCategories,
} from "../scripts/kiro-ai-quality-gate-contracts.mjs";
import { validateKiroAiQualityGateWorkflowCoverage } from "../scripts/validate-kiro-ai-quality-gate-workflow-coverage.mjs";

const repoRoot = join(import.meta.dirname, "..");
const languages = ["en", "ja"];

function listKiroWorkflowNames(language) {
  return readdirSync(join(repoRoot, ".takt", language, "workflows"))
    .filter((file) => file.startsWith("kiro-") && file.endsWith(".yaml"))
    .map((file) => file.replace(/\.yaml$/, ""))
    .sort();
}

function makeCoverageFixture() {
  const root = mkdtempSync(join(tmpdir(), "kiro-ai-quality-gate-coverage-"));
  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  return root;
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function readFixtureFile(root, path) {
  return readFileSync(join(root, path), "utf8");
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

test("orchestration workflows delegate artifact-level AI review without direct AI gate calls", () => {
  const byName = new Map(getKiroWorkflowCoverageEntries().map((entry) => [entry.workflowName, entry]));

  for (const workflowName of ["kiro-discovery", "kiro-spec-batch"]) {
    const entry = byName.get(workflowName);
    assert.equal(entry.category, "orchestration_delegated");
    assert.match(entry.adjacentOwner, /kiro-spec-/);
    assert.equal(entry.allowedGateCall, undefined);

    for (const language of languages) {
      const path = join(repoRoot, ".takt", language, "workflows", `${workflowName}.yaml`);
      const content = readFileSync(path, "utf8");
      assert.equal(content.includes("kiro-ai-quality-gate"), false, `${path} must not call implementation AI gate`);
      assert.equal(content.includes("kiro-spec-ai-quality-gate"), false, `${path} must not call spec AI gate directly`);
    }
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
  const facetSpecs = [
    {
      name: "kiro-spec-requirements-review.md",
      namespacedTerms: [
        "reports/subworkflows/iteration-*--step-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      ],
    },
    {
      name: "kiro-validate-design-readiness.md",
      namespacedTerms: [
        "reports/subworkflows/iteration-*--step-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      ],
    },
    {
      name: "kiro-spec-tasks-review.md",
      namespacedTerms: [
        "reports/subworkflows/iteration-*--step-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      ],
    },
    {
      name: "kiro-spec-quick-sanity-review.md",
      namespacedTerms: [
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
        "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      ],
    },
  ];
  const requiredTerms = [
    "kiro-spec-ai-antipattern-review.md",
    "kiro-spec-ai-antipattern-fix.md",
    "namespaced",
    "unresolved",
    "stale",
    "cross-run",
    "evidence-free",
    "optional fix report",
  ];

  for (const language of languages) {
    for (const facetSpec of facetSpecs) {
      const path = join(repoRoot, ".takt", language, "facets", "instructions", facetSpec.name);
      const content = readFileSync(path, "utf8");
      for (const term of [...requiredTerms, ...facetSpec.namespacedTerms]) {
        assert.ok(content.includes(term), `${path} should include ${term}`);
      }
    }
  }
});

test("design readiness allows missing spec AI gate evidence only for standalone validation", () => {
  const requiredTermsByLanguage = {
    en: [
      "standalone `kiro-validate-design`",
      "kiro-spec-ai-antipattern-review.md",
      "skip the AI quality gate evidence check",
      "kiro-spec-design",
      "kiro-spec-quick",
      "DECISION: MANUAL_VERIFY_REQUIRED",
    ],
    ja: [
      "standalone `kiro-validate-design`",
      "kiro-spec-ai-antipattern-review.md",
      "AI quality gate evidence check をスキップ",
      "kiro-spec-design",
      "kiro-spec-quick",
      "DECISION: MANUAL_VERIFY_REQUIRED",
    ],
  };

  for (const language of languages) {
    const path = join(repoRoot, ".takt", language, "facets", "instructions", "kiro-validate-design-readiness.md");
    const content = readFileSync(path, "utf8");
    for (const term of requiredTermsByLanguage[language]) {
      assert.ok(content.includes(term), `${path} should include ${term}`);
    }
  }
});

test("standalone spec generation workflows route drafts through spec AI quality gate before domain review", () => {
  const workflowSpecs = [
    {
      workflow: "kiro-spec-requirements",
      gate: "ai-quality-gate-requirements",
      generate: "generate-requirements",
      repair: "repair-requirements",
      review: "review-requirements",
    },
    {
      workflow: "kiro-spec-design",
      gate: "ai-quality-gate-design",
      generate: "generate-design",
      repair: "repair-design",
      review: "review-design",
    },
    {
      workflow: "kiro-spec-tasks",
      gate: "ai-quality-gate-tasks",
      generate: "generate-tasks",
      repair: "repair-tasks",
      review: "review-tasks",
    },
  ];

  for (const language of languages) {
    for (const spec of workflowSpecs) {
      const path = join(repoRoot, ".takt", language, "workflows", `${spec.workflow}.yaml`);
      const content = readFileSync(path, "utf8");
      assert.ok(content.includes(`- ${spec.gate}`), `${path} loop monitor should include ${spec.gate}`);
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*kind: workflow_call[\\s\\S]*call: ./kiro-spec-ai-quality-gate.yaml`));
      assert.match(content, new RegExp(`- name: ${spec.generate}[\\s\\S]*next: ${spec.gate}`));
      assert.match(content, new RegExp(`- name: ${spec.repair}[\\s\\S]*next: ${spec.gate}`));
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*condition: COMPLETE[\\s\\S]*next: ${spec.review}`));
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*condition: need_replan[\\s\\S]*next: ABORT`));
      assert.ok(
        content.includes(`condition: Healthy (review findings are converging)\n          next: ${spec.gate}`),
        `${path} loop monitor Healthy branch should route to ${spec.gate}`,
      );
    }
  }
});

test("quick spec workflow routes each phase draft through spec AI quality gate before local review", () => {
  const phaseSpecs = [
    {
      gate: "quick-ai-quality-gate-requirements",
      generate: "quick-requirements",
      repair: "quick-repair-requirements",
      review: "quick-review-requirements",
    },
    {
      gate: "quick-ai-quality-gate-design",
      generate: "quick-design",
      repair: "quick-repair-design",
      review: "quick-review-design",
    },
    {
      gate: "quick-ai-quality-gate-tasks",
      generate: "quick-tasks",
      repair: "quick-repair-tasks",
      review: "quick-review-tasks",
    },
  ];
  const forbiddenStandaloneCalls = [
    "call: ./kiro-spec-requirements.yaml",
    "call: ./kiro-spec-design.yaml",
    "call: ./kiro-spec-tasks.yaml",
  ];

  for (const language of languages) {
    const path = join(repoRoot, ".takt", language, "workflows", "kiro-spec-quick.yaml");
    const content = readFileSync(path, "utf8");

    for (const spec of phaseSpecs) {
      assert.ok(content.includes(`- ${spec.gate}`), `${path} loop monitor should include ${spec.gate}`);
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*kind: workflow_call[\\s\\S]*call: ./kiro-spec-ai-quality-gate.yaml`));
      assert.match(content, new RegExp(`- name: ${spec.generate}[\\s\\S]*next: ${spec.gate}`));
      assert.match(content, new RegExp(`- name: ${spec.repair}[\\s\\S]*next: ${spec.gate}`));
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*condition: COMPLETE[\\s\\S]*next: ${spec.review}`));
      assert.match(content, new RegExp(`- name: ${spec.gate}[\\s\\S]*condition: need_replan[\\s\\S]*next: ABORT`));
      assert.ok(
        content.includes(`condition: Healthy (review findings are converging)\n          next: ${spec.gate}`),
        `${path} loop monitor Healthy branch should route to ${spec.gate}`,
      );
    }

    for (const forbiddenCall of forbiddenStandaloneCalls) {
      assert.equal(content.includes(forbiddenCall), false, `${path} must not reuse standalone phase workflows`);
    }
  }
});

test("quick sanity review requires namespaced AI gate evidence for each quick phase", () => {
  const requiredTerms = [
    "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
    "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
    "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
    "namespaced",
    "kiro-spec-ai-antipattern-fix.md",
  ];

  for (const language of languages) {
    const path = join(repoRoot, ".takt", language, "facets", "instructions", "kiro-spec-quick-sanity-review.md");
    const content = readFileSync(path, "utf8");
    for (const term of requiredTerms) {
      assert.ok(content.includes(term), `${path} should include ${term}`);
    }
  }
});

test("coverage validator accepts current Kiro AI quality gate coverage surface", () => {
  const result = validateKiroAiQualityGateWorkflowCoverage();

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("coverage validator reports unclassified Kiro workflows as maintainer decisions", () => {
  const root = makeCoverageFixture();
  writeFixtureFile(
    root,
    ".takt/en/workflows/kiro-new-orchestration.yaml",
    "name: kiro-new-orchestration\nsteps:\n  - name: inspect\n    edit: false\n",
  );
  writeFixtureFile(
    root,
    ".takt/ja/workflows/kiro-new-orchestration.yaml",
    "name: kiro-new-orchestration\nsteps:\n  - name: inspect\n    edit: false\n",
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("MAINTAINER_DECISION_REQUIRED") && failure.includes("kiro-new-orchestration")),
    result.failures.join("\n"),
  );
});

test("coverage validator rejects decision-required coverage entries as not yet covered", () => {
  const coverageEntries = getKiroWorkflowCoverageEntries().map((entry) =>
    entry.workflowName === "kiro-discovery"
      ? { ...entry, category: "maintainer_decision_required", adjacentOwner: undefined }
      : entry,
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ coverageEntries });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("MAINTAINER_DECISION_REQUIRED") && failure.includes("kiro-discovery")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects eligible generation workflows that bypass the spec AI quality gate", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/workflows/kiro-spec-requirements.yaml";
  writeFixtureFile(root, path, readFixtureFile(root, path).replaceAll("ai-quality-gate-requirements", "review-requirements"));

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("ELIGIBLE_GATE_BYPASS") && failure.includes("kiro-spec-requirements")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects bare workflow name gate calls", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/workflows/kiro-spec-design.yaml";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace("call: ./kiro-spec-ai-quality-gate.yaml", "call: kiro-spec-ai-quality-gate"),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("INVALID_GATE_CALL") && failure.includes("kiro-spec-design")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects read-only workflows that gain AI fix loop behavior", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/workflows/kiro-validate-design.yaml";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "\nsteps:\n",
      "\nloop_monitors:\n  - cycle:\n      - ai-quality-gate-design\n      - validate-design\n    threshold: 2\n\nsteps:\n",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("READ_ONLY_GATE_BEHAVIOR") && failure.includes("kiro-validate-design")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects language drift in gate call paths before treating workflows as covered", () => {
  const root = makeCoverageFixture();
  const path = ".takt/ja/workflows/kiro-spec-quick.yaml";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "call: ./kiro-spec-ai-quality-gate.yaml",
      "call: ./kiro-spec-ai-quality-gate-drift.yaml",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("LANGUAGE_PARITY_DRIFT") && failure.includes("kiro-spec-quick")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects spec gate need_replan routing back into local repair", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/workflows/kiro-spec-requirements.yaml";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "condition: need_replan\n        next: ABORT",
      "condition: need_replan\n        next: repair-requirements",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("REPLAN_ROUTING_DRIFT") && failure.includes("repair")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects loop monitor Healthy routing that skips the spec AI gate", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/workflows/kiro-spec-quick.yaml";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "condition: Healthy (review findings are converging)\n          next: quick-ai-quality-gate-design",
      "condition: Healthy (review findings are converging)\n          next: quick-review-design",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("LOOP_MONITOR_GATE_BYPASS") && failure.includes("quick-ai-quality-gate-design")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects downstream review facets that omit namespaced gate evidence paths", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/facets/instructions/kiro-validate-design-readiness.md";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      "kiro-spec-ai-antipattern-review.md",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some(
      (failure) => failure.includes("DOWNSTREAM_GATE_EVIDENCE_DRIFT") && failure.includes("quick-ai-quality-gate-design"),
    ),
    result.failures.join("\n"),
  );
});

test("coverage validator detects missing quick phase namespaced gate evidence instructions", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/facets/instructions/kiro-spec-quick-sanity-review.md";
  writeFixtureFile(
    root,
    path,
    readFixtureFile(root, path).replace(
      "reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md",
      "kiro-spec-ai-antipattern-review.md",
    ),
  );

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("QUICK_GATE_EVIDENCE_DRIFT") && failure.includes("quick-sanity-review")),
    result.failures.join("\n"),
  );
});

test("coverage validator detects policy facets that duplicate workflow inventory rows", () => {
  const root = makeCoverageFixture();
  const path = ".takt/en/facets/policies/kiro-ai-quality-gate-coverage.md";
  writeFixtureFile(root, path, `${readFixtureFile(root, path)}\n| \`kiro-impl\` | existing_gate_coverage |\n`);

  const result = validateKiroAiQualityGateWorkflowCoverage({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some((failure) => failure.includes("POLICY_INVENTORY_DUPLICATION") && failure.includes("kiro-impl")),
    result.failures.join("\n"),
  );
});

test("repository scripts and CI run Kiro AI quality gate coverage checks", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const ciWorkflow = readFileSync(join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  const requiredScripts = {
    "validate:kiro-ai-quality-gate-workflow-coverage":
      "node scripts/validate-kiro-ai-quality-gate-workflow-coverage.mjs",
    "test:kiro-ai-quality-gate-workflow-coverage":
      "node --test tests/kiro-ai-quality-gate-workflow-coverage.test.mjs",
    "test:kiro-ai-quality-gate-runtime-smoke": "node --test tests/kiro-ai-quality-gate-runtime-smoke.test.mjs",
  };

  for (const [scriptName, command] of Object.entries(requiredScripts)) {
    assert.equal(packageJson.scripts[scriptName], command, `${scriptName} should run ${command}`);
    assert.ok(ciWorkflow.includes(`npm run ${scriptName}`), `CI should run ${scriptName}`);
  }

  for (const scriptName of [
    "validate:kiro-shared-contracts",
    "validate:kiro-spec-generation-workflows",
    "validate:kiro-status-validation-workflows",
  ]) {
    assert.ok(ciWorkflow.includes(`npm run ${scriptName}`), `CI should run ${scriptName}`);
  }
});
