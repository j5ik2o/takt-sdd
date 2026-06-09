import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";

// Real-provider smoke intentionally uses semantic assertions instead of exact
// generated text because Claude output can vary. Mock-provider smoke tests
// should stay strict and deterministic.
const featureName = "kiro-real-provider-smoke";
const defaultModel = "claude-opus-4-8";
const defaultWorkflowTimeoutMs = 900000;
const defaultImplWorkflowTimeoutMs = 1800000;
const fatalWorkflowPatterns = [
  /\[ERROR\]/,
  /Workflow aborted/i,
  /Result:\s*Failed/i,
  /^Status:.*\b(?:ABORT|BLOCKED|NEEDS_FIX|NO-GO)\b/im,
];

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function makeRealProviderFixture() {
  const root = mkdtempSync(join(tmpdir(), "kiro-real-provider-smoke-"));
  const repoRoot = join(import.meta.dirname, "..");

  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  rmSync(join(root, ".takt", "runs"), { recursive: true, force: true });
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
  writeFixtureFile(
    root,
    ".takt/config.yaml",
    `provider: claude
language: ja
model: ${process.env.KIRO_REAL_PROVIDER_MODEL ?? defaultModel}
concurrency: 1
base_branch: main
submodules: all
`,
  );
  writeFixtureFile(root, ".kiro/steering/product.md", "# Product\n\nReal-provider smoke fixture for TAKT/Kiro workflow validation.\n");
  writeFixtureFile(root, ".kiro/steering/tech.md", "# Tech\n\nUse only local files in this temporary fixture.\n");
  writeFixtureFile(root, ".kiro/steering/structure.md", "# Structure\n\nSmoke artifacts may be written under `smoke-output/` only.\n");
  writeFixtureFile(root, ".kiro/steering/roadmap.md", "# Roadmap\n\n## Specs (dependency order)\n");
  writeFixtureFile(
    root,
    `.kiro/specs/${featureName}/brief.md`,
    `# Brief

Create a minimal Kiro full-chain smoke spec using the real Claude provider.

The implementation must be tiny and deterministic:

- Own only \`smoke-output/provider-smoke.txt\`.
- The final implementation task should create or update that file with a short line containing \`claude provider smoke passed\`.
- Do not change production files, package metadata, workflows, facets, scripts, or settings.
- Keep requirements, design, and tasks minimal but valid.
`,
  );
  return root;
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
  const timeoutMs = options.timeoutMs ?? workflowTimeoutMs(scriptName);
  const patterns = options.fatalPatterns ?? fatalWorkflowPatterns;

  return new Promise((resolve) => {
    const child = spawn("npm", ["run", scriptName, "--", target], {
      cwd: root,
      env,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let earlyAbortReason = "";
    let killTimer;

    const abort = (reason) => {
      if (earlyAbortReason) {
        return;
      }
      earlyAbortReason = reason;
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
      if (earlyAbortReason) {
        terminateFixtureProcesses(root, "SIGKILL");
      }
      resolve({
        status,
        signal,
        earlyAbortReason,
        output,
      });
    });
  });
}

function assertWorkflowSuccess(result, name) {
  assert.equal(result.earlyAbortReason, "", `${name} stopped early: ${result.earlyAbortReason}\n${result.output}`);
  assert.equal(result.signal, null, `${name} was terminated by ${result.signal}\n${result.output}`);
  assert.equal(result.status, 0, `${name} failed\n${result.output}`);
  assert.match(result.output, /Result: Success/, `${name} did not report success\n${result.output}`);
}

function assertRealProviderWorkflowSuccess(result, name) {
  assertWorkflowSuccess(result, name);
}

function assertRealProviderPhase(root, phase, requiredArtifacts = []) {
  assert.equal(readSpec(root).phase, phase);
  for (const artifact of requiredArtifacts) {
    assert.ok(existsSync(join(root, ".kiro", "specs", featureName, artifact)), `expected ${artifact} for ${phase}`);
  }
}

function hasGoDecision(report) {
  return /(?:^|\n)\s*(?:-\s*)?`?DECISION`?\s*(?::|=)\s*`?GO`?\b/im.test(report);
}

function assertRealProviderSmokeOutcome(root) {
  const reportsDir = latestReportsDir(root);
  const finalReport = readFileSync(join(reportsDir, "kiro-final-implementation-validation.md"), "utf8");
  assert.equal(hasGoDecision(finalReport), true, `expected final validation to report GO\n${finalReport}`);

  const smokeOutput = readFileSync(join(root, "smoke-output", "provider-smoke.txt"), "utf8");
  assert.match(smokeOutput, /claude provider smoke passed/i);
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
const child = spawn(process.execPath, ["${join(root, "orphan-child.js")}"], {
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
  "kiro full lifecycle smoke runs with the real Claude provider",
  { skip: process.env.KIRO_REAL_PROVIDER_SMOKE === "1" ? false : "set KIRO_REAL_PROVIDER_SMOKE=1 to call the real Claude provider" },
  async () => {
    const root = makeRealProviderFixture();
    let success = false;
    try {
      assertRealProviderWorkflowSuccess(await runWorkflow(root, "kiro:spec:init", featureName), "kiro:spec:init");
      assertRealProviderPhase(root, "initialized", ["requirements.md", "spec.json"]);

      assertRealProviderWorkflowSuccess(await runWorkflow(root, "kiro:spec:requirements", `feature=${featureName} -y`), "kiro:spec:requirements");
      assertRealProviderPhase(root, "requirements-generated", ["requirements.md"]);

      assertRealProviderWorkflowSuccess(await runWorkflow(root, "kiro:spec:design", `feature=${featureName} -y`), "kiro:spec:design");
      assertRealProviderPhase(root, "design-generated", ["requirements.md", "design.md"]);

      assertRealProviderWorkflowSuccess(await runWorkflow(root, "kiro:spec:tasks", `feature=${featureName} -y`), "kiro:spec:tasks");
      assertRealProviderPhase(root, "tasks-generated", ["requirements.md", "design.md", "tasks.md"]);
      const tasksSpec = readSpec(root);
      assert.equal(tasksSpec.ready_for_implementation, true);

      assertRealProviderWorkflowSuccess(await runWorkflow(root, "kiro:impl", `feature=${featureName}`), "kiro:impl");
      assertRealProviderSmokeOutcome(root);
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
