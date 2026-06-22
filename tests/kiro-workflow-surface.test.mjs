import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { validateKiroWorkflowSurface } from "../scripts/validate-kiro-workflow-surface.mjs";

function makeFixture() {
  return mkdtempSync(join(tmpdir(), "kiro-workflow-surface-"));
}

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function copyCurrentSurfaceFixture() {
  const repoRoot = join(import.meta.dirname, "..");
  const root = makeFixture();
  for (const path of [
    "package.json",
    "CC-SDD-CODEX.md",
    "CC-SDD-CLAUDE.md",
    "COMMON.md",
    "installer/src/install.ts",
    "scripts/kiro-staged.mjs",
  ]) {
    writeFixtureFile(root, path, readFileSync(join(repoRoot, path), "utf8"));
  }
  for (const workflow of [
    "kiro-spec-init",
    "kiro-spec-requirements",
    "kiro-validate-gap",
    "kiro-spec-design",
    "kiro-validate-design",
    "kiro-spec-tasks",
    "kiro-spec-quick",
    "kiro-spec-status",
    "kiro-impl",
    "kiro-validate-impl",
  ]) {
    writeFixtureFile(root, `builtins/ja/workflows/${workflow}.yaml`, `name: ${workflow}\nsteps: []\n`);
  }
  return root;
}

test("current repository satisfies Kiro workflow surface validation", () => {
  const repoRoot = join(import.meta.dirname, "..");
  const result = validateKiroWorkflowSurface({ repoRoot });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("validation rejects Kiro script catalog drift and direct takt public scripts", () => {
  const root = copyCurrentSurfaceFixture();
  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  pkg.scripts["kiro:spec:quick"] = "takt --pipeline --skip-git -w kiro-spec-quick -t";
  delete pkg.scripts["kiro:spec:status"];
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes("KIRO_SCRIPT_VALUE_DRIFT") && failure.includes("kiro:spec:quick")));
  assert.ok(result.failures.some((failure) => failure.includes("KIRO_SCRIPT_SET_DRIFT") && failure.includes("kiro:spec:status")));
});

test("validation accepts staged public scripts for workflows not installed yet", () => {
  const root = copyCurrentSurfaceFixture();

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, true, result.failures.join("\n"));
});

// ---------------------------------------------------------------------------
// Negative cases: retired script absence enforcement (req 8.2 / SurfaceValidatorAlignment)
// ---------------------------------------------------------------------------

test("validation rejects cc-sdd:* scripts in package.json (absence enforcement)", () => {
  const root = copyCurrentSurfaceFixture();
  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  // Inject a retired cc-sdd script
  pkg.scripts["cc-sdd:full"] = "node scripts/takt.sh cc-sdd-full";
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false, "Expected failure when cc-sdd:* script present in package.json");
  assert.ok(
    result.failures.some((f) => f.includes("RETIRED_SCRIPT") && f.includes("cc-sdd:full")),
    `Expected RETIRED_SCRIPT failure for cc-sdd:full, got: ${result.failures.join("; ")}`,
  );
});

test("validation rejects opsx:* scripts in package.json (absence enforcement)", () => {
  const root = copyCurrentSurfaceFixture();
  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  // Inject a retired opsx script
  pkg.scripts["opsx:full"] = "node scripts/takt.sh opsx-full";
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false, "Expected failure when opsx:* script present in package.json");
  assert.ok(
    result.failures.some((f) => f.includes("RETIRED_SCRIPT") && f.includes("opsx:full")),
    `Expected RETIRED_SCRIPT failure for opsx:full, got: ${result.failures.join("; ")}`,
  );
});

test("validation rejects cc-sdd:* scripts in installer SDD_SCRIPTS (absence enforcement)", () => {
  const root = copyCurrentSurfaceFixture();
  // Inject cc-sdd:* into installer/src/install.ts SDD_SCRIPTS
  const installPath = join(root, "installer/src/install.ts");
  const original = readFileSync(installPath, "utf8");
  const injected = original.replace(
    /const SDD_SCRIPTS: Record<string, string> = \{/,
    'const SDD_SCRIPTS: Record<string, string> = {\n  "cc-sdd:full": "node scripts/takt.sh cc-sdd-full",',
  );
  writeFileSync(installPath, injected);

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false, "Expected failure when cc-sdd:* in installer SDD_SCRIPTS");
  assert.ok(
    result.failures.some((f) => f.includes("RETIRED_SCRIPT") && f.includes("cc-sdd")),
    `Expected RETIRED_SCRIPT failure for installer cc-sdd, got: ${result.failures.join("; ")}`,
  );
});

test("validation rejects retired workflow yaml in distribution asset path (absence enforcement)", () => {
  const root = copyCurrentSurfaceFixture();
  // Inject a retired cc-sdd workflow file
  writeFixtureFile(root, "builtins/ja/workflows/cc-sdd-full.yaml", "name: cc-sdd-full\nsteps: []\n");

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false, "Expected failure when retired cc-sdd workflow file present");
  assert.ok(
    result.failures.some((f) => f.includes("RETIRED_WORKFLOW_ASSET") && f.includes("cc-sdd-full")),
    `Expected RETIRED_WORKFLOW_ASSET failure, got: ${result.failures.join("; ")}`,
  );
});

test("validation rejects retired opsx workflow yaml in distribution asset path (absence enforcement)", () => {
  const root = copyCurrentSurfaceFixture();
  // Inject a retired opsx workflow file
  writeFixtureFile(root, "builtins/en/workflows/opsx-full.yaml", "name: opsx-full\nsteps: []\n");

  const result = validateKiroWorkflowSurface({ repoRoot: root });

  assert.equal(result.ok, false, "Expected failure when retired opsx workflow file present");
  assert.ok(
    result.failures.some((f) => f.includes("RETIRED_WORKFLOW_ASSET") && f.includes("opsx-full")),
    `Expected RETIRED_WORKFLOW_ASSET failure, got: ${result.failures.join("; ")}`,
  );
});
