/**
 * tests/takt-sdd-package-artifact.test.mjs
 *
 * Tests for the PackageArtifactValidator (scripts/validate-package-artifact.mjs).
 *
 * Coverage:
 * - Unit tests on exported validateFileList() and validateVersionConsistency()
 *   with synthetic file lists and package objects (fast, no real npm pack).
 * - Negative cases: forbidden files must be detected; missing required files must be reported.
 * - One integration test: run the real validator against the repo (requires installer/dist).
 *
 * Requirements covered: 7.1, 7.2, 7.4, 7.5, 8.5
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Import the exported validator functions
const packageArtifactValidator = await import("../scripts/validate-package-artifact.mjs");
const {
  validateFileList,
  validateVersionConsistency,
  validateDocumentationMigration,
} = packageArtifactValidator;

// Import catalog constants to build the minimal valid file set programmatically.
// This ensures MINIMAL_VALID_FILES stays aligned with ALL_CATALOG_WORKFLOWS.
const { SUPPORTED_WORKFLOWS, EXCLUDED_WORKFLOWS } = await import(
  "../cli/command-catalog.mjs"
);
// ALL_CATALOG_WORKFLOWS = SUPPORTED ∪ EXCLUDED.internal (15 entries after retirement).
// RETIRED_WORKFLOWS are NOT included — they must not appear in the package artifact.
const ALL_CATALOG_WORKFLOWS = [
  ...SUPPORTED_WORKFLOWS,
  ...EXCLUDED_WORKFLOWS.internal,
];

// ---------------------------------------------------------------------------
// Minimal valid file set (mirrors what npm pack --dry-run --json produces for
// the actual repo). Used as a baseline to add/remove entries in each test.
// ---------------------------------------------------------------------------
// LICENSE-MIT and LICENSE-APACHE are now in the package.json files allowlist
// (task 2 remediation, commit 4c6901a) and therefore appear in npm pack output.
// They are hard-required by the design (LICENSE-*) and validated as such.
//
// Workflow yamls are built from ALL_CATALOG_WORKFLOWS to stay in sync with the
// catalog (15 workflows x 2 languages = 30 entries after retirement of cc-sdd/opsx).
const MINIMAL_VALID_FILES = [
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
  // All catalog workflow yamls — en and ja for every entry (30 x 2 = 60 files)
  ...ALL_CATALOG_WORKFLOWS.map((name) => `builtins/en/workflows/${name}.yaml`),
  ...ALL_CATALOG_WORKFLOWS.map((name) => `builtins/ja/workflows/${name}.yaml`),
  // facet assets — at least one per language
  "builtins/en/facets/instructions/kiro-discovery.md",
  "builtins/ja/facets/instructions/kiro-discovery.md",
];

// ---------------------------------------------------------------------------
// validateFileList — positive (all-required present, no forbidden)
// ---------------------------------------------------------------------------
test("validateFileList: minimal valid file set passes with no errors", () => {
  const errors = validateFileList(MINIMAL_VALID_FILES);
  assert.deepEqual(errors, [], `Expected no errors but got: ${errors.join("; ")}`);
});

// ---------------------------------------------------------------------------
// validateFileList — missing required files
// ---------------------------------------------------------------------------
test("validateFileList: missing bin/takt-sdd.mjs is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "bin/takt-sdd.mjs");
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected an error for missing bin/takt-sdd.mjs");
  assert.ok(
    errors.some((e) => e.includes("bin/takt-sdd.mjs")),
    `Expected error mentioning bin/takt-sdd.mjs, got: ${errors.join("; ")}`,
  );
});

test("validateFileList: missing cli/main.mjs is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "cli/main.mjs");
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes("cli/main.mjs")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: missing cli/asset-resolution.mjs is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "cli/asset-resolution.mjs");
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("cli/asset-resolution.mjs")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: missing cli/eject-command.mjs is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "cli/eject-command.mjs");
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("cli/eject-command.mjs")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: missing scripts/kiro-staged.mjs is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "scripts/kiro-staged.mjs");
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes("kiro-staged.mjs")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: missing installer/dist/install.js is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "installer/dist/install.js");
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("installer/dist/install.js")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: missing README.md is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "README.md");
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => /README\.md/i.test(e)), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: missing COMMON.md is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "COMMON.md");
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes("COMMON.md")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: missing LICENSE-MIT is reported as a hard error", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "LICENSE-MIT");
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected an error for missing LICENSE-MIT");
  assert.ok(
    errors.some((e) => e.includes("LICENSE-MIT")),
    `Expected error mentioning LICENSE-MIT, got: ${errors.join("; ")}`,
  );
});

test("validateFileList: missing LICENSE-APACHE is reported as a hard error", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => f !== "LICENSE-APACHE");
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected an error for missing LICENSE-APACHE");
  assert.ok(
    errors.some((e) => e.includes("LICENSE-APACHE")),
    `Expected error mentioning LICENSE-APACHE, got: ${errors.join("; ")}`,
  );
});

test("validateFileList: no builtins/en/workflows files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith("builtins/en/workflows/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("builtins/en/workflows")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no builtins/ja/workflows files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith("builtins/ja/workflows/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("builtins/ja/workflows")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no builtins/en/facets files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith("builtins/en/facets/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("builtins/en/facets")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no builtins/ja/facets files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith("builtins/ja/facets/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("builtins/ja/facets")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// validateFileList — catalog-driven workflow checks (FINDING 2)
// ---------------------------------------------------------------------------

test("validateFileList: missing builtins/en/workflows/kiro-spec-design.yaml is reported", () => {
  const files = MINIMAL_VALID_FILES.filter(
    (f) => f !== "builtins/en/workflows/kiro-spec-design.yaml",
  );
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected error for missing kiro-spec-design en yaml");
  assert.ok(
    errors.some((e) => e.includes("kiro-spec-design") && e.includes("en")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// validateFileList — forbidden patterns (NEGATIVE CASES)
// Each class of forbidden file must be detected independently.
// ---------------------------------------------------------------------------

test("validateFileList: .takt/config.yaml in files is forbidden (repo config)", () => {
  const files = [...MINIMAL_VALID_FILES, ".takt/config.yaml"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error");
  assert.ok(
    errors.some((e) => e.includes(".takt/config.yaml")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .takt/runs/x.json in files is forbidden (runtime state)", () => {
  const files = [...MINIMAL_VALID_FILES, ".takt/runs/x.json"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error");
  assert.ok(
    errors.some((e) => e.includes(".takt/runs/")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .takt/session-state.json in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".takt/session-state.json"];
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("session-state.json")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .takt/persona_sessions.json in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".takt/persona_sessions.json"];
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("persona_sessions.json")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .env.local in files is forbidden (credentials class)", () => {
  const files = [...MINIMAL_VALID_FILES, ".env.local"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for .env.local");
  assert.ok(
    errors.some((e) => e.includes(".env.local")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: tests/foo.test.mjs in files is forbidden (test leakage)", () => {
  const files = [...MINIMAL_VALID_FILES, "tests/foo.test.mjs"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for tests/");
  assert.ok(
    errors.some((e) => e.includes("tests/")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: installer/src/install.ts in files is forbidden (source leakage)", () => {
  const files = [...MINIMAL_VALID_FILES, "installer/src/install.ts"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for installer/src/");
  assert.ok(
    errors.some((e) => e.includes("installer/src/")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: aws-credentials.json in files is forbidden (credential name)", () => {
  const files = [...MINIMAL_VALID_FILES, "aws-credentials.json"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for credential file");
  assert.ok(
    errors.some((e) => /credential|aws-credentials/i.test(e)),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: scripts/validate-package-artifact.mjs itself is forbidden (scripts/ except kiro-staged)", () => {
  // scripts/ directory other than scripts/kiro-staged.mjs should be forbidden
  const files = [...MINIMAL_VALID_FILES, "scripts/validate-package-artifact.mjs"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for scripts/ non-kiro-staged");
  assert.ok(
    errors.some((e) => e.includes("scripts/validate-package-artifact.mjs")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .kiro/specs/foo.md in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".kiro/specs/foo.md"];
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes(".kiro/")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: .github/workflows/ci.yml in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".github/workflows/ci.yml"];
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes(".github/")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: app.log in files is forbidden (log files)", () => {
  const files = [...MINIMAL_VALID_FILES, "app.log"];
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => e.includes("app.log")), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: my-secret-key.txt in files is forbidden (secret name)", () => {
  const files = [...MINIMAL_VALID_FILES, "my-secret-key.txt"];
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => /secret/i.test(e)), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: api_token.json in files is forbidden (token name)", () => {
  const files = [...MINIMAL_VALID_FILES, "api_token.json"];
  const errors = validateFileList(files);
  assert.ok(errors.some((e) => /token/i.test(e)), `Errors: ${errors.join("; ")}`);
});

test("validateFileList: installer/dist/something.test.js is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, "installer/dist/something.test.js"];
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes("installer/dist/") && e.includes(".test.js")),
    `Errors: ${errors.join("; ")}`,
  );
});

// FINDING 1 fixes: .claude/** and .agents/** forbidden patterns must be tested.
test("validateFileList: .claude/settings.json in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".claude/settings.json"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error");
  assert.ok(
    errors.some((e) => e.includes(".claude/")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: .agents/skills/foo.md in files is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".agents/skills/foo.md"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error");
  assert.ok(
    errors.some((e) => e.includes(".agents/")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// validateVersionConsistency — positive
// ---------------------------------------------------------------------------
test("validateVersionConsistency: exact takt version passes", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "0.43.0" } },
  );
  assert.deepEqual(errors, [], `Unexpected errors: ${errors.join("; ")}`);
});

// ---------------------------------------------------------------------------
// validateVersionConsistency — negative cases (takt exact-pin only; OPENSPEC/CC_SDD removed in v2)
// ---------------------------------------------------------------------------
test("validateVersionConsistency: takt floating version ^0.43.0 is rejected", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "^0.43.0" } },
  );
  assert.ok(errors.length > 0, "Expected error for floating takt version");
  assert.ok(
    errors.some((e) => /takt.*floating|takt.*exact|floating.*takt/i.test(e) || e.includes("takt")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateVersionConsistency: takt latest is rejected as floating", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "latest" } },
  );
  assert.ok(errors.length > 0, "Expected error for takt: latest");
  assert.ok(errors.some((e) => e.includes("takt")), `Errors: ${errors.join("; ")}`);
});

test("validateVersionConsistency: takt ~0.43.0 is rejected as floating", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "~0.43.0" } },
  );
  assert.ok(errors.length > 0, "Expected error for takt: ~0.43.0");
});

test("validateVersionConsistency: missing takt is reported", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: {} },
  );
  assert.ok(errors.length > 0, "Expected error for missing takt");
  assert.ok(errors.some((e) => e.includes("takt")), `Errors: ${errors.join("; ")}`);
});

// ---------------------------------------------------------------------------
// Negative cases: retired workflow files must be forbidden (req 6.3)
// ---------------------------------------------------------------------------

test("validateFileList: cc-sdd-full.yaml in builtins/en/workflows is forbidden (retired workflow)", () => {
  const files = [...MINIMAL_VALID_FILES, "builtins/en/workflows/cc-sdd-full.yaml"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for retired cc-sdd workflow");
  assert.ok(
    errors.some((e) => e.includes("cc-sdd-full.yaml") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: opsx-full.yaml in builtins/ja/workflows is forbidden (retired workflow)", () => {
  const files = [...MINIMAL_VALID_FILES, "builtins/ja/workflows/opsx-full.yaml"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for retired opsx workflow");
  assert.ok(
    errors.some((e) => e.includes("opsx-full.yaml") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: old .takt language asset layout is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, ".takt/en/workflows/kiro-impl.yaml"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for old .takt asset layout");
  assert.ok(
    errors.some((e) => e.includes(".takt/en/workflows/kiro-impl.yaml") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: retired cc-sdd-* facet is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, "builtins/en/facets/instructions/cc-sdd-impl.md"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for cc-sdd facet");
  assert.ok(
    errors.some((e) => e.includes("cc-sdd-impl.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: retired opsx-* facet is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, "builtins/en/facets/personas/opsx-implementer.md"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for opsx facet");
  assert.ok(
    errors.some((e) => e.includes("opsx-implementer.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: neutral-basename file nested under retired-prefixed facet dir is forbidden", () => {
  // v1.x shipped e.g. facets/knowledge/cc-sdd-steering-template-files/product.md —
  // the retired prefix is on the directory, not the filename (req 6.3).
  const files = [
    ...MINIMAL_VALID_FILES,
    "builtins/en/facets/knowledge/cc-sdd-steering-template-files/product.md",
  ];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for nested retired-dir facet");
  assert.ok(
    errors.some((e) => e.includes("cc-sdd-steering-template-files/product.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: nested file under opsx-prefixed facet dir is forbidden (ja)", () => {
  const files = [
    ...MINIMAL_VALID_FILES,
    "builtins/ja/facets/templates/opsx-proposal-files/outline.md",
  ];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for nested opsx-dir facet");
  assert.ok(
    errors.some((e) => e.includes("opsx-proposal-files/outline.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: retired exclusive facet (ai-review-fix-loop-judge.md) is forbidden", () => {
  // This facet had no cc-sdd/opsx prefix but was exclusively used by retired workflows
  const files = [...MINIMAL_VALID_FILES, "builtins/en/facets/instructions/ai-review-fix-loop-judge.md"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for retired-exclusive facet");
  assert.ok(
    errors.some((e) => e.includes("ai-review-fix-loop-judge.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: retired exclusive facet (batch-plan-implement-loop-judge.md) is forbidden", () => {
  const files = [...MINIMAL_VALID_FILES, "builtins/en/facets/instructions/batch-plan-implement-loop-judge.md"];
  const errors = validateFileList(files);
  assert.ok(errors.length > 0, "Expected forbidden file error for retired-exclusive facet");
  assert.ok(
    errors.some((e) => e.includes("batch-plan-implement-loop-judge.md") && e.includes("FORBIDDEN")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// Negative cases: banned dependency declarations (req 6.2)
// ---------------------------------------------------------------------------

test("validateVersionConsistency: @fission-ai/openspec in dependencies is rejected", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "0.43.0", "@fission-ai/openspec": "1.0.0" } },
  );
  assert.ok(errors.length > 0, "Expected error for @fission-ai/openspec in deps");
  assert.ok(
    errors.some((e) => e.includes("@fission-ai/openspec")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateVersionConsistency: cc-sdd in dependencies is rejected", () => {
  const errors = validateVersionConsistency(
    {},
    { dependencies: { takt: "0.43.0", "cc-sdd": "1.0.0" } },
  );
  assert.ok(errors.length > 0, "Expected error for cc-sdd in deps");
  assert.ok(
    errors.some((e) => e.includes("cc-sdd")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// Cross-check: RETIRED_WORKFLOWS catalog ↔ RETIRED_MANIFEST_KEY_PATTERNS (req 6.3 design cross-check)
// ---------------------------------------------------------------------------

const { validateRetiredCrossCheck } = await import(
  "../scripts/validate-package-artifact.mjs"
);

test("validateRetiredCrossCheck: all RETIRED catalog names match at least one installer pattern", () => {
  const errors = validateRetiredCrossCheck();
  // All retired workflow names should be covered by installer patterns
  const coverageErrors = errors.filter((e) => e.includes("RETIRED_CROSSCHECK") && e.includes("NOT_COVERED"));
  assert.deepEqual(coverageErrors, [], `Cross-check coverage errors: ${coverageErrors.join("; ")}`);
});

test("validateRetiredCrossCheck: kiro and internal workflow names do NOT match installer patterns", () => {
  const errors = validateRetiredCrossCheck();
  // No kiro/internal name should accidentally match retired patterns
  const falsePositiveErrors = errors.filter((e) => e.includes("RETIRED_CROSSCHECK") && e.includes("FALSE_POSITIVE"));
  assert.deepEqual(falsePositiveErrors, [], `Cross-check false positives: ${falsePositiveErrors.join("; ")}`);
});

// ---------------------------------------------------------------------------
// Wiring test: validateRetiredCrossCheck() must be called in main() guard
// ---------------------------------------------------------------------------
// Rationale: validateRetiredCrossCheck() is an exported function that could
// silently become a test-only utility if its call is dropped from the main()
// execution block.  This source-level assertion catches that regression without
// requiring a complex fixture that manipulates module-internal constants.
// This matches the existing suite pattern (integration via spawnSync for the
// clean path; source assertion for structural wiring).
test("main() guard calls validateRetiredCrossCheck (wiring assertion)", () => {
  const validatorSrc = readFileSync(
    join(repoRoot, "scripts", "validate-package-artifact.mjs"),
    "utf8",
  );
  // Find the main guard block (after `if (process.argv[1] === fileURLToPath(...))`).
  const mainGuardStart = validatorSrc.indexOf("if (process.argv[1] === fileURLToPath(import.meta.url))");
  assert.ok(mainGuardStart !== -1, "Could not locate main() guard in validator source");
  const mainGuardBody = validatorSrc.slice(mainGuardStart);
  assert.ok(
    mainGuardBody.includes("validateRetiredCrossCheck()"),
    "main() guard must call validateRetiredCrossCheck() — it was found as export-only (not called at runtime)",
  );
});

test("main() guard calls validateDocumentationMigration (wiring assertion)", () => {
  const validatorSrc = readFileSync(
    join(repoRoot, "scripts", "validate-package-artifact.mjs"),
    "utf8",
  );
  const mainGuardStart = validatorSrc.indexOf("if (process.argv[1] === fileURLToPath(import.meta.url))");
  assert.ok(mainGuardStart !== -1, "Could not locate main() guard in validator source");
  const mainGuardBody = validatorSrc.slice(mainGuardStart);
  assert.ok(
    mainGuardBody.includes("validateDocumentationMigration("),
    "main() guard must call validateDocumentationMigration() so migration guidance regressions fail package validation",
  );
});

// ---------------------------------------------------------------------------
// Documentation migration regression checks
// ---------------------------------------------------------------------------
test("validateDocumentationMigration: actual README files contain no-copy migration guidance", () => {
  assert.equal(typeof validateDocumentationMigration, "function");
  const errors = validateDocumentationMigration({
    readme: readFileSync(join(repoRoot, "README.md"), "utf8"),
    readmeJa: readFileSync(join(repoRoot, "README.ja.md"), "utf8"),
    changelog: readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8"),
  });
  assert.deepEqual(errors, [], `Documentation migration errors: ${errors.join("; ")}`);
});

test("validateDocumentationMigration: missing README manual script example is reported", () => {
  assert.equal(typeof validateDocumentationMigration, "function");
  const docs = {
    readme: [
      "Package-bundled workflows/facets run from the installed package.",
      "Use takt-sdd eject for customization.",
      "takt-sdd init and create-takt-sdd are retired guidance-only commands.",
      "BREAKING BEHAVIOR CHANGE.",
    ].join("\n"),
    readmeJa: [
      "package bundled workflows/facets は installed package から実行されます。",
      "カスタマイズには takt-sdd eject を使います。",
      "takt-sdd init と create-takt-sdd は retired guidance only です。",
      "BREAKING BEHAVIOR CHANGE です。",
      "\"kiro:impl\": \"takt-sdd kiro-impl\"",
    ].join("\n"),
    changelog: [
      "## [2.2.0]",
      "### Features",
      "* **no-copy-bundled-assets-eject:** run bundled workflows without init",
      "* **no-copy-bundled-assets-eject:** wire eject into cli dispatch",
    ].join("\n"),
  };
  const errors = validateDocumentationMigration(docs);
  assert.ok(
    errors.some((e) => e.includes("README.md") && e.includes("manual npm script")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateDocumentationMigration: release-generated CHANGELOG prose is not a package gate", () => {
  assert.equal(typeof validateDocumentationMigration, "function");
  const docs = {
    readme: [
      "Package-bundled workflows/facets run from the installed package.",
      "Use takt-sdd eject for customization.",
      "takt-sdd init and create-takt-sdd are retired guidance-only commands.",
      "\"kiro:impl\": \"takt-sdd kiro-impl\"",
      "BREAKING BEHAVIOR CHANGE.",
    ].join("\n"),
    readmeJa: [
      "package bundled workflows/facets は installed package から実行されます。",
      "カスタマイズには takt-sdd eject を使います。",
      "takt-sdd init と create-takt-sdd は retired guidance only です。",
      "\"kiro:impl\": \"takt-sdd kiro-impl\"",
      "BREAKING BEHAVIOR CHANGE です。",
    ].join("\n"),
    changelog: [
      "## [2.2.0]",
      "### Features",
      "* **no-copy-bundled-assets-eject:** run bundled workflows without init",
      "* **no-copy-bundled-assets-eject:** wire eject into cli dispatch",
    ].join("\n"),
  };
  assert.deepEqual(validateDocumentationMigration(docs), []);
});

test("validateDocumentationMigration: missing README breaking behavior is reported", () => {
  assert.equal(typeof validateDocumentationMigration, "function");
  const docs = {
    readme: [
      "Package-bundled workflows/facets run from the installed package.",
      "Use takt-sdd eject for customization.",
      "takt-sdd init and create-takt-sdd are retired guidance-only commands.",
      "\"kiro:impl\": \"takt-sdd kiro-impl\"",
    ].join("\n"),
    readmeJa: [
      "package bundled workflows/facets は installed package から実行されます。",
      "カスタマイズには takt-sdd eject を使います。",
      "takt-sdd init と create-takt-sdd は retired guidance only です。",
      "\"kiro:impl\": \"takt-sdd kiro-impl\"",
      "BREAKING BEHAVIOR CHANGE です。",
    ].join("\n"),
    changelog: "Maintenance release.",
  };
  const errors = validateDocumentationMigration(docs);
  assert.ok(
    errors.some((e) => e.includes("README.md") && e.includes("BREAKING BEHAVIOR CHANGE")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// Bin smoke: retired copy surface must not come back through published bins
// ---------------------------------------------------------------------------
test("bin smoke: takt-sdd init returns retired no-write guidance", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "takt-sdd-init-retired-"));
  const result = spawnSync(process.execPath, [
    join(repoRoot, "bin", "takt-sdd.mjs"),
    "--cwd",
    projectRoot,
    "init",
    "--force",
    "--lang",
    "ja",
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000,
  });

  assert.equal(result.status, 1, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  assert.match(result.stderr, /init.*retired|no longer needed|eject/i);
  assert.equal(existsSync(join(projectRoot, ".takt")), false, "init must not create .takt");
  assert.equal(existsSync(join(projectRoot, "package.json")), false, "init must not create package.json");
  assert.equal(existsSync(join(projectRoot, "scripts", "kiro-staged.mjs")), false, "init must not create scripts/kiro-staged.mjs");
});

test("bin smoke: create-takt-sdd returns retired no-write guidance", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "create-takt-sdd-retired-"));
  const result = spawnSync(process.execPath, [
    join(repoRoot, "installer", "dist", "cli.js"),
    "--force",
    "--lang",
    "ja",
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000,
  });

  assert.equal(result.status, 1, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  assert.match(result.stderr, /create-takt-sdd.*retired|廃止済み|eject/i);
  assert.equal(existsSync(join(projectRoot, ".takt")), false, "create-takt-sdd must not create .takt");
  assert.equal(existsSync(join(projectRoot, "package.json")), false, "create-takt-sdd must not create package.json");
  assert.equal(existsSync(join(projectRoot, "scripts", "kiro-staged.mjs")), false, "create-takt-sdd must not create scripts/kiro-staged.mjs");
});

// ---------------------------------------------------------------------------
// Integration test: run the real validator against the actual repo
// ---------------------------------------------------------------------------
test("integration: node scripts/validate-package-artifact.mjs exits 0 on actual repo", () => {
  const validatorPath = join(repoRoot, "scripts", "validate-package-artifact.mjs");
  const result = spawnSync(process.execPath, [validatorPath], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(
    result.status,
    0,
    `validator exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
  );
});
