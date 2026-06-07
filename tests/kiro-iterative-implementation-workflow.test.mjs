import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { validateKiroIterativeImplementationWorkflow } from "../scripts/validate-kiro-iterative-implementation-workflow.mjs";
import { buildTaktArgs, resolveWorkflowPath } from "../scripts/kiro-staged.mjs";

function makeFixture() {
  return mkdtempSync(join(tmpdir(), "kiro-iterative-impl-"));
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function makeRepoFixture(packageScripts = {}) {
  const root = makeFixture();
  const repoRoot = join(import.meta.dirname, "..");
  symlinkSync(join(repoRoot, ".agents"), join(root, ".agents"), "dir");
  symlinkSync(join(repoRoot, ".kiro"), join(root, ".kiro"), "dir");
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  writeFixtureFile(root, "package.json", `${JSON.stringify({ scripts: packageScripts }, null, 2)}\n`);
  return root;
}

function makeCurrentSurfaceFixture() {
  const root = makeFixture();
  const repoRoot = join(import.meta.dirname, "..");
  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  symlinkSync(join(repoRoot, ".agents"), join(root, ".agents"), "dir");
  symlinkSync(join(repoRoot, ".kiro"), join(root, ".kiro"), "dir");
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  writeFixtureFile(
    root,
    "package.json",
    `${JSON.stringify(
      {
        scripts: {
          "validate:kiro-iterative-implementation-workflow":
            "node scripts/validate-kiro-iterative-implementation-workflow.mjs",
          "test:kiro-iterative-implementation-workflow":
            "node --test tests/kiro-iterative-implementation-workflow.test.mjs",
        },
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

test("current repository satisfies kiro iterative implementation workflow validation", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const result = validateKiroIterativeImplementationWorkflow({ repoRoot });
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("staged Kiro wrapper resolves configured language workflow path", () => {
  const root = makeCurrentSurfaceFixture();

  assert.equal(resolveWorkflowPath(root, "kiro-impl"), join(root, ".takt", "ja", "workflows", "kiro-impl.yaml"));
  assert.deepEqual(buildTaktArgs("/tmp/kiro-impl.yaml", ["--pipeline", "--skip-git", "-t"]), [
    "--pipeline",
    "--skip-git",
    "-w",
    "/tmp/kiro-impl.yaml",
    "-t",
  ]);
  assert.deepEqual(buildTaktArgs("/tmp/kiro-impl.yaml", ["--pipeline", "--skip-git", "-t", "--help"]), [
    "--pipeline",
    "--skip-git",
    "--help",
    "-w",
    "/tmp/kiro-impl.yaml",
  ]);
});

test("validator reports missing kiro-impl workflow and package wiring", () => {
  const root = makeRepoFixture({});
  mkdirSync(join(root, ".takt", "en", "workflows"), { recursive: true });
  mkdirSync(join(root, ".takt", "ja", "workflows"), { recursive: true });

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("WORKFLOW_MISSING") && failure.includes("kiro-impl.yaml")));
  assert.ok(result.failures.some((failure) => failure.includes("validate:kiro-iterative-implementation-workflow")));
  assert.ok(result.failures.some((failure) => failure.includes("test:kiro-iterative-implementation-workflow")));
});

test("validator rejects standalone adapter workflows", () => {
  const root = makeRepoFixture({
    "validate:kiro-iterative-implementation-workflow": "node scripts/validate-kiro-iterative-implementation-workflow.mjs",
    "test:kiro-iterative-implementation-workflow": "node --test tests/kiro-iterative-implementation-workflow.test.mjs",
  });
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(root, `.takt/${lang}/workflows/kiro-review.yaml`, "name: kiro-review\nsteps: []\n");
  }

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("STANDALONE_ADAPTER_DRIFT")));
});

test("validator rejects custom retry or loop health source of truth in workflow", () => {
  const root = makeRepoFixture({
    "validate:kiro-iterative-implementation-workflow": "node scripts/validate-kiro-iterative-implementation-workflow.mjs",
    "test:kiro-iterative-implementation-workflow": "node --test tests/kiro-iterative-implementation-workflow.test.mjs",
  });
  const repoRoot = join(import.meta.dirname, "..");
  const workflow = readFileSync(join(repoRoot, ".takt", "ja", "workflows", "cc-sdd-impl.yaml"), "utf8")
    .replace("name: cc-sdd-impl", "name: kiro-impl")
    .replace("initial_step: plan", "initial_step: check-readiness")
    .replace("max_steps: 50", "max_steps: 30")
    .concat("\n# maxAttempts: 3\n");
  for (const lang of ["en", "ja"]) {
    writeFixtureFile(root, `.takt/${lang}/workflows/kiro-impl.yaml`, workflow);
  }

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("LOOP_MONITOR_DRIFT")));
});

test("validator rejects completion-before-checkbox gate drift", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS VERIFIED and safe_to_update_progress true",
    "STATUS VERIFIED",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("verify-task-completion")));
});

test("validator rejects plan blockers that bypass progress blocker notes", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "- condition: STATUS BLOCKED and selected task exists and blocker_note_required true\n        next: update-progress",
    "- condition: STATUS BLOCKED and selected task exists and blocker_note_required true\n        next: ABORT",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("selected-task blockers")));
});

test("validator rejects progress updates that omit routing status outputs", () => {
  const root = makeCurrentSurfaceFixture();
  const progressPath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-update-progress.md");
  const progress = readFileSync(progressPath, "utf8").replaceAll("READY_FOR_REVIEW", "PROGRESS_DONE");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-update-progress.md", progress);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-impl-update-progress.md")));
});

test("validator rejects workflow references to missing persona resources", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("persona: coding-reviewer", "persona: reviewer");
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("RESOURCE_REFERENCE_DRIFT") && failure.includes("reviewer")));
});

test("validator rejects progress policy drift that loses selected task guard", () => {
  const root = makeCurrentSurfaceFixture();
  const policyPath = join(root, ".takt", "ja", "facets", "policies", "kiro-impl-task-progress.md");
  const policy = readFileSync(policyPath, "utf8").replaceAll("selected task", "target task");
  writeFixtureFile(root, ".takt/ja/facets/policies/kiro-impl-task-progress.md", policy);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-impl-task-progress.md")));
});
