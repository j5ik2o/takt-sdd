#!/usr/bin/env node
/**
 * scripts/validate-package-artifact.mjs
 *
 * PackageArtifactValidator — verifies that the npm package artifact (as
 * reported by `npm pack --dry-run --json`) contains the expected files and
 * does NOT contain forbidden runtime state or credentials.
 *
 * Requirements: 6.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
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
import { SUPPORTED_WORKFLOWS, EXCLUDED_WORKFLOWS, RETIRED_WORKFLOWS } from "../cli/command-catalog.mjs";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// All catalog workflow names: supported ∪ internal (15 total).
// Retired workflows (cc-sdd-* and opsx-*) are NOT bundled and must NOT appear.
// Every entry must have both en and ja yaml files in the package.
const ALL_CATALOG_WORKFLOWS = [
  ...SUPPORTED_WORKFLOWS,
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
  "cli/asset-resolution.mjs",
  "cli/eject-command.mjs",
  "cli/workflow-runner.mjs",
  "scripts/kiro-staged.mjs",
  "installer/dist/install.js",
  "installer/dist/cli.js",
  "installer/dist/i18n.js",
  "installer/package.json",
];

// Pattern-based requirements: at least one file must match each predicate.
// Workflow yaml presence is checked per-catalog-entry below (not here).
const REQUIRED_PRESENT = [
  {
    label: "builtins/en/facets/**",
    test: (/** @type {string} */ f) => f.startsWith("builtins/en/facets/"),
  },
  {
    label: "builtins/ja/facets/**",
    test: (/** @type {string} */ f) => f.startsWith("builtins/ja/facets/"),
  },
];

// ---------------------------------------------------------------------------
// Retired-exclusive facet basenames (prefix-external names from commit 55abeea).
// These facets were exclusively used by cc-sdd-* / opsx-* workflows and must
// not appear in the published artifact.
// ---------------------------------------------------------------------------
const RETIRED_EXCLUSIVE_FACETS = new Set([
  "ai-review-fix-loop-judge.md",
  "batch-plan-implement-loop-judge.md",
]);

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
  // Retired workflow yaml files must not appear in the artifact (req 6.3).
  // Covers builtins/en/workflows/(cc-sdd-|opsx-)*.yaml and builtins/ja/workflows/(cc-sdd-|opsx-)*.yaml
  {
    label: "builtins/{en,ja}/workflows/(cc-sdd-|opsx-)*.yaml (retired workflow assets)",
    test: (/** @type {string} */ f) => {
      const m = f.match(/^builtins\/(en|ja)\/workflows\/(.+)\.yaml$/);
      if (!m) return false;
      return m[2].startsWith("cc-sdd-") || m[2].startsWith("opsx-");
    },
  },
  // Retired cc-sdd-*/opsx-* facets must not appear in the artifact (req 6.3).
  // The retired prefix may be on any path segment, not just the filename —
  // v1.x shipped nested dirs like facets/knowledge/cc-sdd-steering-template-files/
  // whose contained files have neutral basenames.
  {
    label: "builtins/{en,ja}/facets/**/(cc-sdd-|opsx-)* (retired cc-sdd/opsx facets, any path segment)",
    test: (/** @type {string} */ f) => {
      const m = f.match(/^builtins\/(en|ja)\/facets\/(.+)$/);
      if (!m) return false;
      return m[2]
        .split("/")
        .some((seg) => seg.startsWith("cc-sdd-") || seg.startsWith("opsx-"));
    },
  },
  // Retired exclusive facets (prefix-external names) must not appear in the artifact (req 6.3).
  {
    label: "retired-exclusive facets (ai-review-fix-loop-judge.md, batch-plan-implement-loop-judge.md)",
    test: (/** @type {string} */ f) => {
      if (!f.startsWith("builtins/")) return false;
      const base = f.split("/").pop() ?? "";
      return RETIRED_EXCLUSIVE_FACETS.has(base);
    },
  },
  {
    label: ".takt/{en,ja}/** (old bundled asset layout)",
    test: (/** @type {string} */ f) => /^\.takt\/(en|ja)\//.test(f),
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
  // both builtins/en/workflows/<name>.yaml and builtins/ja/workflows/<name>.yaml.
  for (const name of ALL_CATALOG_WORKFLOWS) {
    const enPath = `builtins/en/workflows/${name}.yaml`;
    const jaPath = `builtins/ja/workflows/${name}.yaml`;
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
 * Also enforces that banned dependencies (@fission-ai/openspec, cc-sdd) are
 * absent from both dependencies and devDependencies (req 6.2).
 *
 * @param {Record<string, string>} constants
 *   Version constants exported from installer/dist/install.js (unused post-v2).
 * @param {{ dependencies?: Record<string, string>, devDependencies?: Record<string, string> }} pkg
 *   Parsed root package.json object.
 * @returns {string[]} Array of error messages; empty means all checks passed.
 */
export function validateVersionConsistency(constants, pkg) {
  const errors = [];
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};
  const allDeps = { ...devDeps, ...deps };

  // dependencies["takt"] must be an exact version pin (no ^, ~, >=, *, latest, etc.)
  const taktVersion = deps["takt"];
  if (taktVersion === undefined) {
    errors.push(`VERSION_MISMATCH: takt not found in package.json dependencies`);
  } else if (!/^\d+\.\d+\.\d+$/.test(taktVersion)) {
    errors.push(
      `VERSION_MISMATCH: takt version "${taktVersion}" is not an exact pin (must match \\d+\\.\\d+\\.\\d+, no ^/~/latest)`,
    );
  }

  // Banned dependencies: @fission-ai/openspec and cc-sdd must not be declared (req 6.2).
  const BANNED_DEPS = ["@fission-ai/openspec", "cc-sdd"];
  for (const banned of BANNED_DEPS) {
    if (allDeps[banned] !== undefined) {
      errors.push(
        `BANNED_DEPENDENCY: "${banned}" must not be in package.json dependencies or devDependencies (retired in v2.0.0)`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Documentation migration checks
// ---------------------------------------------------------------------------

function normalizeDoc(text) {
  return String(text ?? "").replace(/\s+/g, " ");
}

function requireDocPattern(errors, label, text, description, pattern) {
  if (!pattern.test(text)) {
    errors.push(`DOC_MISSING: ${label} missing ${description}`);
  }
}

function validateReadmeMigration(errors, label, text) {
  requireDocPattern(
    errors,
    label,
    text,
    "package bundled runtime guidance",
    /package[- ]bundled workflows\/facets|bundled workflows\/facets.*installed package|installed package.*bundled workflows\/facets/i,
  );
  requireDocPattern(
    errors,
    label,
    text,
    "eject customization guidance",
    /takt-sdd eject/i,
  );
  requireDocPattern(
    errors,
    label,
    text,
    "retired init guidance",
    /takt-sdd init.*(retired|guidance-only|no longer copies|廃止|copy は行いません|コピーは行いません)/i,
  );
  requireDocPattern(
    errors,
    label,
    text,
    "retired create-takt-sdd guidance",
    /create-takt-sdd.*(retired|guidance-only|no longer installs|廃止|install や copy は行いません|コピーは行いません)/i,
  );
  requireDocPattern(
    errors,
    label,
    text,
    "manual npm script example",
    /"kiro:impl"\s*:\s*"takt-sdd kiro-impl"/,
  );
  requireDocPattern(
    errors,
    label,
    text,
    "BREAKING BEHAVIOR CHANGE wording",
    /BREAKING BEHAVIOR CHANGE|破壊的挙動変更/i,
  );
}

/**
 * Validate README migration guidance for the no-copy bundled runtime. Release
 * notes are generated separately, so this check avoids coupling package
 * artifact validation to a specific CHANGELOG prose shape or versioning policy.
 *
 * @param {{ readme?: string, readmeJa?: string }} docs
 * @returns {string[]}
 */
export function validateDocumentationMigration(docs) {
  const errors = [];

  validateReadmeMigration(errors, "README.md", normalizeDoc(docs.readme));
  validateReadmeMigration(errors, "README.ja.md", normalizeDoc(docs.readmeJa));

  return errors;
}

// ---------------------------------------------------------------------------
// Retired cross-check: catalog RETIRED_WORKFLOWS ↔ installer RETIRED_MANIFEST_KEY_PATTERNS
// ---------------------------------------------------------------------------

// Mirrors installer/src/install.ts RETIRED_MANIFEST_KEY_PATTERNS for cross-check.
// Kept in sync manually; drift is caught by the cross-check test.
const INSTALLER_RETIRED_PATTERNS = [
  /^\.takt\/workflows\/(cc-sdd-|opsx-).*\.yaml$/,
  /^\.takt\/(?:facets\/)?[a-z-]+\/(cc-sdd-|opsx-).*/,
  /^\.takt\/(?:facets\/)?instructions\/(ai-review-fix-loop-judge|batch-plan-implement-loop-judge)\.md$/,
  /^scripts\/opsx-cli\.sh$/,
];

/**
 * Validate that the catalog's RETIRED_WORKFLOWS entries and the installer's
 * RETIRED_MANIFEST_KEY_PATTERNS cover the same retired asset set.
 *
 * Rules:
 * 1. Every RETIRED name (cc-sdd-* and opsx-*) must match at least one installer
 *    pattern when used as a workflow key (.takt/workflows/<name>.yaml) — i.e.
 *    the installer will clean it up.
 * 2. No SUPPORTED or EXCLUDED.internal name must accidentally match any installer
 *    pattern — i.e. the installer won't delete kiro/internal assets.
 *
 * @returns {string[]} Array of error messages; empty means cross-check passed.
 */
export function validateRetiredCrossCheck() {
  const errors = [];

  // Check 1: every retired workflow name → synthetic manifest key must match
  const allRetired = [
    ...RETIRED_WORKFLOWS.legacy,
    ...RETIRED_WORKFLOWS.opsx,
  ];
  for (const name of allRetired) {
    // Synthetic key for en language (pattern is language-agnostic — both use same prefix)
    const syntheticKey = `.takt/workflows/${name}.yaml`;
    const covered = INSTALLER_RETIRED_PATTERNS.some((p) => p.test(syntheticKey));
    if (!covered) {
      errors.push(
        `RETIRED_CROSSCHECK NOT_COVERED: catalog RETIRED workflow "${name}" does not match any RETIRED_MANIFEST_KEY_PATTERNS (installer will not clean it up)`,
      );
    }
  }

  // Check 2: no supported/internal workflow name must match any retired pattern
  const allActive = [
    ...SUPPORTED_WORKFLOWS,
    ...EXCLUDED_WORKFLOWS.internal,
  ];
  for (const name of allActive) {
    const syntheticKey = `.takt/workflows/${name}.yaml`;
    const accidentalMatch = INSTALLER_RETIRED_PATTERNS.some((p) => p.test(syntheticKey));
    if (accidentalMatch) {
      errors.push(
        `RETIRED_CROSSCHECK FALSE_POSITIVE: active workflow "${name}" accidentally matches RETIRED_MANIFEST_KEY_PATTERNS (installer would incorrectly delete it)`,
      );
    }
  }

  // Check 3: every retired-exclusive facet (prefix-external name) must be
  // covered by the installer patterns in both installed layouts, so update
  // cleanup removes it from v1.x projects (req 5.1).
  for (const facetName of RETIRED_EXCLUSIVE_FACETS) {
    for (const syntheticKey of [
      `.takt/facets/instructions/${facetName}`,
      `.takt/instructions/${facetName}`,
    ]) {
      const covered = INSTALLER_RETIRED_PATTERNS.some((p) => p.test(syntheticKey));
      if (!covered) {
        errors.push(
          `RETIRED_CROSSCHECK NOT_COVERED: retired-exclusive facet key "${syntheticKey}" does not match any RETIRED_MANIFEST_KEY_PATTERNS (installer will not clean it up on update)`,
        );
      }
    }
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
  // Import constants from compiled install core (post-v2: only takt pin is checked).
  const constants = await import(join(repoRoot, "installer", "dist", "install.js"));

  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const versionErrors = validateVersionConsistency(constants, rootPkg);
  allErrors.push(...versionErrors);

  // --- Retired cross-check: catalog RETIRED_WORKFLOWS ↔ installer RETIRED_MANIFEST_KEY_PATTERNS ---
  // Detects drift between the two retired-list definitions (req 6.3, design cross-check).
  const crossCheckErrors = validateRetiredCrossCheck();
  allErrors.push(...crossCheckErrors);

  // --- Documentation migration validation ---
  const docErrors = validateDocumentationMigration({
    readme: readFileSync(join(repoRoot, "README.md"), "utf8"),
    readmeJa: readFileSync(join(repoRoot, "README.ja.md"), "utf8"),
  });
  allErrors.push(...docErrors);

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
