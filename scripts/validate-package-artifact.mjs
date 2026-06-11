#!/usr/bin/env node
/**
 * scripts/validate-package-artifact.mjs
 *
 * PackageArtifactValidator — verifies that the npm package artifact (as
 * reported by `npm pack --dry-run --json`) contains the expected files and
 * does NOT contain forbidden runtime state or credentials.
 *
 * Requirements: 7.4, 7.5, 8.5
 *
 * Design approach — exported functions + main guard:
 *   The core logic is exported so tests can unit-test it with synthetic file
 *   lists and package objects without running `npm pack` repeatedly.
 *   The main guard (runs when this file is executed directly) calls the real
 *   `npm pack --dry-run --json` and exits non-0 on any failure.
 *
 * Input acquisition strategy:
 *   We run `npm pack --dry-run --json --ignore-scripts` to avoid the prepack
 *   hook (build:installer) polluting stdout.  Before doing so we check that
 *   installer/dist/install.js already exists on disk and emit a clear error
 *   advising `npm run build:installer` if it is absent.  This keeps the
 *   validator offline and fast while still ensuring dist was built.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SUPPORTED_WORKFLOWS, EXCLUDED_WORKFLOWS } from "../cli/command-catalog.mjs";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// All catalog workflow names: supported ∪ legacy ∪ internal (30 total).
// Every entry must have both en and ja yaml files in the package.
const ALL_CATALOG_WORKFLOWS = [
  ...SUPPORTED_WORKFLOWS,
  ...EXCLUDED_WORKFLOWS.legacy,
  ...EXCLUDED_WORKFLOWS.internal,
];

// ---------------------------------------------------------------------------
// Required file patterns (checked against the npm pack file list)
// ---------------------------------------------------------------------------

// Exact paths that must appear in the package.
// LICENSE-MIT and LICENSE-APACHE are explicitly listed here rather than relying
// on npm auto-inclusion (which only covers files named exactly "LICENSE").
// Both are present in the package.json files allowlist (task 2 remediation,
// commit 4c6901a).
const REQUIRED_EXACT = [
  "package.json",
  "README.md",
  "README.ja.md",
  "COMMON.md",
  "LICENSE-MIT",
  "LICENSE-APACHE",
  "bin/takt-sdd.mjs",
  "cli/main.mjs",
  "cli/command-catalog.mjs",
  "cli/init-adapter.mjs",
  "cli/workflow-runner.mjs",
  "scripts/kiro-staged.mjs",
  "installer/dist/install.js",
  "installer/dist/i18n.js",
  "installer/package.json",
];

// Pattern-based requirements: at least one file must match each predicate.
// Workflow yaml presence is checked per-catalog-entry below (not here).
const REQUIRED_PRESENT = [
  {
    label: ".takt/en/facets/**",
    test: (/** @type {string} */ f) => f.startsWith(".takt/en/facets/"),
  },
  {
    label: ".takt/ja/facets/**",
    test: (/** @type {string} */ f) => f.startsWith(".takt/ja/facets/"),
  },
];

// ---------------------------------------------------------------------------
// Forbidden patterns
// Each entry has a label (for error messages) and a test function.
// ---------------------------------------------------------------------------
const FORBIDDEN_PATTERNS = [
  {
    label: ".takt/config.yaml (repo config — user-owned, must not be published)",
    test: (/** @type {string} */ f) => f === ".takt/config.yaml",
  },
  {
    label: ".takt/runs/** (runtime state)",
    test: (/** @type {string} */ f) => f.startsWith(".takt/runs/"),
  },
  {
    label: ".takt/session-state.json (runtime state)",
    test: (/** @type {string} */ f) => f === ".takt/session-state.json",
  },
  {
    label: ".takt/persona_sessions.json (runtime state)",
    test: (/** @type {string} */ f) => f === ".takt/persona_sessions.json",
  },
  {
    label: "**/*.log (log files)",
    test: (/** @type {string} */ f) => f.endsWith(".log"),
  },
  {
    label: ".kiro/** (dev spec files)",
    test: (/** @type {string} */ f) => f.startsWith(".kiro/"),
  },
  {
    label: ".claude/** (dev config)",
    test: (/** @type {string} */ f) => f.startsWith(".claude/"),
  },
  {
    label: ".agents/** (dev agents)",
    test: (/** @type {string} */ f) => f.startsWith(".agents/"),
  },
  {
    label: "openspec/** (local openspec data)",
    test: (/** @type {string} */ f) => f.startsWith("openspec/"),
  },
  {
    label: "tests/** (test files must not be published)",
    test: (/** @type {string} */ f) => f.startsWith("tests/"),
  },
  {
    label: "installer/src/** (TypeScript source — only dist should be published)",
    test: (/** @type {string} */ f) => f.startsWith("installer/src/"),
  },
  {
    label: "installer/dist/**/*.test.js (compiled test artifacts)",
    test: (/** @type {string} */ f) =>
      f.startsWith("installer/dist/") && f.endsWith(".test.js"),
  },
  {
    label: ".github/** (CI config)",
    test: (/** @type {string} */ f) => f.startsWith(".github/"),
  },
  {
    label: ".env* (environment / credential files)",
    // Matches .env, .env.local, .env.production, etc.  The path may be nested.
    test: (/** @type {string} */ f) => {
      const base = f.split("/").pop() ?? "";
      return base.startsWith(".env");
    },
  },
  {
    label: "*credential* (credential file names)",
    test: (/** @type {string} */ f) => /credential/i.test(f.split("/").pop() ?? ""),
  },
  {
    label: "*secret* (secret file names)",
    test: (/** @type {string} */ f) => /secret/i.test(f.split("/").pop() ?? ""),
  },
  {
    label: "*token* (token file names)",
    test: (/** @type {string} */ f) => /token/i.test(f.split("/").pop() ?? ""),
  },
  {
    // scripts/ directory is in the files allowlist only for scripts/kiro-staged.mjs.
    // Any other scripts/ entry indicates an allowlist regression or a new script
    // that hasn't been explicitly excluded.
    label: "scripts/* except scripts/kiro-staged.mjs (dev scripts must not be published)",
    test: (/** @type {string} */ f) =>
      f.startsWith("scripts/") && f !== "scripts/kiro-staged.mjs",
  },
];

// ---------------------------------------------------------------------------
// Exported validator functions
// ---------------------------------------------------------------------------

/**
 * Validate a list of file paths from `npm pack --dry-run --json`.
 *
 * @param {readonly string[]} files - Array of relative file paths.
 * @returns {string[]} Array of error messages; empty means all checks passed.
 */
export function validateFileList(files) {
  const errors = [];
  const fileSet = new Set(files);

  // Check required exact paths
  for (const required of REQUIRED_EXACT) {
    if (!fileSet.has(required)) {
      errors.push(`MISSING_REQUIRED: ${required} not found in package`);
    }
  }

  // Check pattern-based requirements (facets)
  for (const { label, test } of REQUIRED_PRESENT) {
    if (!files.some(test)) {
      errors.push(`MISSING_REQUIRED: no file matching ${label}`);
    }
  }

  // Catalog-driven workflow checks: every workflow in the catalog must have
  // both .takt/en/workflows/<name>.yaml and .takt/ja/workflows/<name>.yaml.
  for (const name of ALL_CATALOG_WORKFLOWS) {
    const enPath = `.takt/en/workflows/${name}.yaml`;
    const jaPath = `.takt/ja/workflows/${name}.yaml`;
    if (!fileSet.has(enPath)) {
      errors.push(`MISSING_REQUIRED: ${enPath} not found in package`);
    }
    if (!fileSet.has(jaPath)) {
      errors.push(`MISSING_REQUIRED: ${jaPath} not found in package`);
    }
  }

  // Check forbidden patterns
  for (const file of files) {
    for (const { label, test } of FORBIDDEN_PATTERNS) {
      if (test(file)) {
        errors.push(`FORBIDDEN_FILE: ${file} — matches forbidden pattern: ${label}`);
      }
    }
  }

  return errors;
}

/**
 * Validate version consistency between compiled installer constants and
 * root package.json.
 *
 * @param {{ OPENSPEC_VERSION: string; CC_SDD_VERSION: string }} constants
 *   Version constants exported from installer/dist/install.js.
 * @param {{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }} pkg
 *   Parsed root package.json object.
 * @returns {string[]} Array of error messages; empty means all checks passed.
 */
export function validateVersionConsistency(constants, pkg) {
  const errors = [];
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  // 1. OPENSPEC_VERSION must match dependencies["@fission-ai/openspec"]
  const pkgOpenspec = deps["@fission-ai/openspec"];
  if (pkgOpenspec === undefined) {
    errors.push(
      `VERSION_MISMATCH: @fission-ai/openspec not found in package.json dependencies`,
    );
  } else if (constants.OPENSPEC_VERSION !== pkgOpenspec) {
    errors.push(
      `VERSION_MISMATCH: OPENSPEC_VERSION=${constants.OPENSPEC_VERSION} but package.json dependencies["@fission-ai/openspec"]=${pkgOpenspec}`,
    );
  }

  // 2. CC_SDD_VERSION must match devDependencies["cc-sdd"]
  const pkgCcSdd = devDeps["cc-sdd"];
  if (pkgCcSdd === undefined) {
    errors.push(`VERSION_MISMATCH: cc-sdd not found in package.json devDependencies`);
  } else if (constants.CC_SDD_VERSION !== pkgCcSdd) {
    errors.push(
      `VERSION_MISMATCH: CC_SDD_VERSION=${constants.CC_SDD_VERSION} but package.json devDependencies["cc-sdd"]=${pkgCcSdd}`,
    );
  }

  // 3. dependencies["takt"] must be an exact version pin (no ^, ~, >=, *, latest, etc.)
  const taktVersion = deps["takt"];
  if (taktVersion === undefined) {
    errors.push(`VERSION_MISMATCH: takt not found in package.json dependencies`);
  } else if (!/^\d+\.\d+\.\d+$/.test(taktVersion)) {
    errors.push(
      `VERSION_MISMATCH: takt version "${taktVersion}" is not an exact pin (must match \\d+\\.\\d+\\.\\d+, no ^/~/latest)`,
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main guard — runs when this script is executed directly
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = defaultRepoRoot;

  // Pre-flight: installer/dist/install.js must be built before we can validate
  // version constants.  We check this before running npm pack so the error is
  // actionable.  (When run via npm run validate:package-artifact the prepack
  // hook has already built dist; this check catches direct invocations on a
  // fresh clone.)
  const distInstallPath = join(repoRoot, "installer", "dist", "install.js");
  if (!existsSync(distInstallPath)) {
    process.stderr.write(
      `ERROR: installer/dist/install.js not found.\n` +
        `Run \`npm run build:installer\` first to compile the installer, then re-run this validator.\n`,
    );
    process.exit(1);
  }

  const allErrors = [];

  // --- File list validation ---
  // Run npm pack --dry-run --json --ignore-scripts to avoid the prepack hook
  // (build:installer) from polluting stdout.  Since we already verified that
  // dist/install.js exists above, skipping scripts is safe here.
  let packFiles;
  try {
    const raw = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json", "--ignore-scripts"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    // npm may produce non-JSON content before/after the array in some
    // environments (e.g., npm notices).  Extract the first JSON array robustly.
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]") + 1;
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON array found in npm pack output");
    }
    const packData = JSON.parse(raw.slice(jsonStart, jsonEnd));
    packFiles = packData[0].files.map((/** @type {{ path: string }} */ f) => f.path);
  } catch (err) {
    process.stderr.write(`ERROR: Failed to run npm pack --dry-run --json: ${err.message}\n`);
    process.exit(1);
  }

  const fileErrors = validateFileList(packFiles);
  allErrors.push(...fileErrors);

  // --- Version consistency validation ---
  // Import OPENSPEC_VERSION and CC_SDD_VERSION from compiled install core.
  const { OPENSPEC_VERSION, CC_SDD_VERSION } = await import(
    join(repoRoot, "installer", "dist", "install.js")
  );

  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const versionErrors = validateVersionConsistency(
    { OPENSPEC_VERSION, CC_SDD_VERSION },
    rootPkg,
  );
  allErrors.push(...versionErrors);

  // --- Report ---
  if (allErrors.length > 0) {
    process.stderr.write("Package artifact validation FAILED:\n");
    for (const err of allErrors) {
      process.stderr.write(`  - ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `Package artifact validation passed (${packFiles.length} files checked, 0 errors)\n`,
  );
  process.exit(0);
}
