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
          "test:kiro-ai-quality-gate-runtime-smoke": "node --test tests/kiro-ai-quality-gate-runtime-smoke.test.mjs",
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
  assert.deepEqual(buildTaktArgs("/tmp/kiro-spec-requirements.yaml", ["--pipeline", "--skip-git", "-t", "feature=demo", "-y"]), [
    "--pipeline",
    "--skip-git",
    "-w",
    "/tmp/kiro-spec-requirements.yaml",
    "-t",
    "feature=demo -y",
  ]);
});

test("staged Kiro wrapper resolves configured language from config.yml fallback", () => {
  const root = makeCurrentSurfaceFixture();
  rmSync(join(root, ".takt", "config.yaml"), { force: true });
  writeFixtureFile(root, ".takt/config.yml", "language: en\n");

  assert.equal(resolveWorkflowPath(root, "kiro-impl"), join(root, ".takt", "en", "workflows", "kiro-impl.yaml"));
});

test("validator accepts body Kiro Skill Source instructions", () => {
  const root = makeCurrentSurfaceFixture();

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("validator rejects reviewer adapters without Kiro Skill Source instructions", () => {
  const root = makeCurrentSurfaceFixture();
  const facetPath = join(root, ".takt", "en", "facets", "instructions", "kiro-review-architecture-task.md");
  const facet = readFileSync(facetPath, "utf8").replace(
    /\n## Kiro Skill Source\n\nBefore executing this instruction, invoke `\$kiro-review` or `\/kiro-review` and read the resolved `SKILL\.md`\.\nApply the `## Outputs` section from `\$kiro-review` or `\/kiro-review` as this step's source of truth\.\nThis facet defines only the adapter delta for the TAKT workflow\.\n/,
    "\n",
  );
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-review-architecture-task.md", facet);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-review-architecture-task.md") && failure.includes("kiro-review")));
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
  const workflow = readFileSync(join(repoRoot, ".takt", "ja", "workflows", "kiro-impl.yaml"), "utf8")
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

test("validator rejects readiness routing that skips ready-for-implementation", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS READY_FOR_REVIEW and ready_for_implementation true and exactly one selected task and implementation plan emitted",
    "STATUS READY_FOR_REVIEW and exactly one selected task and implementation plan emitted",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("readiness before edit")));
});

test("validator rejects dispatch routing that bypasses single-task fallback", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS READY_FOR_REVIEW and dispatch_mode single\n        next: plan-one-task",
    "STATUS READY_FOR_REVIEW and dispatch_mode single\n        next: execute-task",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("fall back to plan-one-task")));
});

test("validator rejects TeamLeader wave execution without team_leader configuration", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("    team_leader:\n", "    leader:\n");
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("team_leader:")));
});

test("validator rejects wave collection reverting to planning parent", () => {
  const root = makeCurrentSurfaceFixture();
  const collectPath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-collect-wave-results.md");
  const collect = readFileSync(collectPath, "utf8").replace("{extends: implement-after-tests}", "{extends: plan}");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-collect-wave-results.md", collect);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some(
      (failure) => failure.includes("kiro-impl-collect-wave-results.md") && failure.includes("implement-after-tests"),
    ),
  );
});

test("validator rejects wave collection that omits COMPLETE part status handling", () => {
  const root = makeCurrentSurfaceFixture();
  const collectPath = join(root, ".takt", "ja", "facets", "instructions", "kiro-impl-collect-wave-results.md");
  const collect = readFileSync(collectPath, "utf8").replaceAll("COMPLETE", "DONE");
  writeFixtureFile(root, ".takt/ja/facets/instructions/kiro-impl-collect-wave-results.md", collect);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-impl-collect-wave-results.md") && failure.includes("COMPLETE")));
});

test("validator rejects wave execution that can invent task branch names", () => {
  const root = makeCurrentSurfaceFixture();
  const executePath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-execute-task-wave.md");
  const execute = readFileSync(executePath, "utf8").replace("Do not invent wave-id-derived branch names", "Use clear branch names");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-execute-task-wave.md", execute);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(
    result.failures.some(
      (failure) =>
        failure.includes("kiro-impl-execute-task-wave.md") &&
        failure.includes("Do not invent wave-id-derived branch names"),
    ),
  );
});

test("validator rejects wave apply routing that bypasses AI quality gate", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS READY_FOR_REVIEW and selected task exists\n        next: ai-quality-gate",
    "STATUS READY_FOR_REVIEW and selected task exists\n        next: reviewers",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("apply-wave-task must rejoin")));
});

test("validator rejects blocked execution routing to reviewers", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS BLOCKED\n        next: debug-task",
    "STATUS BLOCKED\n        next: reviewers",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("BLOCKED to debug-task")));
});

test("validator rejects direct review routing that bypasses AI quality gate", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "STATUS READY_FOR_REVIEW\n        next: ai-quality-gate",
    "STATUS READY_FOR_REVIEW\n        next: reviewers",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("ai-quality-gate")));
});

test("validator rejects implementation AI quality gate without local ai-review wiring", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-ai-quality-gate.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "  ai-antipattern-review: ../facets/instructions/ai-review.md\n",
    "",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-ai-quality-gate.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("local ai-review instruction")));
});

test("validator rejects parent loop monitor that skips AI quality gate", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("      - ai-quality-gate\n", "")
    .replace(
      "loop_monitors.threshold reached for execute-task, ai-quality-gate, reviewers, and debug-task",
      "loop_monitors.threshold reached for execute-task, reviewers, and debug-task",
    );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("loop monitor must include ai-quality-gate")));
});

test("validator rejects review loop monitor with stale single-review verdict wording", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    'reviewer child conditions are converging toward all("approved") and needs_fix findings are shrinking',
    "review findings are converging toward VERDICT APPROVED",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("parallel reviewer condition vocabulary")));
});

test("validator rejects missing parallel reviewer group", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("  - name: reviewers\n    parallel:", "  - name: reviewers\n    edit: false")
    .replace("        next: verify-task-completion", "        next: verify-task-completion");
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("reviewers must be a parallel group")));
});

test("validator rejects reviewer group without all mandatory reviewers", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("persona: testing-reviewer", "persona: coding-reviewer");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("testing-reviewer")));
});

test("validator rejects reviewer group routing without all approved aggregation", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace('condition: all("approved")', "condition: approved");
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("all approved reports")));
});

test("validator rejects reviewer group routing without needs-fix aggregation", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace('condition: any("needs_fix")', "condition: needs_fix");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("any needs_fix report")));
});

test("validator rejects wrong reviewer report filenames", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace("kiro-task-qa-review.md", "qa-review.md");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-task-qa-review.md")));
});

test("validator rejects builtin reviewer output contracts in Kiro reviewer group", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "name: kiro-task-architecture-review.md\n              format: kiro-review-verdict",
    "name: kiro-task-architecture-review.md\n              format: architecture-review",
  );
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-review-verdict")));
});

test("validator rejects mandatory security reviewer mixed into Kiro implementation reviewers", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "      - name: qa-review",
    "      - name: security-review\n        edit: false\n        persona: security-reviewer\n        policy: review\n        instruction: review-security\n        output_contracts:\n          report:\n            - name: security-review.md\n              format: security-review\n        rules:\n          - condition: approved\n          - condition: needs_fix\n\n      - name: qa-review",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("reviewer group order")));
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

test("validator rejects contradictory review verdict routing wording", () => {
  const root = makeCurrentSurfaceFixture();
  const reviewPath = join(root, ".takt", "en", "facets", "instructions", "kiro-review-task.md");
  const review = readFileSync(reviewPath, "utf8").replace(
    "Do not add another output field for the verdict. `VERDICT` remains the output source of truth.",
    "Workflow rules branch on `VERDICT`; do not translate the result to another field.",
  );
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-review-task.md", review);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("VERDICT output source")));
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

test("validator rejects debug adapters that ignore reviewer child reports", () => {
  const root = makeCurrentSurfaceFixture();
  const debugPath = join(root, ".takt", "en", "facets", "instructions", "kiro-debug-task.md");
  const debug = readFileSync(debugPath, "utf8")
    .replaceAll("kiro-task-coding-review.md", "missing-coding-review.md")
    .replaceAll("kiro-task-architecture-review.md", "missing-architecture-review.md")
    .replaceAll("kiro-task-qa-review.md", "missing-qa-review.md")
    .replaceAll("kiro-task-testing-review.md", "missing-testing-review.md");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-debug-task.md", debug);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-task-coding-review.md")));
});

test("validator rejects debug adapters that ignore implementation result report", () => {
  const root = makeCurrentSurfaceFixture();
  const debugPath = join(root, ".takt", "ja", "facets", "instructions", "kiro-debug-task.md");
  const debug = readFileSync(debugPath, "utf8").replaceAll(
    "kiro-task-implementation-result.md",
    "missing-implementation-result.md",
  );
  writeFixtureFile(root, ".takt/ja/facets/instructions/kiro-debug-task.md", debug);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-task-implementation-result.md")));
});

test("validator rejects completion verification that ignores reviewer evidence", () => {
  const root = makeCurrentSurfaceFixture();
  const verifyPath = join(root, ".takt", "ja", "facets", "instructions", "kiro-verify-task-completion.md");
  const verify = readFileSync(verifyPath, "utf8")
    .replaceAll("kiro-task-coding-review.md", "missing-coding-review.md")
    .replaceAll("kiro-task-architecture-review.md", "missing-architecture-review.md")
    .replaceAll("kiro-task-qa-review.md", "missing-qa-review.md")
    .replaceAll("kiro-task-testing-review.md", "missing-testing-review.md")
    .replaceAll("needs_fix", "review problem");
  writeFixtureFile(root, ".takt/ja/facets/instructions/kiro-verify-task-completion.md", verify);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("kiro-task-coding-review.md")));
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

test("validator rejects progress routing that skips dispatch re-entry", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "task_set_status REMAINING_TASKS_EXIST\n        next: plan-dispatch",
    "task_set_status REMAINING_TASKS_EXIST\n        next: plan-one-task",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("back to plan-dispatch")));
});

test("validator rejects implementation result contract without wave dispatch fields", () => {
  const root = makeCurrentSurfaceFixture();
  const contractPath = join(root, ".takt", "en", "facets", "output-contracts", "kiro-implementation-result.md");
  const contract = readFileSync(contractPath, "utf8").replaceAll("dispatch_mode", "execution_mode");
  writeFixtureFile(root, ".takt/en/facets/output-contracts/kiro-implementation-result.md", contract);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("dispatch_mode")));
});

test("validator rejects progress updates that count group header checkboxes as remaining tasks", () => {
  const root = makeCurrentSurfaceFixture();
  const progressPath = join(root, ".takt", "en", "facets", "instructions", "kiro-impl-update-progress.md");
  const progress = readFileSync(progressPath, "utf8")
    .replaceAll("executable leaf task", "task")
    .replaceAll("group header", "heading");
  writeFixtureFile(root, ".takt/en/facets/instructions/kiro-impl-update-progress.md", progress);

  const contractPath = join(root, ".takt", "en", "facets", "output-contracts", "kiro-implementation-result.md");
  const contract = readFileSync(contractPath, "utf8")
    .replaceAll("executable leaf task", "task")
    .replaceAll("group header", "heading");
  writeFixtureFile(root, ".takt/en/facets/output-contracts/kiro-implementation-result.md", contract);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("executable leaf task")));
  assert.ok(result.failures.some((failure) => failure.includes("group header")));
});

test("validator rejects single-shot completion when tasks remain", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "ja", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8").replace(
    "task_set_status REMAINING_TASKS_EXIST\n        next: plan-dispatch",
    "task_set_status REMAINING_TASKS_EXIST\n        next: COMPLETE",
  );
  writeFixtureFile(root, ".takt/ja/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("must not complete while remaining tasks exist")));
});

test("validator rejects task planning re-entry that inherits stale session context", () => {
  const root = makeCurrentSurfaceFixture();
  const workflowPath = join(root, ".takt", "en", "workflows", "kiro-impl.yaml");
  const workflow = readFileSync(workflowPath, "utf8")
    .replace("    session: refresh\n    knowledge:\n      - architecture\n", "    knowledge:\n      - architecture\n")
    .replace("    pass_previous_response: false\n    instruction: kiro-impl-plan-one-task\n", "    instruction: kiro-impl-plan-one-task\n");
  writeFixtureFile(root, ".takt/en/workflows/kiro-impl.yaml", workflow);

  const result = validateKiroIterativeImplementationWorkflow({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("SESSION_DRIFT") && failure.includes("refresh session")));
  assert.ok(result.failures.some((failure) => failure.includes("SESSION_DRIFT") && failure.includes("update-progress responses")));
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
