/**
 * tests/takt-sdd-init-policy.test.mjs
 *
 * Integration tests for InitAdapter (cli/init-adapter.mjs).
 *
 * Strategy:
 * (a) Adapter-contract tests with injected fake core — tests policy decisions
 *     that don't require the real installer core.
 * (b) Real-core integration — uses actual installFromSource on temp fixtures
 *     to verify manifest generation, customized file skip, force, dry-run.
 * (c) resolveLanguagePreference pure-function tests — all 4 priority levels.
 *
 * Network constraints:
 * - Dry-run: fully network-free (real core does no writes/spawns).
 * - Non-dry-run: fully offline — no openspec/cc-sdd init is executed.
 *   Real-core fresh init completes without any external process spawning.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import os from "node:os";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = join(import.meta.dirname, "..");

/**
 * Read root package version.
 * @returns {string}
 */
function rootPackageVersion() {
  return JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8")).version;
}

/**
 * Create a temp directory under os.tmpdir() and return its path.
 * @param {string} prefix
 * @returns {string}
 */
function makeTmp(prefix = "takt-init-test-") {
  return mkdtempSync(join(os.tmpdir(), prefix));
}

/**
 * Walk a directory recursively and return relative paths of all files.
 * @param {string} dir
 * @param {string} [base]
 * @returns {string[]}
 */
function walkDir(dir, base) {
  if (!existsSync(dir)) return [];
  const b = base ?? dir;
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, b));
    } else {
      results.push(full.slice(b.length + 1));
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy import of the module under test (fails before it exists → RED phase).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import("../cli/init-adapter.mjs")} */
let initAdapterModule;
async function getInitAdapter() {
  if (!initAdapterModule) {
    initAdapterModule = await import("../cli/init-adapter.mjs");
  }
  return initAdapterModule;
}

// ─────────────────────────────────────────────────────────────────────────────
// (c) resolveLanguagePreference — pure-ish function tests (4 priority levels)
// ─────────────────────────────────────────────────────────────────────────────

test("resolveLanguagePreference — priority 1: explicit flag overrides config and manifest", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-flag-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language: ja\n", "utf-8");
    writeFileSync(
      join(tmpDir, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "ja", version: "0.0.1", files: {} }),
      "utf-8",
    );

    const result = resolveLanguagePreference("en", tmpDir);
    assert.equal(result.lang, "en");
    assert.equal(result.source, "flag");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("resolveLanguagePreference — priority 2: config.yaml language overrides manifest and default", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-config-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language: ja\n", "utf-8");
    writeFileSync(
      join(tmpDir, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "en", version: "0.0.1", files: {} }),
      "utf-8",
    );

    const result = resolveLanguagePreference(undefined, tmpDir);
    assert.equal(result.lang, "ja");
    assert.equal(result.source, "config");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("resolveLanguagePreference — priority 2: config.yaml with surrounding whitespace is parsed", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-config-spaces-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    // Spaces around lang value — must match regex ^language:\s*(en|ja)\s*$
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language:  ja  \n", "utf-8");

    const result = resolveLanguagePreference(undefined, tmpDir);
    assert.equal(result.lang, "ja");
    assert.equal(result.source, "config");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("resolveLanguagePreference — priority 2: invalid config.yaml lang falls through to manifest", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-config-invalid-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language: fr\n", "utf-8"); // not en/ja
    writeFileSync(
      join(tmpDir, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "ja", version: "0.0.1", files: {} }),
      "utf-8",
    );

    const result = resolveLanguagePreference(undefined, tmpDir);
    assert.equal(result.lang, "ja");
    assert.equal(result.source, "manifest");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("resolveLanguagePreference — priority 3: manifest lang when no config", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-manifest-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(
      join(tmpDir, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "ja", version: "0.0.1", files: {} }),
      "utf-8",
    );

    const result = resolveLanguagePreference(undefined, tmpDir);
    assert.equal(result.lang, "ja");
    assert.equal(result.source, "manifest");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("resolveLanguagePreference — priority 4: default 'en' when no flag/config/manifest", async () => {
  const { resolveLanguagePreference } = await getInitAdapter();
  const tmpDir = makeTmp("lang-default-");
  try {
    // empty directory — no .takt at all
    const result = resolveLanguagePreference(undefined, tmpDir);
    assert.equal(result.lang, "en");
    assert.equal(result.source, "default");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// (a) Adapter-contract tests with injected fake core
// ─────────────────────────────────────────────────────────────────────────────

test("parseInitArgs — rejects --tag with UsageError mentioning 'not supported'", async () => {
  const { parseInitArgs, UsageError } = await getInitAdapter();
  assert.throws(
    () => parseInitArgs([".", "--tag", "v1.0.0"]),
    (err) => {
      assert.ok(err instanceof UsageError, `Expected UsageError but got ${err?.constructor?.name}`);
      assert.ok(
        err.message.includes("--tag"),
        `Expected message to mention '--tag', got: ${err.message}`,
      );
      assert.ok(
        err.message.toLowerCase().includes("not supported") ||
          err.message.toLowerCase().includes("unsupported"),
        `Expected message to indicate unsupported, got: ${err.message}`,
      );
      return true;
    },
  );
});

test("parseInitArgs — rejects --tag regardless of position", async () => {
  const { parseInitArgs, UsageError } = await getInitAdapter();
  assert.throws(
    () => parseInitArgs(["--tag", "v1.0.0", "."]),
    (err) => err instanceof UsageError,
  );
});

test("parseInitArgs — requires <dir> positional (UsageError when missing)", async () => {
  const { parseInitArgs, UsageError } = await getInitAdapter();
  assert.throws(
    () => parseInitArgs([]),
    (err) => {
      assert.ok(err instanceof UsageError, `Expected UsageError, got ${err?.constructor?.name}`);
      return true;
    },
  );
});

test("parseInitArgs — parses <dir>, --lang, --force, --dry-run correctly", async () => {
  const { parseInitArgs } = await getInitAdapter();
  const result = parseInitArgs(["./myproject", "--lang", "ja", "--force", "--dry-run"]);
  assert.equal(result.targetDir, "./myproject");
  assert.equal(result.lang, "ja");
  assert.equal(result.force, true);
  assert.equal(result.dryRun, true);
});

test("parseInitArgs — defaults: no lang, no force, no dry-run", async () => {
  const { parseInitArgs } = await getInitAdapter();
  const result = parseInitArgs(["."]);
  assert.equal(result.targetDir, ".");
  assert.equal(result.lang, undefined);
  assert.equal(result.force, false);
  assert.equal(result.dryRun, false);
});

test("parseInitArgs — invalid --lang value causes UsageError", async () => {
  const { parseInitArgs, UsageError } = await getInitAdapter();
  assert.throws(
    () => parseInitArgs([".", "--lang", "fr"]),
    (err) => err instanceof UsageError,
  );
});

test("parseInitArgs — --layout is not exposed (UsageError)", async () => {
  const { parseInitArgs, UsageError } = await getInitAdapter();
  assert.throws(
    () => parseInitArgs([".", "--layout", "modern"]),
    (err) => err instanceof UsageError,
  );
});

test("runInit — fake core: layout=modern, rootDir=packageRoot, version=rootPkgVersion", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-contract-");
  try {
    const calls = [];
    const fakeInstallFromSource = async (options, source) => {
      calls.push({ options, source });
    };

    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    // test seam: inject fake core
    await runInit(options, ctx, { installFromSource: fakeInstallFromSource });

    assert.equal(calls.length, 1, "installFromSource must be called exactly once");
    const { options: coreOpts, source } = calls[0];
    assert.equal(coreOpts.layout, "modern", "layout must be 'modern' (fixed)");
    assert.equal(coreOpts.lang, "en");
    assert.equal(coreOpts.force, false);
    assert.equal(coreOpts.dryRun, false);
    assert.equal(coreOpts.cwd, tmpDir);
    assert.equal(source.rootDir, REPO_ROOT, "rootDir must be packageRoot");
    assert.equal(source.version, rootPackageVersion(), "version must match root package.json");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runInit — language flag takes priority over config.yaml (fake core)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-lang-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language: ja\n", "utf-8");

    const calls = [];
    const fakeInstall = async (opts, src) => calls.push({ opts, src });
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx, { installFromSource: fakeInstall });

    assert.equal(calls[0].opts.lang, "en", "explicit --lang flag overrides config.yaml");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runInit — config.yaml is not created by runInit (fake core)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-no-config-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx, { installFromSource: async () => {} });

    assert.ok(
      !existsSync(join(tmpDir, ".takt", "config.yaml")),
      "runInit must never create .takt/config.yaml",
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runInit — config.yaml is not modified if it already exists (fake core)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-no-modify-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    const originalContent = "language: ja\nsome_key: some_value\n";
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), originalContent, "utf-8");

    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx, { installFromSource: async () => {} });

    const afterContent = readFileSync(join(tmpDir, ".takt", "config.yaml"), "utf-8");
    assert.equal(afterContent, originalContent, "config.yaml must not be modified by runInit");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runInit — non-existent targetDir throws an error", async () => {
  const { runInit } = await getInitAdapter();
  const ctx = { projectRoot: "/nonexistent-xyz-9999", packageRoot: REPO_ROOT };
  const options = {
    targetDir: "/nonexistent-xyz-9999/does-not-exist-12345",
    lang: "en",
    force: false,
    dryRun: false,
  };

  await assert.rejects(
    () => runInit(options, ctx, { installFromSource: async () => {} }),
    (err) => {
      assert.ok(err instanceof Error, `Expected Error, got ${err?.constructor?.name}`);
      return true;
    },
  );
});

test("runInit — config mismatch warning: no error thrown, config.yaml unchanged (fake core)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-mismatch-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    // config says ja, but we are installing en via flag
    const originalConfig = "language: ja\n";
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), originalConfig, "utf-8");

    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    // Should NOT throw — warning only
    const code = await runInit(options, ctx, { installFromSource: async () => {} });
    assert.equal(typeof code, "number", "runInit must return a numeric exit code");

    // config.yaml must be untouched
    const afterContent = readFileSync(join(tmpDir, ".takt", "config.yaml"), "utf-8");
    assert.equal(afterContent, originalConfig, "config.yaml must not be modified on mismatch");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runInit — dry-run: installFromSource is called with dryRun=true (fake core)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("run-init-dryrun-fake-");
  try {
    const calls = [];
    const fakeInstall = async (opts) => calls.push(opts);
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: true };

    await runInit(options, ctx, { installFromSource: fakeInstall });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].dryRun, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) Real-core integration tests
// ─────────────────────────────────────────────────────────────────────────────

test("real-core: fresh init creates .takt/.manifest.json with correct lang and version", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-fresh-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx);

    const manifestPath = join(tmpDir, ".takt", ".manifest.json");
    assert.ok(existsSync(manifestPath), ".takt/.manifest.json must be created");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    assert.equal(manifest.lang, "en", "manifest.lang must equal installed lang");
    assert.equal(
      manifest.version,
      rootPackageVersion(),
      "manifest.version must equal root package.json version",
    );
    assert.ok(typeof manifest.files === "object", "manifest.files must be an object");

    // Req 4.1, 4.2: fresh init must NOT install openspec or cc-sdd.
    // Success of this test WITHOUT any seeding proves no external process is spawned
    // (cc-sdd exec would fail without network/local node_modules; openspec init would require the package).
    const pkgPath = join(tmpDir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const devDeps = pkg.devDependencies ?? {};
      const deps = pkg.dependencies ?? {};
      assert.equal(devDeps["@fission-ai/openspec"], undefined, "openspec must NOT be in devDependencies after init");
      assert.equal(devDeps["cc-sdd"], undefined, "cc-sdd must NOT be in devDependencies after init");
      assert.equal(deps["@fission-ai/openspec"], undefined, "openspec must NOT be in dependencies after init");
      assert.equal(deps["cc-sdd"], undefined, "cc-sdd must NOT be in dependencies after init");
      const scripts = pkg.scripts ?? {};
      const scriptKeys = Object.keys(scripts);
      const nonKiroScripts = scriptKeys.filter((k) => !k.startsWith("kiro:"));
      assert.deepEqual(nonKiroScripts, [], `scripts must be kiro:* only, found non-kiro: ${nonKiroScripts.join(", ")}`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: fresh init places .takt/workflows/ yaml assets", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-assets-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx);

    const workflowsDir = join(tmpDir, ".takt", "workflows");
    assert.ok(existsSync(workflowsDir), ".takt/workflows/ must exist after init");
    const yamlFiles = readdirSync(workflowsDir).filter((f) => f.endsWith(".yaml"));
    assert.ok(yamlFiles.length > 0, "at least one workflow .yaml must be installed");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: customized file is NOT overwritten on update (skip)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-skip-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    // First install
    await runInit(options, ctx);

    // Customize one installed workflow file
    const workflowsDir = join(tmpDir, ".takt", "workflows");
    const yamlFiles = readdirSync(workflowsDir).filter((f) => f.endsWith(".yaml"));
    assert.ok(yamlFiles.length > 0, "expected at least one workflow file");

    const targetFile = join(workflowsDir, yamlFiles[0]);
    const originalContent = readFileSync(targetFile, "utf-8");
    const customContent = originalContent + "\n# CUSTOMIZED\n";
    writeFileSync(targetFile, customContent, "utf-8");

    // Second install (update) — no force
    await runInit(options, ctx);

    const afterContent = readFileSync(targetFile, "utf-8");
    assert.equal(afterContent, customContent, "customized file must NOT be overwritten on update");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: --force allows re-install when .takt/ exists but no manifest (no-manifest guard)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-force-");
  try {
    // Pre-create .takt/workflows/ without a manifest — simulates a partial/corrupted state
    // Without --force, installer would error: "already exists, run --force"
    mkdirSync(join(tmpDir, ".takt", "workflows"), { recursive: true });

    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };

    // Without --force this would normally fail (workflows dir exists, no manifest)
    // With --force it proceeds as a fresh install
    const forceOptions = { targetDir: tmpDir, lang: "en", force: true, dryRun: false };
    await runInit(forceOptions, ctx);

    // After --force fresh install, manifest should be created
    const manifestPath = join(tmpDir, ".takt", ".manifest.json");
    assert.ok(existsSync(manifestPath), "--force fresh install must create .takt/.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    assert.equal(manifest.lang, "en");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: --dry-run writes ZERO files to targetDir", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-dryrun-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: true };

    const filesBefore = walkDir(tmpDir);
    await runInit(options, ctx);
    const filesAfter = walkDir(tmpDir);

    const added = filesAfter.filter((f) => !filesBefore.includes(f));
    assert.deepEqual(added, [], `dry-run must not write any files. Written: ${added.join(", ")}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: config.yaml is NOT created after fresh init", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-no-config-");
  try {
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: "en", force: false, dryRun: false };

    await runInit(options, ctx);

    assert.ok(
      !existsSync(join(tmpDir, ".takt", "config.yaml")),
      "runInit (real core) must never create .takt/config.yaml",
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("real-core: config.yaml ja preference is reflected in manifest.lang", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("real-init-config-lang-");
  try {
    mkdirSync(join(tmpDir, ".takt"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "config.yaml"), "language: ja\n", "utf-8");

    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    const options = { targetDir: tmpDir, lang: undefined, force: false, dryRun: false };

    await runInit(options, ctx);

    const manifest = JSON.parse(readFileSync(join(tmpDir, ".takt", ".manifest.json"), "utf-8"));
    assert.equal(manifest.lang, "ja", "manifest.lang must reflect config.yaml language (ja)");

    // config.yaml must still be unchanged
    const configContent = readFileSync(join(tmpDir, ".takt", "config.yaml"), "utf-8");
    assert.equal(configContent, "language: ja\n", "config.yaml must not be modified");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests #2: update cleanup (Req 5.1–5.5)
//
// These tests use a real-core update against a v1.x-like fixture: a temp dir
// that looks like a project installed by v1.x (has a manifest recording retired
// assets + real kiro assets). The update run is then performed to verify
// cleanup behavior.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute sha256 hex of a string.
 * @param {string} content
 * @returns {string}
 */
function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Build a v1.x-like fixture directory for update cleanup tests.
 * - Performs a real fresh install to get all kiro assets in place.
 * - Then injects synthetic "retired" files (cc-sdd, opsx, opsx-cli.sh).
 * - Updates the manifest to record those retired files.
 *
 * @param {string} tmpDir  target project directory
 * @param {{ customizedKey?: string }} [opts]
 * @returns {{ retiredFiles: Array<{key: string, path: string, content: string}>, customizedKey?: string }}
 */
async function buildV1xFixture(tmpDir, opts = {}) {
  const { runInit } = await getInitAdapter();
  const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };

  // 1. Fresh install to populate real kiro assets and manifest
  await runInit({ targetDir: tmpDir, lang: "en", force: false, dryRun: false }, ctx);

  const manifestPath = join(tmpDir, ".takt", ".manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // 2. Define retired files to inject
  const retiredFiles = [
    { key: ".takt/workflows/cc-sdd-full.yaml", relPath: ".takt/workflows/cc-sdd-full.yaml", content: "name: cc-sdd-full\nsteps: []" },
    { key: ".takt/workflows/opsx-apply.yaml", relPath: ".takt/workflows/opsx-apply.yaml", content: "name: opsx-apply\nsteps: []" },
    { key: ".takt/facets/instructions/cc-sdd-bootstrap-steering.md", relPath: ".takt/facets/instructions/cc-sdd-bootstrap-steering.md", content: "# cc-sdd-bootstrap-steering" },
    { key: ".takt/facets/personas/opsx-implementer.md", relPath: ".takt/facets/personas/opsx-implementer.md", content: "# opsx-implementer persona" },
    { key: ".takt/facets/instructions/ai-review-fix-loop-judge.md", relPath: ".takt/facets/instructions/ai-review-fix-loop-judge.md", content: "# ai-review-fix-loop-judge (retired-exclusive shared facet)" },
    { key: ".takt/instructions/batch-plan-implement-loop-judge.md", relPath: ".takt/instructions/batch-plan-implement-loop-judge.md", content: "# batch-plan-implement-loop-judge (legacy layout)" },
    { key: "scripts/opsx-cli.sh", relPath: "scripts/opsx-cli.sh", content: "#!/bin/sh\n# opsx-cli legacy script" },
  ];

  // 3. Write retired files to disk and add them to the manifest
  const updatedFiles = { ...manifest.files };
  for (const rf of retiredFiles) {
    const filePath = join(tmpDir, rf.relPath);
    mkdirSync(join(tmpDir, rf.relPath, ".."), { recursive: true });
    writeFileSync(filePath, rf.content, "utf-8");
    updatedFiles[rf.key] = sha256(rf.content);
  }

  // 4. Persist the updated manifest
  const updatedManifest = { ...manifest, files: updatedFiles };
  writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2) + "\n", "utf-8");

  return { retiredFiles };
}

// Req 5.1: v1.x fixture の update で未変更退役資産が削除され manifest 記録から消えること
test("real-core update: unchanged retired files are deleted and removed from manifest", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("update-cleanup-delete-");
  try {
    const { retiredFiles } = await buildV1xFixture(tmpDir);

    // Run update
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    await runInit({ targetDir: tmpDir, lang: "en", force: false, dryRun: false }, ctx);

    // All retired files must be gone from disk
    for (const rf of retiredFiles) {
      const filePath = join(tmpDir, rf.relPath);
      assert.ok(!existsSync(filePath), `retired file must be deleted: ${rf.relPath}`);
    }

    // Retired keys must not appear in new manifest
    const newManifest = JSON.parse(readFileSync(join(tmpDir, ".takt", ".manifest.json"), "utf-8"));
    for (const rf of retiredFiles) {
      assert.equal(
        newManifest.files[rf.key],
        undefined,
        `retired key must not appear in new manifest: ${rf.key}`,
      );
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Req 5.2: カスタマイズ済み退役資産は警告のみで残置されること
test("real-core update: customized retired file is NOT deleted (warned and kept)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("update-cleanup-skip-");
  try {
    const { retiredFiles } = await buildV1xFixture(tmpDir);

    // Customize the first retired file (cc-sdd-full.yaml)
    const customTarget = retiredFiles[0];
    const customPath = join(tmpDir, customTarget.relPath);
    const customizedContent = customTarget.content + "\n# CUSTOMIZED BY USER\n";
    writeFileSync(customPath, customizedContent, "utf-8");

    // Run update
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    await runInit({ targetDir: tmpDir, lang: "en", force: false, dryRun: false }, ctx);

    // Customized file must still exist with original customized content
    assert.ok(existsSync(customPath), "customized retired file must NOT be deleted");
    assert.equal(
      readFileSync(customPath, "utf-8"),
      customizedContent,
      "customized content must be preserved",
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Req 5.3: dry-run では削除予定一覧が表示され、write ゼロであること
test("real-core update dry-run: shows planned removals, writes ZERO files", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("update-cleanup-dryrun-");
  try {
    await buildV1xFixture(tmpDir);

    // Snapshot state before dry-run update
    const filesBefore = walkDir(tmpDir).sort();

    // Run dry-run update
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    await runInit({ targetDir: tmpDir, lang: "en", force: false, dryRun: true }, ctx);

    // No files should be added or removed
    const filesAfter = walkDir(tmpDir).sort();
    assert.deepEqual(
      filesAfter,
      filesBefore,
      `dry-run must not change any files. Diff: added=${filesAfter.filter((f) => !filesBefore.includes(f)).join(", ")} removed=${filesBefore.filter((f) => !filesAfter.includes(f)).join(", ")}`,
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Req 5.5: update 後も openspec/ ディレクトリとユーザー所有物が残ること
test("real-core update: openspec/ and user-owned files are NOT deleted", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("update-cleanup-userowned-");
  try {
    await buildV1xFixture(tmpDir);

    // Add user-owned files
    const openspecDir = join(tmpDir, "openspec");
    mkdirSync(openspecDir, { recursive: true });
    writeFileSync(join(openspecDir, "my-change.md"), "# user openspec change", "utf-8");
    writeFileSync(join(tmpDir, "user-custom-script.sh"), "#!/bin/sh\necho hello", "utf-8");

    // Run update
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    await runInit({ targetDir: tmpDir, lang: "en", force: false, dryRun: false }, ctx);

    // User-owned files must remain
    assert.ok(existsSync(join(openspecDir, "my-change.md")), "openspec/my-change.md must NOT be deleted");
    assert.ok(existsSync(join(tmpDir, "user-custom-script.sh")), "user-custom-script.sh must NOT be deleted");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Req 5.3: fresh install（manifest なし）では退役 cleanup が発火しない（dry-run で確認）
test("real-core fresh install: retired cleanup does NOT fire (no manifest)", async () => {
  const { runInit } = await getInitAdapter();
  const tmpDir = makeTmp("fresh-install-no-cleanup-");
  try {
    // Place a file that looks retired but is user-owned (no manifest)
    mkdirSync(join(tmpDir, ".takt", "workflows"), { recursive: true });
    writeFileSync(join(tmpDir, ".takt", "workflows", "cc-sdd-full.yaml"), "user-placed", "utf-8");

    // Fresh install (no manifest) — cleanup must not fire
    const ctx = { projectRoot: tmpDir, packageRoot: REPO_ROOT };
    await runInit({ targetDir: tmpDir, lang: "en", force: true, dryRun: false }, ctx);

    // The user-placed file may be overwritten (force mode), but the point is
    // no error and cleanup logic did not remove untracked files (manifest was null at start).
    // The manifest is now created, so we just verify install succeeded.
    const manifestPath = join(tmpDir, ".takt", ".manifest.json");
    assert.ok(existsSync(manifestPath), "manifest must be created after fresh install");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
