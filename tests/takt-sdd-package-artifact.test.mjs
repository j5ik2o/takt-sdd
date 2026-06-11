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
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Import the exported validator functions
const { validateFileList, validateVersionConsistency } = await import(
  "../scripts/validate-package-artifact.mjs"
);

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
  "cli/workflow-runner.mjs",
  "scripts/kiro-staged.mjs",
  "installer/dist/install.js",
  "installer/dist/i18n.js",
  "installer/package.json",
  // All catalog workflow yamls — en and ja for every entry (30 x 2 = 60 files)
  ...ALL_CATALOG_WORKFLOWS.map((name) => `.takt/en/workflows/${name}.yaml`),
  ...ALL_CATALOG_WORKFLOWS.map((name) => `.takt/ja/workflows/${name}.yaml`),
  // facet assets — at least one per language
  ".takt/en/facets/instructions/kiro-discovery.md",
  ".takt/ja/facets/instructions/kiro-discovery.md",
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

test("validateFileList: no .takt/en/workflows files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith(".takt/en/workflows/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes(".takt/en/workflows")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no .takt/ja/workflows files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith(".takt/ja/workflows/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes(".takt/ja/workflows")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no .takt/en/facets files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith(".takt/en/facets/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes(".takt/en/facets")),
    `Errors: ${errors.join("; ")}`,
  );
});

test("validateFileList: no .takt/ja/facets files is reported", () => {
  const files = MINIMAL_VALID_FILES.filter((f) => !f.startsWith(".takt/ja/facets/"));
  const errors = validateFileList(files);
  assert.ok(
    errors.some((e) => e.includes(".takt/ja/facets")),
    `Errors: ${errors.join("; ")}`,
  );
});

// ---------------------------------------------------------------------------
// validateFileList — catalog-driven workflow checks (FINDING 2)
// ---------------------------------------------------------------------------

test("validateFileList: missing .takt/en/workflows/kiro-spec-design.yaml is reported", () => {
  const files = MINIMAL_VALID_FILES.filter(
    (f) => f !== ".takt/en/workflows/kiro-spec-design.yaml",
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
