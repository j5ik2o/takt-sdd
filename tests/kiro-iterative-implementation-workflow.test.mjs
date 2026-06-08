import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  symlinkSync(join(repoRoot, "tests"), join(root, "tests"), "dir");
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

test("validator accepts single-quoted Kiro skill frontmatter values", () => {
  const root = makeCurrentSurfaceFixture();
  const facetPath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-execute-task.md");
  const facet = readFileSync(facetPath, "utf8").replace(
    'extends_skill_section: "## Step 3: Execute Implementation"',
    "extends_skill_section: '## Step 3: Execute Implementation'",
  );
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-execute-task.md", facet);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, true, result.failures.join("\n"));
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

test("validator rejects direct review routing that bypasses AI quality gate", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS READY_FOR_REVIEW\n        next: ai-quality-gate",
    "STATUS READY_FOR_REVIEW\n        next: review-task",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("ai-quality-gate")));
});

test("validator rejects parent loop monitor that skips AI quality gate", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("      - ai-quality-gate\n", "")
    .replace(
      "loop_monitors.threshold reached for execute-task, ai-quality-gate, review-task, and debug-task",
      "loop_monitors.threshold reached for execute-task, review-task, and debug-task",
    );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("loop monitor must include ai-quality-gate")));
});

test("validator rejects missing AI quality gate workflow", () => {
  const root = makeCurrentSurfaceFixture();
  rmSync(join(root, ".takt", "ja", "workflows", "kiro-ai-quality-gate.yaml"));

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("GATE_WORKFLOW_MISSING")));
});

test("validator rejects unapproved nested Kiro workflow call", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("call: ./kiro-ai-quality-gate.yaml", "call: kiro-spec-design");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("workflow_call")));
});

test("validator rejects AI quality gate loop threshold drift", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("threshold: 3", "threshold: 1");
  writeFixtureFile(root, ".takt/ja/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("threshold: 3")));
});

test("validator rejects AI quality gate review routing gaps", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    '      - when: "true"\n        next: request-replan\n        appendix: Treat ambiguous, blocked, or internally inconsistent review outcomes as requiring replanning.\n',
    "",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("ambiguous outcomes")));
});

test("validator rejects AI quality gate review vocabulary drift", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("condition: No AI-specific issues", "condition: VERDICT APPROVED and no persistent AI antipattern findings remain")
    .replace("condition: AI-specific issues found", "condition: VERDICT REJECTED and actionable AI antipattern findings exist");
  writeFixtureFile(root, ".takt/en/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("no AI-specific issues")));
  assert.ok(result.failures.some((failure) => failure.includes("AI-specific issues to fix")));
});

test("validator rejects request-replan rules that only handle loop exhaustion", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("the review outcome was ambiguous or the review/fix loop did not converge", "the review/fix loop did not converge")
    .replace(
      "condition: Replan is required after an ambiguous AI antipattern review outcome or an unproductive AI antipattern fix loop",
      "condition: Replan is required after an unproductive AI antipattern fix loop",
    );
  writeFixtureFile(root, ".takt/en/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("ambiguous review outcomes and loop exhaustion")));
});

test("validator rejects AI quality gate loop exhaustion that aborts instead of replanning", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "condition: Unproductive (loop_monitors.threshold reached for ai-antipattern-review-1st and ai-antipattern-fix)\n          next: request-replan",
    "condition: Unproductive (loop_monitors.threshold reached for ai-antipattern-review-1st and ai-antipattern-fix)\n          next: ABORT",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("request-replan")));
});

test("validator rejects missing AI gate evidence hooks in review adapter", () => {
  const root = makeCurrentSurfaceFixture();
  const reviewPath = join(root, ".takt", "en", "facets", "instructions", "kiro-review-task.md");
  const review = readFileSync(reviewPath, "utf8").replaceAll("kiro-ai-antipattern-review.md", "missing-ai-review.md");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-review-task.md", review);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-review-task.md")));
});

test("validator rejects adapters that require AI antipattern fix reports unconditionally", () => {
  const root = makeCurrentSurfaceFixture();
  const reviewPath = join(root, ".takt", "en", "facets", "instructions", "kiro-review-task.md");
  const review = readFileSync(reviewPath, "utf8")
    .replace("only if that report exists in the current AI quality gate subworkflow run; it is optional", "before forming the verdict")
    .replace("stale or cross-run fix evidence, ", "");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-review-task.md", review);
  const verifyPath = join(root, ".takt", "en", "facets", "instructions", "kiro-verify-task-completion.md");
  const verify = readFileSync(verifyPath, "utf8")
    .replace(" plus optional `kiro-ai-antipattern-fix.md` only if it exists in the current AI quality gate subworkflow run", " and `kiro-ai-antipattern-fix.md`")
    .replace("stale or cross-run fix evidence, ", "");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-verify-task-completion.md", verify);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("optional")));
});

test("validator rejects verify adapters that ignore AI antipattern fix statuses", () => {
  const root = makeCurrentSurfaceFixture();
  const verifyPath = join(root, ".takt", "ja", "facets", "instructions", "kiro-verify-task-completion.md");
  const verify = readFileSync(verifyPath, "utf8")
    .replace("`STATUS NEED_REPLAN`、`STATUS BLOCKED`、", "")
    .replace("finding-level evidence がない `STATUS NO_FIX_NEEDED`", "weak no-fix evidence");
  writeFixtureFile(root, ".takt/ja/facets/instructions/kiro-verify-task-completion.md", verify);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("STATUS NEED_REPLAN")));
});

test("validator rejects progress adapter reading AI gate reports directly", () => {
  const root = makeCurrentSurfaceFixture();
  const progressPath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-update-progress.md");
  const progress = `${readFileSync(progressPath, "utf8")}\nRead kiro-ai-antipattern-review.md before updating progress.\n`;
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-update-progress.md", progress);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("update-progress must not read")));
});

test("validator rejects debug retry routing without retry eligibility", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "NEXT_ACTION RETRY_TASK and retry_eligible true",
    "NEXT_ACTION RETRY_TASK",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("retry-eligible RETRY_TASK")));
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

test("validator rejects progress routing that drops task set status", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replaceAll("task_set_status", "task summary");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("update-progress")));
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
