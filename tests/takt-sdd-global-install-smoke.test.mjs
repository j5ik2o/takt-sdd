/**
 * tests/takt-sdd-global-install-smoke.test.mjs
 *
 * GlobalInstallSmoke — isolated E2E test that:
 *   1. Packs the repo into a tarball (real pack, prepack runs build:installer).
 *   2. Installs the tarball into an isolated temp npm prefix.
 *   3. Verifies the public command surface via PATH.
 *   4. Double-checks tarball forbidden-file exclusion using the same patterns
 *      as validate-package-artifact.mjs (via the exported validateFileList).
 *
 * Network boundary: this file is the ONLY test that hits the npm registry
 * (to resolve pinned dependencies during global install step 2).
 *
 * Skip: set TAKT_SDD_SKIP_INSTALL_SMOKE=1 or TAKT_SDD_SKIP_INSTALL_SMOKE=true
 * to skip the entire suite with an explicit reason message.  CI does NOT set
 * this variable (always runs).
 *
 * Requirements: 1.1, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Skip guard — must be checked before any test is registered.
// ---------------------------------------------------------------------------
const SKIP_VAR = "TAKT_SDD_SKIP_INSTALL_SMOKE";
const skipValue = process.env[SKIP_VAR];
const shouldSkip = skipValue === "1" || skipValue === "true";

if (shouldSkip) {
  // Print the skip reason immediately (visible in stdout regardless of test runner).
  process.stdout.write(
    `[takt-sdd-global-install-smoke] SKIP: ${SKIP_VAR} is set — skipping registry-dependent global install smoke.\n`,
  );
}

// ---------------------------------------------------------------------------
// Suite-level state — populated in the before() hook, cleaned up in after().
// ---------------------------------------------------------------------------
/** @type {string | null} */
let tmpDir = null;
/** @type {string | null} */
let tarballPath = null;
/** @type {string | null} */
let npmPrefix = null;
/** @type {string | null} */
let projectDir = null;
/** @type {string[]} */
let tarballFileList = [];

// ---------------------------------------------------------------------------
// Root package version (used to verify --version output).
// ---------------------------------------------------------------------------
const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const expectedVersion = rootPkg.version;

// ---------------------------------------------------------------------------
// Helper: run takt-sdd CLI command with the isolated prefix on PATH.
// Returns { stdout, stderr, status }.
// ---------------------------------------------------------------------------
function runCli(args, options = {}) {
  const binDir = join(npmPrefix, "bin");
  const env = {
    ...process.env,
    PATH: `${binDir}${os.platform() === "win32" ? ";" : ":"}${process.env.PATH}`,
    // Remove npm user config that could bleed into the prefix install.
    npm_config_prefix: undefined,
    NPM_CONFIG_PREFIX: undefined,
  };
  const result = spawnSync("takt-sdd", args, {
    cwd: options.cwd ?? projectDir,
    env,
    encoding: "utf8",
    timeout: options.timeout ?? 30_000,
  });
  return result;
}

// ---------------------------------------------------------------------------
// Suite — only runs if not skipped.
// ---------------------------------------------------------------------------
const suiteOptions = {
  // 10 minutes: pack + registry-dependent global install can be slow.
  timeout: 10 * 60_000,
};

test("takt-sdd global install smoke", { skip: shouldSkip }, async (t) => {
  // --------------------------------------------------------------------------
  // Setup: pack, install, prepare empty project dir
  // --------------------------------------------------------------------------
  t.before(async () => {
    // Create a single temp workspace directory.
    tmpDir = mkdtempSync(join(os.tmpdir(), "takt-sdd-smoke-"));

    const tarballDir = join(tmpDir, "tarball");
    mkdirSync(tarballDir, { recursive: true });
    npmPrefix = join(tmpDir, "prefix");
    mkdirSync(npmPrefix, { recursive: true });
    projectDir = join(tmpDir, "project");
    mkdirSync(projectDir, { recursive: true });

    // -----------------------------------------------------------------------
    // Step 1: npm pack into tarball dir.
    // We run the real pack (prepack triggers build:installer) and extract the
    // tarball path robustly.  The prepack hook may pollute stdout, so we use
    // --pack-destination + glob to find the single .tgz file rather than
    // relying on JSON parsing.
    // -----------------------------------------------------------------------
    execFileSync(
      "npm",
      ["pack", "--pack-destination", tarballDir],
      {
        cwd: repoRoot,
        encoding: "utf8",
        // Allow up to 3 minutes for build:installer + pack.
        timeout: 3 * 60_000,
        // Inherit stderr so prepack output goes to console, not into stdout capture.
        stdio: ["ignore", "ignore", "inherit"],
      },
    );

    // Glob for the single .tgz produced.
    const tarballs = readdirSync(tarballDir).filter((f) => f.endsWith(".tgz"));
    assert.equal(
      tarballs.length,
      1,
      `Expected exactly 1 .tgz in ${tarballDir}, got: ${tarballs.join(", ")}`,
    );
    tarballPath = join(tarballDir, tarballs[0]);
    assert.ok(existsSync(tarballPath), `Tarball not found at ${tarballPath}`);

    // -----------------------------------------------------------------------
    // Step 1b: Build tarball file list (for step 4 forbidden-file check).
    //   `tar -tzf <tarball>` lists entries like:
    //     package/package.json
    //     package/bin/takt-sdd.mjs
    //   We strip the leading "package/" prefix to get paths matching the
    //   validator's format.
    // -----------------------------------------------------------------------
    const tarListResult = spawnSync("tar", ["-tzf", tarballPath], {
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(
      tarListResult.status,
      0,
      `tar -tzf failed: ${tarListResult.stderr}`,
    );
    tarballFileList = tarListResult.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      // Strip the leading "package/" prefix that npm wraps files in.
      .map((line) => (line.startsWith("package/") ? line.slice("package/".length) : line))
      // Remove the root "package/" directory entry itself (empty after strip).
      .filter(Boolean);

    // -----------------------------------------------------------------------
    // Step 2: npm install -g <tarball> into isolated prefix.
    // Pinned deps resolve from registry — only this file requires network.
    // -----------------------------------------------------------------------
    execFileSync(
      "npm",
      ["install", "-g", tarballPath, "--prefix", npmPrefix],
      {
        cwd: tmpDir,
        encoding: "utf8",
        // Allow up to 7 minutes for registry resolution + install.
        timeout: 7 * 60_000,
        stdio: ["ignore", "ignore", "inherit"],
      },
    );

    // Verify the binary was installed.
    const taktSddBin = join(npmPrefix, "bin", "takt-sdd");
    assert.ok(
      existsSync(taktSddBin),
      `takt-sdd binary not found at ${taktSddBin} after global install`,
    );
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------
  t.after(() => {
    if (tmpDir && existsSync(tmpDir)) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; do not fail the test.
      }
    }
  });

  // --------------------------------------------------------------------------
  // Test 1: --help exits 0 and lists expected surface (req 8.2, 1.1)
  // --------------------------------------------------------------------------
  await t.test("takt-sdd --help exits 0 and shows init, kiro-*, opsx-*, run", () => {
    const result = runCli(["--help"]);
    assert.equal(
      result.status,
      0,
      `--help exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    const output = result.stdout + result.stderr;
    assert.match(output, /\binit\b/, "--help must mention 'init'");
    assert.match(output, /kiro-/, "--help must mention at least one kiro-* command");
    assert.match(output, /opsx-/, "--help must mention at least one opsx-* command");
    assert.match(output, /\brun\b/, "--help must mention 'run'");
  });

  // --------------------------------------------------------------------------
  // Test 2: --version exits 0 and prints exactly the root package version
  //         (req 1.3, 8.2)
  // --------------------------------------------------------------------------
  await t.test("takt-sdd --version exits 0 and equals root package.json version", () => {
    const result = runCli(["--version"]);
    assert.equal(
      result.status,
      0,
      `--version exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    const output = (result.stdout + result.stderr).trim();
    assert.ok(
      output.includes(expectedVersion),
      `Expected version output to contain '${expectedVersion}', got: '${output}'`,
    );
  });

  // --------------------------------------------------------------------------
  // Test 3: init . --dry-run in empty project exits 0 with ZERO file writes
  //         (req 8.2, 3.4)
  // --------------------------------------------------------------------------
  await t.test("takt-sdd init . --dry-run in empty dir exits 0 and writes nothing", () => {
    // Snapshot directory contents BEFORE.
    const snapshotBefore = readdirSync(projectDir);

    const result = runCli(["init", ".", "--dry-run"], { cwd: projectDir, timeout: 60_000 });

    // Snapshot AFTER.
    const snapshotAfter = readdirSync(projectDir);

    assert.equal(
      result.status,
      0,
      `init --dry-run exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    assert.deepEqual(
      snapshotAfter.sort(),
      snapshotBefore.sort(),
      `init --dry-run must not write any files.\nBefore: ${snapshotBefore.join(", ")}\nAfter:  ${snapshotAfter.join(", ")}`,
    );
  });

  // --------------------------------------------------------------------------
  // Test 4: uninitialized project preflight error mentions takt-sdd init
  //         (req 8.3, 6.5)
  //
  // Use a separate empty dir that has never been initialized so preflight
  // cannot find .takt/workflows/<name>.yaml.
  // --------------------------------------------------------------------------
  await t.test(
    "takt-sdd kiro-impl foo in uninitialized dir exits non-0 and suggests takt-sdd init",
    () => {
      // Create a fresh uninitialised directory inside tmpDir.
      const uninitDir = join(tmpDir, "uninit-project");
      mkdirSync(uninitDir, { recursive: true });

      const result = runCli(["kiro-impl", "foo"], { cwd: uninitDir, timeout: 30_000 });
      assert.notEqual(
        result.status,
        0,
        `Expected non-0 exit for uninitialized project, got 0\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
      const output = result.stdout + result.stderr;
      assert.match(
        output,
        /takt-sdd\s+init/i,
        `Expected output to suggest 'takt-sdd init', got:\n${output}`,
      );
    },
  );

  // --------------------------------------------------------------------------
  // Test 5a: takt-sdd cc-sdd-full → non-0 exit + unsupported message (req 8.4)
  // --------------------------------------------------------------------------
  await t.test("takt-sdd cc-sdd-full exits non-0 with unsupported message", () => {
    const result = runCli(["cc-sdd-full"]);
    assert.notEqual(
      result.status,
      0,
      `Expected non-0 for cc-sdd-full, got 0\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    const output = result.stdout + result.stderr;
    assert.match(
      output,
      /unsupported|not supported|legacy/i,
      `Expected 'unsupported'/'legacy' message for cc-sdd-full, got:\n${output}`,
    );
  });

  // --------------------------------------------------------------------------
  // Test 5b: takt-sdd run cc-sdd-full → non-0 exit + unsupported message (req 8.4)
  // --------------------------------------------------------------------------
  await t.test("takt-sdd run cc-sdd-full exits non-0 with unsupported message", () => {
    const result = runCli(["run", "cc-sdd-full"]);
    assert.notEqual(
      result.status,
      0,
      `Expected non-0 for run cc-sdd-full, got 0\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    const output = result.stdout + result.stderr;
    assert.match(
      output,
      /unsupported|not supported|legacy/i,
      `Expected 'unsupported'/'legacy' message for run cc-sdd-full, got:\n${output}`,
    );
  });

  // --------------------------------------------------------------------------
  // Test 6: tarball forbidden-file double-check (req 8.5)
  //
  // We import the same validateFileList from validate-package-artifact.mjs so
  // the forbidden patterns are not duplicated.  Only the forbidden-pattern
  // check matters here (the required-set is the validator's job).  We strip
  // error lines that start with MISSING_REQUIRED and assert that no
  // FORBIDDEN_FILE lines appear.
  // --------------------------------------------------------------------------
  await t.test(
    "tarball contents contain no forbidden files (same patterns as PackageArtifactValidator)",
    async () => {
      assert.ok(
        tarballFileList.length > 0,
        "tarballFileList must be populated by setup",
      );

      const { validateFileList } = await import(
        "../scripts/validate-package-artifact.mjs"
      );

      const allErrors = validateFileList(tarballFileList);
      // Filter to only the forbidden-file class of errors.
      const forbiddenErrors = allErrors.filter((e) => e.startsWith("FORBIDDEN_FILE:"));

      assert.deepEqual(
        forbiddenErrors,
        [],
        `Tarball contains forbidden files:\n${forbiddenErrors.join("\n")}`,
      );
    },
  );
});
