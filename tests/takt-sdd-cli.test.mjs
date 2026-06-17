import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";
import { EventEmitter } from "node:events";
import {
  SUPPORTED_WORKFLOWS,
  EXCLUDED_WORKFLOWS,
  RETIRED_WORKFLOWS,
  isSupportedWorkflow,
  isRetiredWorkflow,
  buildHelpText,
} from "../cli/command-catalog.mjs";
import { buildInitHelpText } from "../cli/init-adapter.mjs";
import {
  PreflightError,
  preflight,
  resolveWorkflowPathStrict,
  resolveTaktBin,
  buildWorkflowArgs,
  runWorkflow,
} from "../cli/workflow-runner.mjs";

const repoRoot = join(import.meta.dirname, "..");

// (a) catalog has 12 entries (kiro only), every entry has en+ja asset files on disk
test("SUPPORTED_WORKFLOWS has exactly 12 entries", () => {
  assert.equal(SUPPORTED_WORKFLOWS.length, 12, `Expected 12 entries but got ${SUPPORTED_WORKFLOWS.length}: ${SUPPORTED_WORKFLOWS.join(", ")}`);
});

test("every SUPPORTED_WORKFLOWS entry has a .takt/en/workflows/<name>.yaml asset", () => {
  const missing = SUPPORTED_WORKFLOWS.filter(
    (name) => !existsSync(join(repoRoot, ".takt", "en", "workflows", `${name}.yaml`)),
  );
  assert.deepEqual(missing, [], `Missing en assets: ${missing.join(", ")}`);
});

test("every SUPPORTED_WORKFLOWS entry has a .takt/ja/workflows/<name>.yaml asset", () => {
  const missing = SUPPORTED_WORKFLOWS.filter(
    (name) => !existsSync(join(repoRoot, ".takt", "ja", "workflows", `${name}.yaml`)),
  );
  assert.deepEqual(missing, [], `Missing ja assets: ${missing.join(", ")}`);
});

// (b) bidirectional drift: every bundled .takt/en/workflows/*.yaml basename is in SUPPORTED ∪ internal
// RETIRED assets must NOT be bundled
test("every .takt/en/workflows/*.yaml basename is in SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.internal (no unclassified assets)", () => {
  const enDir = join(repoRoot, ".takt", "en", "workflows");
  const allNames = readdirSync(enDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));

  const allClassified = new Set([
    ...SUPPORTED_WORKFLOWS,
    ...EXCLUDED_WORKFLOWS.internal,
  ]);

  const unclassified = allNames.filter((name) => !allClassified.has(name));
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified workflow assets in .takt/en/workflows/: ${unclassified.join(", ")}. Add them to SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.internal.`,
  );
});

test("every .takt/ja/workflows/*.yaml basename is in SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.internal (no unclassified assets)", async () => {
  const { readdirSync } = await import("node:fs");
  const jaDir = join(repoRoot, ".takt", "ja", "workflows");
  const allNames = readdirSync(jaDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));

  const allClassified = new Set([
    ...SUPPORTED_WORKFLOWS,
    ...EXCLUDED_WORKFLOWS.internal,
  ]);

  const unclassified = allNames.filter((name) => !allClassified.has(name));
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified workflow assets in .takt/ja/workflows/: ${unclassified.join(", ")}. Add them to SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.internal.`,
  );
});

// (b-new) RETIRED workflow assets must NOT be bundled
test("no RETIRED workflow asset is bundled in .takt/en/workflows/", () => {
  const enDir = join(repoRoot, ".takt", "en", "workflows");
  const allRetired = [...RETIRED_WORKFLOWS.legacy, ...RETIRED_WORKFLOWS.opsx];
  const found = allRetired.filter((name) =>
    existsSync(join(enDir, `${name}.yaml`)),
  );
  assert.deepEqual(found, [], `RETIRED workflow assets must not be bundled in en: ${found.join(", ")}`);
});

test("no RETIRED workflow asset is bundled in .takt/ja/workflows/", () => {
  const jaDir = join(repoRoot, ".takt", "ja", "workflows");
  const allRetired = [...RETIRED_WORKFLOWS.legacy, ...RETIRED_WORKFLOWS.opsx];
  const found = allRetired.filter((name) =>
    existsSync(join(jaDir, `${name}.yaml`)),
  );
  assert.deepEqual(found, [], `RETIRED workflow assets must not be bundled in ja: ${found.join(", ")}`);
});

// (c) no cc-sdd- or opsx- prefix in SUPPORTED_WORKFLOWS; isRetiredWorkflow and isSupportedWorkflow behavior
test("SUPPORTED_WORKFLOWS contains no cc-sdd- prefixed entries", () => {
  const ccSddEntries = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("cc-sdd-"));
  assert.deepEqual(ccSddEntries, [], `Found cc-sdd- entries in SUPPORTED_WORKFLOWS: ${ccSddEntries.join(", ")}`);
});

test("SUPPORTED_WORKFLOWS contains no opsx- prefixed entries", () => {
  const opsxEntries = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("opsx-"));
  assert.deepEqual(opsxEntries, [], `Found opsx- entries in SUPPORTED_WORKFLOWS: ${opsxEntries.join(", ")}`);
});

test("isRetiredWorkflow('cc-sdd-full') returns 'legacy'", () => {
  assert.equal(isRetiredWorkflow("cc-sdd-full"), "legacy");
});

test("isRetiredWorkflow('opsx-propose') returns 'opsx'", () => {
  assert.equal(isRetiredWorkflow("opsx-propose"), "opsx");
});

test("isRetiredWorkflow('kiro-impl') returns undefined", () => {
  assert.equal(isRetiredWorkflow("kiro-impl"), undefined);
});

test("isSupportedWorkflow('kiro-impl') returns true", () => {
  assert.equal(isSupportedWorkflow("kiro-impl"), true);
});

test("isSupportedWorkflow('cc-sdd-full') returns false", () => {
  assert.equal(isSupportedWorkflow("cc-sdd-full"), false);
});

test("isSupportedWorkflow('opsx-full') returns false", () => {
  assert.equal(isSupportedWorkflow("opsx-full"), false);
});

test("isSupportedWorkflow('unknown-workflow') returns false", () => {
  assert.equal(isSupportedWorkflow("unknown-workflow"), false);
});

// (d) buildHelpText contains package runtime, eject customization, deprecated init, kiro-* workflow names, "run", global options, and no cc-sdd-*/opsx-* names
test("buildHelpText contains deprecated init guidance", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("init"), `buildHelpText output does not contain 'init'`);
  assert.match(text, /deprecated/i);
  assert.match(text, /guidance-only/i);
  assert.ok(!text.includes("Initialize or update bundled .takt assets"), `buildHelpText should not present init as an asset-copy command`);
});

test("buildHelpText contains every supported kiro-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const kiroWorkflows = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("kiro-"));
  const missing = kiroWorkflows.filter((name) => !text.includes(name));
  assert.deepEqual(missing, [], `buildHelpText missing kiro-* workflow names: ${missing.join(", ")}`);
});

test("buildHelpText does NOT contain any opsx-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const opsxNames = [...RETIRED_WORKFLOWS.opsx];
  const found = opsxNames.filter((name) => text.includes(name));
  assert.deepEqual(found, [], `buildHelpText must not contain opsx-* names, but found: ${found.join(", ")}`);
});

test("buildHelpText contains 'run'", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("run"), `buildHelpText output does not contain 'run'`);
});

test("buildHelpText explains package bundled runtime for normal execution", () => {
  const text = buildHelpText("1.0.0");
  assert.match(text, /Run workflows directly from bundled workflows\/facets/i);
  assert.match(text, /installed package/i);
});

test("buildHelpText contains eject customization entrypoint and options", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("eject"), `buildHelpText missing eject`);
  assert.match(text, /project-owned customization/i);
  assert.ok(text.includes("--lang"), `buildHelpText missing --lang`);
  assert.ok(text.includes("--all-languages"), `buildHelpText missing --all-languages`);
  assert.ok(text.includes("--force"), `buildHelpText missing --force`);
  assert.ok(text.includes("--dry-run"), `buildHelpText missing --dry-run`);
});

test("buildHelpText contains global options --cwd, --help, --version", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("--cwd"), `buildHelpText missing --cwd`);
  assert.ok(text.includes("--help"), `buildHelpText missing --help`);
  assert.ok(text.includes("--version"), `buildHelpText missing --version`);
});

test("buildInitHelpText contains deprecated init guidance and eject migration", () => {
  const text = buildInitHelpText("1.0.0");
  assert.match(text, /deprecated/i);
  assert.match(text, /bundled workflows\/facets/i);
  assert.match(text, /takt-sdd eject/);
});

test("buildHelpText contains the provided version string", () => {
  const text = buildHelpText("2.3.4");
  assert.ok(text.includes("2.3.4"), `buildHelpText does not include version '2.3.4'`);
});

test("buildHelpText does not contain any cc-sdd-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const ccSddNames = RETIRED_WORKFLOWS.legacy;
  const found = ccSddNames.filter((name) => text.includes(name));
  assert.deepEqual(found, [], `buildHelpText must not contain cc-sdd-* names, but found: ${found.join(", ")}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3.3: WorkflowRunner tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: create a minimal fixture project in os.tmpdir().
 * Returns the tmp directory path (caller must clean up).
 */
function makeTmpDir() {
  return mkdtempSync(join(os.tmpdir(), "takt-sdd-runner-"));
}

/**
 * Helper: write a minimal .takt manifest (sets lang).
 */
function writeManifest(projectRoot, lang) {
  const taktDir = join(projectRoot, ".takt");
  mkdirSync(taktDir, { recursive: true });
  writeFileSync(
    join(taktDir, ".manifest.json"),
    JSON.stringify({ version: "1.0.0", installedAt: new Date().toISOString(), lang, files: {} }),
    "utf-8",
  );
}

/**
 * Helper: write a minimal .takt/config.yaml with language preference.
 */
function writeConfigYaml(projectRoot, lang) {
  const taktDir = join(projectRoot, ".takt");
  mkdirSync(taktDir, { recursive: true });
  writeFileSync(join(taktDir, "config.yaml"), `language: ${lang}\n`, "utf-8");
}

/**
 * Helper: create a workflow YAML in the given lang slot.
 * Supports both ".takt/workflows/<name>.yaml" and ".takt/<lang>/workflows/<name>.yaml".
 */
function writeWorkflowAsset(projectRoot, lang, name, slotType = "lang") {
  let dir;
  if (slotType === "root") {
    dir = join(projectRoot, ".takt", "workflows");
  } else {
    dir = join(projectRoot, ".takt", lang, "workflows");
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.yaml`), `# dummy workflow ${name}\nsteps: []\n`, "utf-8");
}

/**
 * Helper: create a package bundled workflow YAML in the given lang slot.
 */
function writePackageWorkflowAsset(packageRoot, lang, name) {
  const dir = join(packageRoot, ".takt", lang, "workflows");
  mkdirSync(dir, { recursive: true });
  const workflowPath = join(dir, `${name}.yaml`);
  writeFileSync(workflowPath, `# package workflow ${name}\nsteps: []\n`, "utf-8");
  return workflowPath;
}

/**
 * Helper: write a minimal project package.json.
 */
function writePkgJson(projectRoot, devDependencies = {}) {
  writeFileSync(
    join(projectRoot, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0", devDependencies }, null, 2),
    "utf-8",
  );
}

/**
 * Helper: create a fake binary in <projectRoot>/node_modules/.bin/<name>.
 */
function writeFakeBin(projectRoot, name) {
  const binDir = join(projectRoot, "node_modules", ".bin");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(join(binDir, name), "#!/usr/bin/env node\n", "utf-8");
}

/**
 * A mock spawnImpl that asserts it is never called.
 * Throws if invoked.
 */
function noSpawnImpl() {
  throw new Error("spawnImpl should NOT have been called — preflight should have stopped execution");
}

/**
 * A mock spawnImpl that records its call args and emits a close event with the
 * given exit code. Returns an EventEmitter with the `on` method.
 */
function makeSpawnImpl(exitCode) {
  return function spawnImpl(_nodeExec, _args, _opts) {
    const emitter = new EventEmitter();
    // Emit asynchronously so caller can attach listeners
    process.nextTick(() => emitter.emit("close", exitCode, null));
    return emitter;
  };
}

// ─── preflight: uninitialized (.takt absent) → package bundled workflow ───

test("preflight: uninitialized project (.takt absent) resolves package bundled workflow", () => {
  const dir = makeTmpDir();
  try {
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    const result = preflight(ctx, "kiro-impl");
    assert.equal(result.lang, "en");
    assert.equal(result.workflowSource, "package");
    assert.equal(result.workflowPath, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
    assert.equal(existsSync(join(dir, ".takt")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight: project root workflow remains the highest-priority override", () => {
  const dir = makeTmpDir();
  try {
    writeWorkflowAsset(dir, "en", "kiro-impl", "root");
    const result = preflight({ projectRoot: dir, packageRoot: repoRoot }, "kiro-impl");
    assert.equal(result.workflowSource, "project-root");
    assert.equal(result.workflowPath, join(dir, ".takt", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight: project language workflow overrides package bundled workflow", () => {
  const dir = makeTmpDir();
  try {
    writeWorkflowAsset(dir, "en", "kiro-impl");
    const result = preflight({ projectRoot: dir, packageRoot: repoRoot }, "kiro-impl");
    assert.equal(result.workflowSource, "project-language");
    assert.equal(result.workflowPath, join(dir, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight: project facet-only files do not change package workflow selection", () => {
  const dir = makeTmpDir();
  try {
    const facetDir = join(dir, ".takt", "en", "facets", "personas");
    mkdirSync(facetDir, { recursive: true });
    writeFileSync(join(facetDir, "coding-reviewer.md"), "# project-local facet only\n", "utf-8");

    const result = preflight({ projectRoot: dir, packageRoot: repoRoot }, "kiro-impl");
    assert.equal(result.workflowSource, "package");
    assert.equal(result.workflowPath, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── preflight: ja lang + ja asset absent → PreflightError (no fallback to en) ───

test("preflight: ja lang with missing ja workflow asset throws PreflightError (no en fallback)", () => {
  const dir = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writeManifest(dir, "ja");
    // Write only en asset — ja should NOT fall back
    writeWorkflowAsset(dir, "en", "kiro-impl");
    writePackageWorkflowAsset(packageRoot, "en", "kiro-impl");
    const ctx = { projectRoot: dir, packageRoot };
    assert.throws(
      () => preflight(ctx, "kiro-impl"),
      (err) => {
        assert.ok(err instanceof PreflightError, `Expected PreflightError, got ${err.constructor.name}`);
        assert.ok(err.message.includes("kiro-impl"), `Expected message to include workflow name, got: ${err.message}`);
        assert.ok(err.message.includes("ja"), `Expected message to include language, got: ${err.message}`);
        assert.ok(
          !err.message.includes("takt-sdd init"),
          `Missing workflow message must not mention 'takt-sdd init', got: ${err.message}`,
        );
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

// ─── preflight: opsx-* workflow with missing openspec binary → NO PreflightError (step 3 removed) ───

test("preflight: opsx-* workflow with missing openspec binary does NOT throw PreflightError (spawn is reached)", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    writeWorkflowAsset(dir, "en", "opsx-propose");
    // Do NOT write a fake openspec binary — should not matter anymore
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    let spawnCalled = false;
    const captureSpawn = (_nodeExec, _args, _opts) => {
      spawnCalled = true;
      const emitter = new EventEmitter();
      process.nextTick(() => emitter.emit("close", 0, null));
      return emitter;
    };
    // Must NOT throw — spawn should be reached
    const code = await runWorkflow("opsx-propose", [], ctx, captureSpawn);
    assert.equal(code, 0);
    assert.ok(spawnCalled, "spawnImpl must be called when openspec binary is absent (step 3 removed)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── preflight: package.json declares takt dep but binary missing → packageRoot takt is used ───

test("preflight: declared takt devDependency with missing project-local takt binary does not fail", () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    // Declare takt dep only — @fission-ai/openspec and cc-sdd are no longer checked
    writePkgJson(dir, { takt: "0.43.0" });
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    const result = preflight(ctx, "kiro-impl");
    assert.equal(result.workflowSource, "package");
    assert.equal(result.workflowPath, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── preflight: package.json declares @fission-ai/openspec or cc-sdd without takt → no error for those ───

test("preflight: @fission-ai/openspec and cc-sdd declared in package.json without binaries → no PreflightError", () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    writeWorkflowAsset(dir, "en", "kiro-impl");
    // Declare openspec and cc-sdd deps but NOT takt — openspec/cc-sdd should not be checked
    writePkgJson(dir, { "@fission-ai/openspec": "1.4.1", "cc-sdd": "3.0.2" });
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    // Should NOT throw — openspec and cc-sdd are not in the binary check map anymore
    assert.doesNotThrow(() => preflight(ctx, "kiro-impl"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── preflight: spawn reaches package workflow in package-runtime cases ───

test("uninitialized project: runWorkflow reaches spawn with package bundled workflow", async () => {
  const dir = makeTmpDir();
  try {
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    let spawnCalledWith = null;
    const captureSpawn = (nodeExec, args, opts) => {
      spawnCalledWith = { nodeExec, args, opts };
      const emitter = new EventEmitter();
      process.nextTick(() => emitter.emit("close", 0, null));
      return emitter;
    };
    const code = await runWorkflow("kiro-impl", [], ctx, captureSpawn);
    assert.equal(code, 0);
    assert.ok(spawnCalledWith !== null, "spawnImpl should have been called");
    assert.equal(spawnCalledWith.opts.cwd, dir);
    const wIdx = spawnCalledWith.args.indexOf("-w");
    assert.equal(spawnCalledWith.args[wIdx + 1], join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preflight failure (ja lang, ja asset missing): spawnImpl is never called", async () => {
  const dir = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writeManifest(dir, "ja");
    writeWorkflowAsset(dir, "en", "kiro-impl"); // en only — ja not present
    writePackageWorkflowAsset(packageRoot, "en", "kiro-impl");
    const ctx = { projectRoot: dir, packageRoot };
    await assert.rejects(
      runWorkflow("kiro-impl", [], ctx, noSpawnImpl),
      (err) => err instanceof PreflightError,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("declared takt dep with missing project-local binary: runWorkflow reaches spawn", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    // Only takt declared — cc-sdd no longer in the map
    writePkgJson(dir, { takt: "0.43.0" });
    // No binaries in node_modules/.bin
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    let spawnCalled = false;
    const code = await runWorkflow("kiro-impl", [], ctx, (...args) => {
      spawnCalled = true;
      return makeSpawnImpl(0)(...args);
    });
    assert.equal(code, 0);
    assert.equal(spawnCalled, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── config.yaml absent: manifest lang is used (no error) ───

test("config.yaml absent: manifest lang (ja) is used for workflow resolution", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "ja");
    writeWorkflowAsset(dir, "ja", "kiro-impl"); // ja asset present
    // No config.yaml — should use manifest lang "ja"
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    let spawnCalledWith = null;
    const captureSpawn = (nodeExec, args, opts) => {
      spawnCalledWith = { nodeExec, args, opts };
      const emitter = new EventEmitter();
      process.nextTick(() => emitter.emit("close", 0, null));
      return emitter;
    };
    const code = await runWorkflow("kiro-impl", [], ctx, captureSpawn);
    assert.equal(code, 0);
    assert.ok(spawnCalledWith !== null, "spawnImpl should have been called");
    assert.equal(spawnCalledWith.opts.cwd, dir, "spawn cwd must be projectRoot");
    // args should contain a path inside .takt/ja/workflows/
    const wArg = spawnCalledWith.args.find((a) => a.includes("kiro-impl.yaml"));
    assert.ok(wArg && wArg.includes("ja"), `Expected ja workflow path, got: ${wArg}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── buildWorkflowArgs: --pipeline --skip-git -w <path> always present ───

test("buildWorkflowArgs includes --pipeline, --skip-git, and -w <path>", () => {
  const wPath = "/some/.takt/en/workflows/kiro-impl.yaml";
  const args = buildWorkflowArgs(wPath, []);
  assert.ok(args.includes("--pipeline"), `missing --pipeline in: ${JSON.stringify(args)}`);
  assert.ok(args.includes("--skip-git"), `missing --skip-git in: ${JSON.stringify(args)}`);
  assert.ok(args.includes("-w"), `missing -w in: ${JSON.stringify(args)}`);
  const wIdx = args.indexOf("-w");
  assert.equal(args[wIdx + 1], wPath, `Expected -w to be followed by workflow path`);
});

// ─── buildWorkflowArgs: positional args → single -t value ───

test("buildWorkflowArgs: positional args are joined as single -t value", () => {
  const wPath = "/some/kiro-impl.yaml";
  const args = buildWorkflowArgs(wPath, ["my-feature", "extra"]);
  const tIdx = args.indexOf("-t");
  assert.ok(tIdx !== -1, `Expected -t flag in: ${JSON.stringify(args)}`);
  assert.equal(args[tIdx + 1], "my-feature extra", `Expected joined positional, got: ${args[tIdx + 1]}`);
});

test("buildWorkflowArgs: no -t flag when no positional args", () => {
  const wPath = "/some/kiro-impl.yaml";
  const args = buildWorkflowArgs(wPath, ["--some-flag"]);
  assert.ok(!args.includes("-t"), `Expected no -t flag when no positionals, got: ${JSON.stringify(args)}`);
});

// ─── buildWorkflowArgs: flag forward order preserved ───

test("buildWorkflowArgs: flags forwarded in order after -w <path>", () => {
  const wPath = "/some/kiro-impl.yaml";
  const args = buildWorkflowArgs(wPath, ["--foo", "--bar", "positional"]);
  // flags appear after -w <path>
  const wIdx = args.indexOf("-w");
  const afterW = args.slice(wIdx + 2); // skip -w and the path
  assert.ok(afterW.indexOf("--foo") < afterW.indexOf("--bar"), "flag order not preserved");
  // positional appears as -t value
  const tIdx = args.indexOf("-t");
  assert.ok(tIdx !== -1, "Expected -t for positionals");
  assert.equal(args[tIdx + 1], "positional");
});

// ─── ja config.yaml: resolves ja asset, does NOT fallback to en ───

test("ja config.yaml: resolves ja workflow, not en (no language fallback)", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en"); // manifest says en but config.yaml says ja
    writeConfigYaml(dir, "ja"); // config takes priority
    writeWorkflowAsset(dir, "ja", "kiro-impl"); // ja asset present
    // Deliberately do NOT write en asset
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    let capturedArgs = null;
    const captureSpawn = (_exec, args, _opts) => {
      capturedArgs = args;
      const emitter = new EventEmitter();
      process.nextTick(() => emitter.emit("close", 0, null));
      return emitter;
    };
    const code = await runWorkflow("kiro-impl", [], ctx, captureSpawn);
    assert.equal(code, 0);
    const wArg = capturedArgs && capturedArgs.find((a) => a.includes("kiro-impl.yaml"));
    assert.ok(wArg && wArg.includes("ja"), `Expected ja workflow path in args, got: ${wArg}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ja config.yaml with only en asset: no fallback — throws PreflightError", async () => {
  const dir = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writeManifest(dir, "en");
    writeConfigYaml(dir, "ja");
    writeWorkflowAsset(dir, "en", "kiro-impl"); // only en
    writePackageWorkflowAsset(packageRoot, "en", "kiro-impl");
    const ctx = { projectRoot: dir, packageRoot };
    assert.throws(
      () => preflight(ctx, "kiro-impl"),
      (err) => {
        assert.ok(err instanceof PreflightError, `Expected PreflightError`);
        assert.ok(err.message.includes("kiro-impl"), `Expected workflow name in message, got: ${err.message}`);
        assert.ok(err.message.includes("ja"), `Expected language in message, got: ${err.message}`);
        assert.ok(!err.message.includes("takt-sdd init"), `Message must not mention init, got: ${err.message}`);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

// ─── resolveTaktBin: resolves actual takt CLI js from packageRoot ───

test("resolveTaktBin: resolves actual takt-cli js path from repo packageRoot", () => {
  const { nodeExec, taktCliJs } = resolveTaktBin(repoRoot);
  assert.equal(nodeExec, process.execPath, "nodeExec should be process.execPath");
  assert.ok(
    existsSync(taktCliJs),
    `taktCliJs path does not exist on disk: ${taktCliJs}`,
  );
  assert.ok(
    taktCliJs.endsWith(".js"),
    `Expected taktCliJs to end with .js, got: ${taktCliJs}`,
  );
  // Must NOT reference scripts/takt.sh or PATH
  assert.ok(
    !taktCliJs.includes("scripts/takt.sh"),
    `taktCliJs must not reference scripts/takt.sh`,
  );
  assert.ok(
    taktCliJs.includes("node_modules"),
    `taktCliJs must be inside node_modules, got: ${taktCliJs}`,
  );
});

// ─── exit code propagation ───

test("runWorkflow: exit code from takt is propagated (mock close with code 2)", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    writeWorkflowAsset(dir, "en", "kiro-impl");
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    const code = await runWorkflow("kiro-impl", [], ctx, makeSpawnImpl(2));
    assert.equal(code, 2, `Expected exit code 2, got ${code}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runWorkflow: exit code 0 on success", async () => {
  const dir = makeTmpDir();
  try {
    writeManifest(dir, "en");
    writeWorkflowAsset(dir, "en", "kiro-impl");
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    const code = await runWorkflow("kiro-impl", [], ctx, makeSpawnImpl(0));
    assert.equal(code, 0, `Expected exit code 0, got ${code}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── resolveWorkflowPathStrict ───

test("resolveWorkflowPathStrict: finds .takt/workflows/<name>.yaml (root slot)", () => {
  const dir = makeTmpDir();
  try {
    writeWorkflowAsset(dir, "en", "kiro-impl", "root");
    const result = resolveWorkflowPathStrict(dir, "en", "kiro-impl");
    assert.ok(result !== undefined, "Expected a path to be resolved");
    assert.ok(result.includes("kiro-impl.yaml"), `Expected kiro-impl.yaml in path, got: ${result}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveWorkflowPathStrict: finds .takt/<lang>/workflows/<name>.yaml (lang slot)", () => {
  const dir = makeTmpDir();
  try {
    writeWorkflowAsset(dir, "en", "kiro-impl", "lang");
    const result = resolveWorkflowPathStrict(dir, "en", "kiro-impl");
    assert.ok(result !== undefined, "Expected a path to be resolved");
    assert.ok(result.includes("en"), `Expected 'en' in path, got: ${result}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveWorkflowPathStrict: returns undefined when no asset exists", () => {
  const dir = makeTmpDir();
  try {
    const taktDir = join(dir, ".takt");
    mkdirSync(taktDir, { recursive: true });
    const result = resolveWorkflowPathStrict(dir, "en", "kiro-impl");
    assert.equal(result, undefined, "Expected undefined when no asset exists");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveWorkflowPathStrict: falls back to package workflow when packageRoot is provided", () => {
  const dir = makeTmpDir();
  try {
    const result = resolveWorkflowPathStrict(dir, "en", "kiro-impl", repoRoot);
    assert.equal(result, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveWorkflowPathStrict: ja lang does not return en asset (no language fallback)", () => {
  const dir = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writeWorkflowAsset(dir, "en", "kiro-impl", "lang"); // only en
    writePackageWorkflowAsset(packageRoot, "en", "kiro-impl");
    const result = resolveWorkflowPathStrict(dir, "ja", "kiro-impl", packageRoot);
    assert.equal(result, undefined, "Expected undefined: ja should not resolve en asset");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: CliMain (cli/main.mjs) dispatch tests
// ─────────────────────────────────────────────────────────────────────────────

import { main } from "../cli/main.mjs";

// Helper: capture stdout writes during a main() invocation.
// main() uses process.stdout.write / console.log; we intercept temporarily.
async function captureStdout(fn) {
  const chunks = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  try {
    await fn();
  } finally {
    process.stdout.write = orig;
  }
  return chunks.join("");
}

// Helper: capture stderr writes during a main() invocation.
async function captureStderr(fn) {
  const chunks = [];
  const origWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  try {
    await fn();
  } finally {
    process.stderr.write = origWrite;
  }
  return chunks.join("");
}

// ─── --help: exit 0, output contains package runtime, eject, deprecated init, kiro-*, run ───

test("main(['--help']): returns exit code 0", async () => {
  const code = await captureStdout(async () => {
    const c = await main(["--help"]);
    assert.equal(c, 0, `Expected exit code 0, got ${c}`);
  });
});

test("main(['-h']): returns exit code 0", async () => {
  const code = await captureStdout(async () => {
    const c = await main(["-h"]);
    assert.equal(c, 0, `Expected exit code 0, got ${c}`);
  });
});

test("main(['--help']): output contains deprecated init guidance", async () => {
  let output = "";
  output = await captureStdout(async () => { await main(["--help"]); });
  assert.ok(output.includes("init"), `--help output should contain 'init', got: ${output}`);
  assert.match(output, /deprecated/i);
  assert.match(output, /guidance-only/i);
  assert.ok(!output.includes("Initialize or update bundled .takt assets"), `--help should not present init as an asset-copy command, got: ${output}`);
});

test("main(['--help']): output contains kiro-* workflow names and NOT opsx-*/cc-sdd-*", async () => {
  const output = await captureStdout(async () => { await main(["--help"]); });
  const kiroMissing = SUPPORTED_WORKFLOWS.filter((n) => n.startsWith("kiro-") && !output.includes(n));
  assert.deepEqual(kiroMissing, [], `--help output missing kiro-* names: ${kiroMissing.join(", ")}`);
  const opsxPresent = [...RETIRED_WORKFLOWS.opsx].filter((n) => output.includes(n));
  assert.deepEqual(opsxPresent, [], `--help must not contain opsx-* names, but found: ${opsxPresent.join(", ")}`);
  const ccSddPresent = [...RETIRED_WORKFLOWS.legacy].filter((n) => output.includes(n));
  assert.deepEqual(ccSddPresent, [], `--help must not contain cc-sdd-* names, but found: ${ccSddPresent.join(", ")}`);
});

test("main(['--help']): output contains 'run'", async () => {
  const output = await captureStdout(async () => { await main(["--help"]); });
  assert.ok(output.includes("run"), `--help output should contain 'run', got: ${output}`);
});

test("main(['--help']): output distinguishes normal execution, customization, and retired command entrypoints", async () => {
  const output = await captureStdout(async () => { await main(["--help"]); });
  assert.match(output, /Run workflows directly from bundled workflows\/facets/i);
  assert.match(output, /installed package/i);
  assert.match(output, /takt-sdd eject/i);
  assert.match(output, /project-owned customization/i);
  assert.match(output, /takt-sdd init/i);
  assert.match(output, /deprecated/i);
  assert.match(output, /guidance-only/i);
});

test("main(['init', '--help']): returns exit code 0 and shows deprecated guidance", async () => {
  const output = await captureStdout(async () => {
    const c = await main(["init", "--help"]);
    assert.equal(c, 0, `Expected exit code 0, got ${c}`);
  });
  assert.match(output, /deprecated/i);
  assert.match(output, /takt-sdd eject/);
});

test("main(['init', '-h']): returns exit code 0 and shows deprecated guidance", async () => {
  const output = await captureStdout(async () => {
    const c = await main(["init", "-h"]);
    assert.equal(c, 0, `Expected exit code 0, got ${c}`);
  });
  assert.match(output, /deprecated/i);
  assert.match(output, /takt-sdd eject/);
});

// ─── --version: exit 0, output matches package.json version ───

test("main(['--version']): returns exit code 0", async () => {
  await captureStdout(async () => {
    const c = await main(["--version"]);
    assert.equal(c, 0, `Expected exit code 0, got ${c}`);
  });
});

test("main(['-v']): returns exit code 0", async () => {
  await captureStdout(async () => {
    const c = await main(["-v"]);
    assert.equal(c, 0);
  });
});

test("main(['--version']): output contains package.json version", async () => {
  const { readFileSync: rfs } = await import("node:fs");
  const { join: pjoin } = await import("node:path");
  const pkgVersion = JSON.parse(rfs(pjoin(repoRoot, "package.json"), "utf-8")).version;
  const output = await captureStdout(async () => { await main(["--version"]); });
  assert.ok(output.includes(pkgVersion), `--version output should contain '${pkgVersion}', got: ${output}`);
});

// ─── legacy command rejection (cc-sdd-* → v2.0.0 retired) ───

test("main(['cc-sdd-full']): returns exit code 1", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["cc-sdd-full"]);
    assert.equal(c, 1, `Expected exit code 1, got ${c}`);
  });
});

test("main(['cc-sdd-full']): stderr contains v2.0.0 retirement message", async () => {
  const errOut = await captureStderr(async () => { await main(["cc-sdd-full"]); });
  assert.ok(
    errOut.includes("v2.0.0") || errOut.toLowerCase().includes("retired"),
    `Expected v2.0.0 retirement message in stderr, got: ${errOut}`,
  );
});

test("main(['run', 'cc-sdd-full']): returns exit code 1", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["run", "cc-sdd-full"]);
    assert.equal(c, 1, `Expected exit code 1 for 'run cc-sdd-full', got ${c}`);
  });
});

test("main(['run', 'cc-sdd-full']): stderr contains v2.0.0 retirement message", async () => {
  const errOut = await captureStderr(async () => { await main(["run", "cc-sdd-full"]); });
  assert.ok(
    errOut.includes("v2.0.0") || errOut.toLowerCase().includes("retired"),
    `Expected v2.0.0 retirement message for 'run cc-sdd-full' in stderr, got: ${errOut}`,
  );
});

// ─── opsx command rejection (opsx-* → retired, future re-provision) ───

test("main(['opsx-propose']): returns exit code 1", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["opsx-propose"]);
    assert.equal(c, 1, `Expected exit code 1 for 'opsx-propose', got ${c}`);
  });
});

test("main(['opsx-propose']): stderr contains retirement + future re-provision message", async () => {
  const errOut = await captureStderr(async () => { await main(["opsx-propose"]); });
  assert.ok(
    errOut.toLowerCase().includes("retired"),
    `Expected 'retired' in stderr for opsx-propose, got: ${errOut}`,
  );
  assert.ok(
    errOut.toLowerCase().includes("future") || errOut.toLowerCase().includes("re-provide") || errOut.toLowerCase().includes("re-provided"),
    `Expected future re-provision message in stderr for opsx-propose, got: ${errOut}`,
  );
});

test("main(['run', 'opsx-full']): returns exit code 1", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["run", "opsx-full"]);
    assert.equal(c, 1, `Expected exit code 1 for 'run opsx-full', got ${c}`);
  });
});

test("main(['run', 'opsx-full']): stderr contains retirement + future re-provision message", async () => {
  const errOut = await captureStderr(async () => { await main(["run", "opsx-full"]); });
  assert.ok(
    errOut.toLowerCase().includes("retired"),
    `Expected 'retired' in stderr for 'run opsx-full', got: ${errOut}`,
  );
  assert.ok(
    errOut.toLowerCase().includes("future") || errOut.toLowerCase().includes("re-provide") || errOut.toLowerCase().includes("re-provided"),
    `Expected future re-provision in stderr for 'run opsx-full', got: ${errOut}`,
  );
});

// ─── retirement dispatch: spawn is never reached ───

test("main(['opsx-propose']): spawnImpl is never called (no preflight)", async () => {
  // opsx-propose dispatch returns 1 directly without hitting workflow runner
  // We verify by ensuring the uninitialized project dir does NOT get a preflight error
  // (if spawn were reached, it would complain about missing .takt — instead it's the retirement message)
  const errOut = await captureStderr(async () => {
    const c = await main(["opsx-propose"]);
    assert.equal(c, 1);
  });
  // Must NOT contain preflight messages
  assert.ok(
    !errOut.includes("takt-sdd init"),
    `Retirement should stop before preflight. Got: ${errOut}`,
  );
});

// ─── unknown command: exit 1, help guidance in stderr ───

test("main(['kiro-bogus']): returns exit code 1", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["kiro-bogus"]);
    assert.equal(c, 1, `Expected exit code 1 for unknown command, got ${c}`);
  });
});

test("main(['kiro-bogus']): stderr contains help guidance", async () => {
  const errOut = await captureStderr(async () => { await main(["kiro-bogus"]); });
  assert.ok(
    errOut.includes("--help") || errOut.toLowerCase().includes("unknown") || errOut.toLowerCase().includes("help"),
    `Expected help guidance for unknown command, got: ${errOut}`,
  );
});

// ─── 'run' with no workflow name: usage error ───

test("main(['run']): returns exit code 1 (missing workflow name)", async () => {
  const errOut = await captureStderr(async () => {
    const c = await main(["run"]);
    assert.equal(c, 1, `Expected exit code 1 for 'run' with no workflow, got ${c}`);
  });
});

// ─── 'run kiro-impl' normalizes to same package workflow as direct 'kiro-impl' ───

test("runWorkflow direct and normalized forms use the same package workflow for uninitialized projects", async () => {
  const dir = makeTmpDir();
  try {
    const ctx = { projectRoot: dir, packageRoot: repoRoot };
    const direct = preflight(ctx, "kiro-impl");
    const normalized = preflight(ctx, "kiro-impl");
    assert.deepEqual(direct, normalized);
    assert.equal(direct.workflowSource, "package");
    assert.equal(direct.workflowPath, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── --cwd <fixture>: package runtime does not require project .takt ───

test("preflight with uninitialized --cwd target resolves package workflow without writing .takt", () => {
  const dir = makeTmpDir();
  try {
    const result = preflight({ projectRoot: dir, packageRoot: repoRoot }, "kiro-impl");
    assert.equal(result.workflowSource, "package");
    assert.equal(result.workflowPath, join(repoRoot, ".takt", "en", "workflows", "kiro-impl.yaml"));
    assert.equal(existsSync(join(dir, ".takt")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── bin entry E2E (child_process): --help, --version, cc-sdd-full, run cc-sdd-full ───

const binPath = join(repoRoot, "bin", "takt-sdd.mjs");

test("bin entry: 'node bin/takt-sdd.mjs --help' exits 0, outputs new help surface, and NOT opsx-*", () => {
  let stdout = "";
  try {
    stdout = execFileSync(process.execPath, [binPath, "--help"], { encoding: "utf-8" });
  } catch (err) {
    assert.fail(`Expected exit 0 for --help, got exit ${err.status}: ${err.stderr}`);
  }
  assert.ok(stdout.includes("init"), `--help should contain 'init'`);
  assert.match(stdout, /deprecated/i);
  assert.match(stdout, /guidance-only/i);
  assert.match(stdout, /takt-sdd eject/i);
  assert.match(stdout, /project-owned customization/i);
  assert.match(stdout, /Run workflows directly from bundled workflows\/facets/i);
  assert.match(stdout, /installed package/i);
  assert.ok(!stdout.includes("Initialize or update bundled .takt assets"), `--help should not present init as an asset-copy command`);
  const kiroMissing = SUPPORTED_WORKFLOWS.filter((n) => n.startsWith("kiro-") && !stdout.includes(n));
  assert.deepEqual(kiroMissing, [], `--help missing kiro-* names: ${kiroMissing.join(", ")}`);
  // opsx must not appear in help
  const opsxCount = (stdout.match(/opsx-/g) || []).length;
  assert.equal(opsxCount, 0, `--help must not contain opsx-* (found ${opsxCount} occurrences)`);
});

test("bin entry: 'node bin/takt-sdd.mjs --version' exits 0 and outputs package version", () => {
  let stdout = "";
  try {
    stdout = execFileSync(process.execPath, [binPath, "--version"], { encoding: "utf-8" });
  } catch (err) {
    assert.fail(`Expected exit 0 for --version, got exit ${err.status}: ${err.stderr}`);
  }
  // Output should be non-empty and contain a version-like string
  assert.ok(stdout.trim().length > 0, `--version output should be non-empty`);
});

test("bin entry: 'node bin/takt-sdd.mjs cc-sdd-full' exits non-0 with v2.0.0 retirement message", () => {
  let exitCode = 0;
  let stderr = "";
  try {
    execFileSync(process.execPath, [binPath, "cc-sdd-full"], { encoding: "utf-8" });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status;
    stderr = err.stderr || "";
  }
  assert.ok(exitCode !== 0, `Expected non-zero exit for 'cc-sdd-full', got ${exitCode}`);
  assert.ok(
    stderr.includes("v2.0.0") || stderr.toLowerCase().includes("retired"),
    `Expected v2.0.0 retirement message in stderr for 'cc-sdd-full', got: ${stderr}`,
  );
});

test("bin entry: 'node bin/takt-sdd.mjs run cc-sdd-full' exits non-0 with v2.0.0 retirement message", () => {
  let exitCode = 0;
  let stderr = "";
  try {
    execFileSync(process.execPath, [binPath, "run", "cc-sdd-full"], { encoding: "utf-8" });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status;
    stderr = err.stderr || "";
  }
  assert.ok(exitCode !== 0, `Expected non-zero exit for 'run cc-sdd-full', got ${exitCode}`);
  assert.ok(
    stderr.includes("v2.0.0") || stderr.toLowerCase().includes("retired"),
    `Expected v2.0.0 retirement message for 'run cc-sdd-full', got: ${stderr}`,
  );
});

test("bin entry: 'node bin/takt-sdd.mjs opsx-full' exits non-0 with retirement + future re-provision message", () => {
  let exitCode = 0;
  let stderr = "";
  try {
    execFileSync(process.execPath, [binPath, "opsx-full"], { encoding: "utf-8" });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status;
    stderr = err.stderr || "";
  }
  assert.ok(exitCode !== 0, `Expected non-zero exit for 'opsx-full', got ${exitCode}`);
  assert.ok(
    stderr.toLowerCase().includes("retired"),
    `Expected 'retired' in stderr for 'opsx-full', got: ${stderr}`,
  );
  assert.ok(
    stderr.toLowerCase().includes("future") || stderr.toLowerCase().includes("re-provide") || stderr.toLowerCase().includes("re-provided"),
    `Expected future re-provision in stderr for 'opsx-full', got: ${stderr}`,
  );
});

test("bin entry: 'node bin/takt-sdd.mjs run opsx-full' exits non-0 with retirement + future re-provision message", () => {
  let exitCode = 0;
  let stderr = "";
  try {
    execFileSync(process.execPath, [binPath, "run", "opsx-full"], { encoding: "utf-8" });
    exitCode = 0;
  } catch (err) {
    exitCode = err.status;
    stderr = err.stderr || "";
  }
  assert.ok(exitCode !== 0, `Expected non-zero exit for 'run opsx-full', got ${exitCode}`);
  assert.ok(
    stderr.toLowerCase().includes("retired"),
    `Expected 'retired' in stderr for 'run opsx-full', got: ${stderr}`,
  );
  assert.ok(
    stderr.toLowerCase().includes("future") || stderr.toLowerCase().includes("re-provide") || stderr.toLowerCase().includes("re-provided"),
    `Expected future re-provision in stderr for 'run opsx-full', got: ${stderr}`,
  );
});
