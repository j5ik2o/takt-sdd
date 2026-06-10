import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  SUPPORTED_WORKFLOWS,
  EXCLUDED_WORKFLOWS,
  isSupportedWorkflow,
  isLegacyWorkflow,
  buildHelpText,
} from "../cli/command-catalog.mjs";

const repoRoot = join(import.meta.dirname, "..");

// (a) catalog has 17 entries, every entry has en+ja asset files on disk
test("SUPPORTED_WORKFLOWS has exactly 17 entries", () => {
  assert.equal(SUPPORTED_WORKFLOWS.length, 17, `Expected 17 entries but got ${SUPPORTED_WORKFLOWS.length}: ${SUPPORTED_WORKFLOWS.join(", ")}`);
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

// (b) bidirectional drift: every .takt/en/workflows/*.yaml basename is in SUPPORTED_WORKFLOWS ∪ EXCLUDED_WORKFLOWS
test("every .takt/en/workflows/*.yaml basename is in SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS (no unclassified assets)", () => {
  const enDir = join(repoRoot, ".takt", "en", "workflows");
  const allNames = readdirSync(enDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));

  const allClassified = new Set([
    ...SUPPORTED_WORKFLOWS,
    ...EXCLUDED_WORKFLOWS.legacy,
    ...EXCLUDED_WORKFLOWS.internal,
  ]);

  const unclassified = allNames.filter((name) => !allClassified.has(name));
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified workflow assets in .takt/en/workflows/: ${unclassified.join(", ")}. Add them to SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.`,
  );
});

test("every .takt/ja/workflows/*.yaml basename is in SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS (no unclassified assets)", async () => {
  const { readdirSync } = await import("node:fs");
  const jaDir = join(repoRoot, ".takt", "ja", "workflows");
  const allNames = readdirSync(jaDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => f.replace(/\.yaml$/, ""));

  const allClassified = new Set([
    ...SUPPORTED_WORKFLOWS,
    ...EXCLUDED_WORKFLOWS.legacy,
    ...EXCLUDED_WORKFLOWS.internal,
  ]);

  const unclassified = allNames.filter((name) => !allClassified.has(name));
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified workflow assets in .takt/ja/workflows/: ${unclassified.join(", ")}. Add them to SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.`,
  );
});

// (c) no cc-sdd- prefix in SUPPORTED_WORKFLOWS; isLegacyWorkflow and isSupportedWorkflow behavior
test("SUPPORTED_WORKFLOWS contains no cc-sdd- prefixed entries", () => {
  const ccSddEntries = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("cc-sdd-"));
  assert.deepEqual(ccSddEntries, [], `Found cc-sdd- entries in SUPPORTED_WORKFLOWS: ${ccSddEntries.join(", ")}`);
});

test("isLegacyWorkflow('cc-sdd-full') returns true", () => {
  assert.equal(isLegacyWorkflow("cc-sdd-full"), true);
});

test("isLegacyWorkflow('kiro-impl') returns false", () => {
  assert.equal(isLegacyWorkflow("kiro-impl"), false);
});

test("isSupportedWorkflow('kiro-impl') returns true", () => {
  assert.equal(isSupportedWorkflow("kiro-impl"), true);
});

test("isSupportedWorkflow('cc-sdd-full') returns false", () => {
  assert.equal(isSupportedWorkflow("cc-sdd-full"), false);
});

test("isSupportedWorkflow('opsx-full') returns true", () => {
  assert.equal(isSupportedWorkflow("opsx-full"), true);
});

test("isSupportedWorkflow('unknown-workflow') returns false", () => {
  assert.equal(isSupportedWorkflow("unknown-workflow"), false);
});

// (d) buildHelpText contains init, every supported workflow name, "run", global options, and no cc-sdd-* names
test("buildHelpText contains 'init'", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("init"), `buildHelpText output does not contain 'init'`);
});

test("buildHelpText contains every supported kiro-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const kiroWorkflows = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("kiro-"));
  const missing = kiroWorkflows.filter((name) => !text.includes(name));
  assert.deepEqual(missing, [], `buildHelpText missing kiro-* workflow names: ${missing.join(", ")}`);
});

test("buildHelpText contains every supported opsx-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const opsxWorkflows = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("opsx-"));
  const missing = opsxWorkflows.filter((name) => !text.includes(name));
  assert.deepEqual(missing, [], `buildHelpText missing opsx-* workflow names: ${missing.join(", ")}`);
});

test("buildHelpText contains 'run'", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("run"), `buildHelpText output does not contain 'run'`);
});

test("buildHelpText contains global options --cwd, --help, --version", () => {
  const text = buildHelpText("1.0.0");
  assert.ok(text.includes("--cwd"), `buildHelpText missing --cwd`);
  assert.ok(text.includes("--help"), `buildHelpText missing --help`);
  assert.ok(text.includes("--version"), `buildHelpText missing --version`);
});

test("buildHelpText contains the provided version string", () => {
  const text = buildHelpText("2.3.4");
  assert.ok(text.includes("2.3.4"), `buildHelpText does not include version '2.3.4'`);
});

test("buildHelpText does not contain any cc-sdd-* workflow name", () => {
  const text = buildHelpText("1.0.0");
  const ccSddNames = EXCLUDED_WORKFLOWS.legacy.filter((name) => name.startsWith("cc-sdd-"));
  const found = ccSddNames.filter((name) => text.includes(name));
  assert.deepEqual(found, [], `buildHelpText must not contain cc-sdd-* names, but found: ${found.join(", ")}`);
});
