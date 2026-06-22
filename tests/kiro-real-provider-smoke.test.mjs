import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";

// Real-provider smoke intentionally uses semantic assertions instead of exact
// generated text because provider output can vary. Mock-provider smoke tests
// should stay strict and deterministic.
const featureName = "kiro-real-provider-smoke";
const defaultWorkflowTimeoutMs = 900000;
const defaultImplWorkflowTimeoutMs = 1800000;
const fatalWorkflowPatterns = [
  /\[ERROR\]/,
  /Workflow aborted/i,
  /Result:\s*Failed/i,
  /^Status:.*\b(?:ABORT|BLOCKED|NEEDS_FIX|NO-GO)\b/im,
];

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function runFixtureCommand(root, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  return result;
}

function initializeFixtureGit(root) {
  runFixtureCommand(root, "git", ["init", "-b", "main"]);
  runFixtureCommand(root, "git", ["config", "user.email", "kiro-smoke@example.test"]);
  runFixtureCommand(root, "git", ["config", "user.name", "Kiro Smoke"]);
  commitFixtureState(root, "initial smoke fixture");
}

function commitFixtureState(root, message) {
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  assert.equal(status.status, 0, `git status failed\n${status.stdout}\n${status.stderr}`);
  if (!status.stdout.trim()) {
    return;
  }
  runFixtureCommand(root, "git", ["add", "."]);
  runFixtureCommand(root, "git", ["commit", "-m", message]);
}

function fixtureConfigPath(root) {
  for (const name of ["config.yaml", "config.yml"]) {
    const path = join(root, ".takt", name);
    if (existsSync(path)) {
      return path;
    }
  }
  assert.fail("expected .takt/config.yaml or .takt/config.yml in real-provider smoke fixture");
}

function configuredProvider(root) {
  const config = readFileSync(fixtureConfigPath(root), "utf8");
  return config.match(/^provider:\s*(\S+)\s*$/m)?.[1];
}

function linkCodexHomeIfConfigured(root) {
  if (configuredProvider(root) !== "codex") {
    return;
  }
  const candidates = [
    process.env.KIRO_REAL_PROVIDER_CODEX_HOME,
    process.env.CODEX_HOME,
    join(homedir(), ".codex-personal"),
  ].filter(Boolean);
  const codexHome = candidates.find((path) => existsSync(path));
  assert.ok(
    codexHome,
    "provider is codex; set CODEX_HOME or KIRO_REAL_PROVIDER_CODEX_HOME, or create ~/.codex-personal",
  );
  symlinkSync(codexHome, join(root, ".codex"), "dir");
}

function makeRealProviderFixture() {
  const root = mkdtempSync(join(tmpdir(), "kiro-real-provider-smoke-"));
  const repoRoot = join(import.meta.dirname, "..");

  cpSync(join(repoRoot, "builtins"), join(root, "builtins"), { recursive: true });
  symlinkSync(join(repoRoot, ".agents"), join(root, ".agents"), "dir");
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  mkdirSync(join(root, ".kiro"), { recursive: true });
  cpSync(join(repoRoot, ".kiro", "settings"), join(root, ".kiro", "settings"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(join(repoRoot, "scripts", "kiro-staged.mjs"), join(root, "scripts", "kiro-staged.mjs"));
  cpSync(join(repoRoot, "scripts", "takt.sh"), join(root, "scripts", "takt.sh"));
  writeFixtureFile(
    root,
    "package.json",
    `${JSON.stringify(
      {
        scripts: {
          "kiro:impl": "node scripts/kiro-staged.mjs kiro-impl --pipeline --skip-git -t",
          "kiro:spec:init": "node scripts/kiro-staged.mjs kiro-spec-init --pipeline --skip-git -t",
          "kiro:spec:requirements": "node scripts/kiro-staged.mjs kiro-spec-requirements --pipeline --skip-git -t",
          "kiro:spec:design": "node scripts/kiro-staged.mjs kiro-spec-design --pipeline --skip-git -t",
          "kiro:spec:tasks": "node scripts/kiro-staged.mjs kiro-spec-tasks --pipeline --skip-git -t",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(root, ".gitignore", ".codex\n.takt/runs/\n.takt/worktrees/\n");
  for (const configName of ["config.yaml", "config.yml"]) {
    const sourceConfigPath = join(repoRoot, ".takt", configName);
    if (existsSync(sourceConfigPath)) {
      writeFixtureFile(root, `.takt/${configName}`, readFileSync(sourceConfigPath, "utf8"));
      break;
    }
  }
  linkCodexHomeIfConfigured(root);
  writeFixtureFile(root, ".kiro/steering/product.md", "# Product\n\nReal-provider smoke fixture for TAKT/Kiro workflow validation.\n");
  writeFixtureFile(root, ".kiro/steering/tech.md", "# Tech\n\nUse only local files in this temporary fixture.\n");
  writeFixtureFile(root, ".kiro/steering/structure.md", "# Structure\n\nSmoke artifacts may be written under `smoke-output/` only.\n");
  writeFixtureFile(root, ".kiro/steering/roadmap.md", "# Roadmap\n\n## Specs (dependency order)\n");
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/brief.md`,
    `# Brief

Create a minimal Kiro full-chain smoke spec using the configured real provider.

The implementation must be tiny and deterministic:

- Own only \`smoke-output/provider-smoke-alpha.txt\` and \`smoke-output/provider-smoke-beta.txt\`.
- The final implementation tasks should be independent and parallelizable.
- One task should create or update \`smoke-output/provider-smoke-alpha.txt\` with a short line containing \`real provider smoke passed alpha\`.
- One task should create or update \`smoke-output/provider-smoke-beta.txt\` with a short line containing \`real provider smoke passed beta\`.
- Do not change production files, package metadata, workflows, facets, scripts, or settings.
- Keep requirements, design, and tasks minimal but valid.
`,
  );
  initializeFixtureGit(root);
  return root;
}

function writeParallelProviderSmokeImplementationArtifacts(root) {
  const now = new Date().toISOString();
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/requirements.md`,
    `# Requirements Document

## Requirements

### Requirement 1: Parallel real-provider smoke outputs

**User Story:** As a workflow maintainer, I want two tiny independent implementation tasks, so that the real-provider smoke covers the TeamLeader \`(P)\` route.

#### Acceptance Criteria

1. WHEN implementation completes THEN \`smoke-output/provider-smoke-alpha.txt\` SHALL contain \`real provider smoke passed alpha\`.
2. WHEN implementation completes THEN \`smoke-output/provider-smoke-beta.txt\` SHALL contain \`real provider smoke passed beta\`.
`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/design.md`,
    `# Design Document

## Overview

This fixture validates the real-provider Kiro implementation workflow with two independent \`(P)\` tasks.

## Boundary Commitments

### This Spec Owns

- \`smoke-output/provider-smoke-alpha.txt\`
- \`smoke-output/provider-smoke-beta.txt\`

### Out of Boundary

- Production files, package metadata, workflows, facets, scripts, and settings.

### Allowed Dependencies

- Existing Kiro implementation workflow and local filesystem writes.

### Revalidation Triggers

- Kiro implementation workflow routing changes.

## File Structure Plan

\`\`\`
smoke-output/
  provider-smoke-alpha.txt
  provider-smoke-beta.txt
\`\`\`

## Requirements Traceability

| Requirement | Design Element |
|-------------|----------------|
| 1.1 | \`provider-smoke-alpha.txt\` |
| 1.2 | \`provider-smoke-beta.txt\` |
`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/tasks.md`,
    `# Implementation Plan

- [ ] 1. Create parallel real-provider smoke outputs
- [ ] 1.1 (P) Write alpha smoke output
  - Create or update \`smoke-output/provider-smoke-alpha.txt\`.
  - The file must contain \`real provider smoke passed alpha\`.
  - _Requirements: 1.1_
  - _Boundary:_ smoke-output/provider-smoke-alpha.txt
  - _Depends:_ none
- [ ] 1.2 (P) Write beta smoke output
  - Create or update \`smoke-output/provider-smoke-beta.txt\`.
  - The file must contain \`real provider smoke passed beta\`.
  - _Requirements: 1.2_
  - _Boundary:_ smoke-output/provider-smoke-beta.txt
  - _Depends:_ none
`,
  );
  const spec = existsSync(join(root, ".kiro", "specs", featureName, "spec.json"))
    ? readSpec(root)
    : {
        feature_name: featureName,
        created_at: now,
        updated_at: now,
        language: "ja",
        phase: "initialized",
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      };
  spec.phase = "tasks-generated";
  spec.approvals = {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: true },
  };
  spec.ready_for_implementation = true;
  spec.updated_at = now;
  writeFixtureFile(root, `.kiro/specs/${featureName}/spec.json`, `${JSON.stringify(spec, null, 2)}\n`);
}

function writeInitializedRequirementsFixture(root) {
  const now = new Date().toISOString();
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/spec.json`,
    `${JSON.stringify(
      {
        feature_name: featureName,
        created_at: now,
        updated_at: now,
        language: "ja",
        phase: "initialized",
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/requirements.md`,
    `# 要件定義

## プロジェクト説明（入力）

real provider requirements smoke は、\`smoke-output/provider-smoke-alpha.txt\` と \`smoke-output/provider-smoke-beta.txt\` だけを後続実装対象にする。
要件は最小でよいが、日本語 EARS 形式、数値 ID、明確な対象範囲を保持する。
production files、package metadata、workflow、facet、script、settings は対象外にする。

## 要件
<!-- /kiro-spec-requirements フェーズで生成されます -->
`,
  );
}

function terminateProcessGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function fixtureProcessIds(root) {
  const result = spawnSync("ps", ["-eo", "pid=,command="], { encoding: "utf8" });
  if (result.status !== 0) {
    return [];
  }
  return result.stdout
    .split("\n")
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      return match ? { pid: Number(match[1]), command: match[2] } : undefined;
    })
    .filter(Boolean)
    .filter((entry) => entry.pid !== process.pid && entry.command.includes(root))
    .map((entry) => entry.pid);
}

function terminateFixtureProcesses(root, signal) {
  for (const pid of fixtureProcessIds(root)) {
    try {
      process.kill(pid, signal);
    } catch {
      // Process already exited.
    }
  }
}

function envTimeoutMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function workflowTimeoutMs(scriptName) {
  if (scriptName === "kiro:impl") {
    return envTimeoutMs(
      "KIRO_REAL_PROVIDER_IMPL_TIMEOUT_MS",
      envTimeoutMs("KIRO_REAL_PROVIDER_TIMEOUT_MS", defaultImplWorkflowTimeoutMs),
    );
  }
  return envTimeoutMs("KIRO_REAL_PROVIDER_TIMEOUT_MS", defaultWorkflowTimeoutMs);
}

function runWorkflow(root, scriptName, target, options = {}) {
  const env = { ...process.env };
  delete env.TAKT_MOCK_SCENARIO;
  delete env.FORCE_COLOR;
  delete env.CLICOLOR_FORCE;
  delete env.NO_COLOR;
  const timeoutMs = options.timeoutMs ?? workflowTimeoutMs(scriptName);
  const patterns = options.fatalPatterns ?? fatalWorkflowPatterns;
  const successWhen = options.successWhen;
  const targetArgs = Array.isArray(target) ? target : [target];

  return new Promise((resolve) => {
    const child = spawn("npm", ["run", scriptName, "--", ...targetArgs], {
      cwd: root,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let earlyAbortReason = "";
    let earlySuccessReason = "";
    let killTimer;

    const abort = (reason, { success = false } = {}) => {
      if (earlyAbortReason || earlySuccessReason) {
        return;
      }
      if (success) {
        earlySuccessReason = reason;
      } else {
        earlyAbortReason = reason;
      }
      terminateProcessGroup(child, "SIGTERM");
      terminateFixtureProcesses(root, "SIGTERM");
      killTimer = setTimeout(() => {
        terminateProcessGroup(child, "SIGKILL");
        terminateFixtureProcesses(root, "SIGKILL");
      }, 5000);
    };

    const onOutput = (chunk) => {
      const text = chunk.toString();
      output += text;
      if (process.env.KIRO_REAL_PROVIDER_VERBOSE === "1") {
        process.stderr.write(text);
      }
      const matchedPattern = patterns.find((pattern) => pattern.test(output));
      if (matchedPattern) {
        abort(`fatal workflow output matched ${matchedPattern}`);
      }
      let successConditionMet = false;
      try {
        successConditionMet = Boolean(successWhen?.({ output: stripAnsi(output), root }));
      } catch {
        successConditionMet = false;
      }
      if (successConditionMet) {
        abort("success condition satisfied", { success: true });
      }
    };

    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.on("error", (error) => {
      output += `\n${error.message}`;
      abort(`spawn error: ${error.message}`);
    });

    const timeout = setTimeout(() => abort(`workflow exceeded ${timeoutMs}ms`), timeoutMs);

    child.on("close", (status, signal) => {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      if (earlyAbortReason || earlySuccessReason) {
        terminateFixtureProcesses(root, "SIGKILL");
      }
      resolve({
        status,
        signal,
        earlyAbortReason,
        earlySuccessReason,
        output,
      });
    });
  });
}

function assertWorkflowSuccess(result, name) {
  const output = stripAnsi(result.output);
  assert.equal(result.earlyAbortReason, "", `${name} stopped early: ${result.earlyAbortReason}\n${output}`);
  assert.equal(result.signal, null, `${name} was terminated by ${result.signal}\n${output}`);
  assert.equal(result.status, 0, `${name} failed\n${output}`);
  assert.match(output, /Result: Success/, `${name} did not report success\n${output}`);
}

function assertRealProviderWorkflowSuccess(result, name) {
  assertWorkflowSuccess(result, name);
}

function assertRealProviderEarlySmokeSuccess(result, name) {
  const output = stripAnsi(result.output);
  assert.equal(result.earlyAbortReason, "", `${name} stopped early: ${result.earlyAbortReason}\n${output}`);
  if (result.earlySuccessReason) {
    assert.equal(result.earlySuccessReason, "success condition satisfied", `${name} stopped unexpectedly\n${output}`);
    return;
  }
  assertWorkflowSuccess(result, name);
}

function assertRealProviderPhase(root, phase, requiredArtifacts = []) {
  assert.equal(readSpec(root).phase, phase);
  for (const artifact of requiredArtifacts) {
    assert.ok(existsSync(join(root, ".kiro", "specs", featureName, artifact)), `expected ${artifact} for ${phase}`);
  }
}

function latestReportsDirIfAny(root) {
  const runRoot = join(root, ".takt", "runs");
  if (!existsSync(runRoot)) {
    return undefined;
  }
  const latestRun = readdirSync(runRoot)
    .filter((entry) => statSync(join(runRoot, entry)).isDirectory())
    .sort()
    .at(-1);
  return latestRun ? join(runRoot, latestRun, "reports") : undefined;
}

function hasCollectedWaveResults(root) {
  const reportsDir = latestReportsDirIfAny(root);
  if (!reportsDir) {
    return false;
  }
  const waveReportPath = join(reportsDir, "kiro-task-wave-implementation-result.md");
  if (!existsSync(waveReportPath)) {
    return false;
  }
  const waveReport = readFileSync(waveReportPath, "utf8");
  return (
    /STATUS:\s*READY_FOR_REVIEW/.test(waveReport) &&
    /dispatch_mode:\s*wave/.test(waveReport) &&
    /wave[_\s]+result[_\s]+refs/i.test(waveReport) &&
    /Task 1\.1/.test(waveReport) &&
    /Task 1\.2/.test(waveReport) &&
    existsSync(join(root, ".takt", "worktrees", "kiro-impl", featureName, "1.1", "smoke-output", "provider-smoke-alpha.txt")) &&
    existsSync(join(root, ".takt", "worktrees", "kiro-impl", featureName, "1.2", "smoke-output", "provider-smoke-beta.txt"))
  );
}

function hasGeneratedRequirements(root) {
  const requirementsPath = join(root, ".kiro", "specs", featureName, "requirements.md");
  if (!existsSync(requirementsPath)) {
    return false;
  }
  const requirements = readFileSync(requirementsPath, "utf8");
  const spec = readSpec(root);
  return (
    spec.phase === "requirements-generated" &&
    spec.approvals?.requirements?.generated === true &&
    /要件\s+1/.test(requirements) &&
    /しなければならない/.test(requirements) &&
    !requirements.includes("/kiro-spec-requirements フェーズで生成されます")
  );
}

function assertRealProviderWaveSmokeOutcome(root) {
  const reportsDir = latestReportsDir(root);
  const waveReport = readFileSync(join(reportsDir, "kiro-task-wave-implementation-result.md"), "utf8");
  assert.match(waveReport, /STATUS:\s*READY_FOR_REVIEW/);
  assert.match(waveReport, /dispatch_mode:\s*wave/);
  assert.match(waveReport, /wave[_\s]+result[_\s]+refs/i);
  assert.match(waveReport, /Task 1\.1/);
  assert.match(waveReport, /Task 1\.2/);

  const alphaOutput = readFileSync(
    join(root, ".takt", "worktrees", "kiro-impl", featureName, "1.1", "smoke-output", "provider-smoke-alpha.txt"),
    "utf8",
  );
  const betaOutput = readFileSync(
    join(root, ".takt", "worktrees", "kiro-impl", featureName, "1.2", "smoke-output", "provider-smoke-beta.txt"),
    "utf8",
  );
  assert.match(alphaOutput, /real provider smoke passed alpha/i);
  assert.match(betaOutput, /real provider smoke passed beta/i);

  const tasks = readFileSync(join(root, ".kiro", "specs", featureName, "tasks.md"), "utf8");
  assert.match(tasks, /1\.1 \(P\)/);
  assert.match(tasks, /1\.2 \(P\)/);
}

function readSpec(root) {
  return JSON.parse(readFileSync(join(root, ".kiro", "specs", featureName, "spec.json"), "utf8"));
}

function latestReportsDir(root) {
  const runRoot = join(root, ".takt", "runs");
  const latestRun = readdirSync(runRoot)
    .filter((entry) => statSync(join(runRoot, entry)).isDirectory())
    .sort()
    .at(-1);
  assert.ok(latestRun, "expected at least one TAKT run directory");
  return join(runRoot, latestRun, "reports");
}

test("real provider smoke runner stops when workflow output reports a fatal error", async () => {
  const root = mkdtempSync(join(tmpdir(), "kiro-real-provider-fail-fast-"));
  try {
    writeFixtureFile(
      root,
      "package.json",
      `${JSON.stringify(
        {
          scripts: {
            fatal: "node fatal.js",
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFixtureFile(
      root,
      "fatal.js",
      "console.log('[ERROR] Workflow aborted after fatal smoke finding'); setInterval(() => {}, 60000);\n",
    );

    const result = await runWorkflow(root, "fatal", "ignored", { timeoutMs: 60000 });

    assert.match(result.earlyAbortReason, /fatal workflow output matched/);
    assert.match(result.output, /\[ERROR\] Workflow aborted/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("real provider smoke runner cleans up detached fixture processes on fail-fast", async () => {
  const root = mkdtempSync(join(tmpdir(), "kiro-real-provider-orphan-"));
  try {
    writeFixtureFile(
      root,
      "package.json",
      `${JSON.stringify(
        {
          type: "module",
          scripts: {
            orphan: "node orphan-parent.js",
          },
        },
        null,
        2,
      )}\n`,
    );
    writeFixtureFile(
      root,
      "orphan-parent.js",
      `import { spawn } from "node:child_process";
const child = spawn(process.execPath, [${JSON.stringify(join(root, "orphan-child.js"))}], {
  detached: true,
  stdio: "ignore",
});
child.unref();
console.log("[ERROR] Workflow aborted after detached child spawned");
setInterval(() => {}, 60000);
`,
    );
    writeFixtureFile(root, "orphan-child.js", "setInterval(() => {}, 60000);\n");

    const result = await runWorkflow(root, "orphan", "ignored", { timeoutMs: 60000 });

    assert.match(result.earlyAbortReason, /fatal workflow output matched/);
    assert.deepEqual(fixtureProcessIds(root), []);
  } finally {
    terminateFixtureProcesses(root, "SIGKILL");
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "kiro requirements smoke writes requirements artifact with the configured real provider",
  { skip: process.env.KIRO_REAL_PROVIDER_SMOKE === "1" ? false : "set KIRO_REAL_PROVIDER_SMOKE=1 to call the real provider" },
  async () => {
    const root = makeRealProviderFixture();
    let success = false;
    try {
      writeInitializedRequirementsFixture(root);
      commitFixtureState(root, "real provider initialized requirements fixture");

      const requirementsResult = await runWorkflow(root, "kiro:spec:requirements", `feature=${featureName}`, {
        successWhen: ({ root }) => hasGeneratedRequirements(root),
      });
      assertRealProviderEarlySmokeSuccess(requirementsResult, "kiro:spec:requirements");
      assertRealProviderPhase(root, "requirements-generated", ["requirements.md"]);

      const requirements = readFileSync(join(root, ".kiro", "specs", featureName, "requirements.md"), "utf8");
      assert.match(requirements, /要件\s+1/);
      assert.match(requirements, /しなければならない/);
      assert.doesNotMatch(requirements, /\/kiro-spec-requirements フェーズで生成されます/);
      assert.equal(readSpec(root).approvals.requirements.generated, true);
      assert.equal(readSpec(root).ready_for_implementation, false);
      success = true;
    } finally {
      if (success && process.env.KIRO_REAL_PROVIDER_KEEP !== "1") {
        rmSync(root, { recursive: true, force: true });
      } else {
        console.error(`Real provider smoke fixture retained at: ${root}`);
      }
    }
  },
);

test(
  "kiro impl smoke runs with the configured real provider and (P) implementation tasks",
  { skip: process.env.KIRO_REAL_PROVIDER_SMOKE === "1" ? false : "set KIRO_REAL_PROVIDER_SMOKE=1 to call the real provider" },
  async () => {
    const root = makeRealProviderFixture();
    let success = false;
    try {
      writeParallelProviderSmokeImplementationArtifacts(root);
      assertRealProviderPhase(root, "tasks-generated", ["requirements.md", "design.md", "tasks.md"]);
      const tasksSpec = readSpec(root);
      assert.equal(tasksSpec.ready_for_implementation, true);
      assert.match(readFileSync(join(root, ".kiro", "specs", featureName, "tasks.md"), "utf8"), /\(P\)/);
      commitFixtureState(root, "real provider parallel implementation tasks");

      const implResult = await runWorkflow(root, "kiro:impl", `feature=${featureName}`, {
        successWhen: ({ root }) => hasCollectedWaveResults(root),
      });
      assertRealProviderEarlySmokeSuccess(implResult, "kiro:impl");
      const implOutput = stripAnsi(implResult.output);
      assert.match(implOutput, /plan-dispatch/, implOutput);
      assert.match(implOutput, /prepare-task-wave/, implOutput);
      assert.match(implOutput, /execute-task-wave/, implOutput);
      assert.match(implOutput, /collect-wave-results/, implOutput);
      assertRealProviderWaveSmokeOutcome(root);
      success = true;
    } finally {
      if (success && process.env.KIRO_REAL_PROVIDER_KEEP !== "1") {
        rmSync(root, { recursive: true, force: true });
      } else {
        console.error(`Real provider smoke fixture retained at: ${root}`);
      }
    }
  },
);
