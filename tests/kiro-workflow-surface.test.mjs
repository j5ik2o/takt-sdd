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
    writeFixtureFile(root, `.takt/ja/workflows/${workflow}.yaml`, `name: ${workflow}\nsteps: []\n`);
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
