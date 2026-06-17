import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { UsageError } from "../cli/init-adapter.mjs";
import {
  buildEjectHelpText,
  parseEjectArgs,
  resolveEjectTargetLanguages,
  runEject,
} from "../cli/eject-command.mjs";

function makeTmpDir() {
  return mkdtempSync(join(os.tmpdir(), "takt-sdd-eject-"));
}

function writeProjectConfig(projectRoot, lang) {
  const taktDir = join(projectRoot, ".takt");
  mkdirSync(taktDir, { recursive: true });
  writeFileSync(join(taktDir, "config.yaml"), `language: ${lang}\n`, "utf-8");
}

function assertUsageError(fn, messagePattern) {
  assert.throws(
    fn,
    (err) => err instanceof UsageError && messagePattern.test(err.message),
  );
}

test("buildEjectHelpText shows usage, options, and version", () => {
  const text = buildEjectHelpText("2.3.4");

  assert.ok(text.includes("takt-sdd 2.3.4"));
  assert.match(text, /Usage:/);
  assert.ok(text.includes("takt-sdd eject"));
  assert.ok(text.includes("--lang en|ja"));
  assert.ok(text.includes("--all-languages"));
  assert.ok(text.includes("--force"));
  assert.ok(text.includes("--dry-run"));
  assert.ok(text.includes("--help"));
});

test("parseEjectArgs detects help without requiring project state", () => {
  assert.deepEqual(parseEjectArgs(["--help"]), {
    help: true,
    languages: "resolved",
    force: false,
    dryRun: false,
  });
  assert.equal(parseEjectArgs(["-h"]).help, true);
});

test("parseEjectArgs defaults to resolved language and resolves it read-only", () => {
  const projectRoot = makeTmpDir();
  try {
    const options = parseEjectArgs([]);

    assert.deepEqual(options, {
      help: false,
      languages: "resolved",
      force: false,
      dryRun: false,
    });
    assert.deepEqual(resolveEjectTargetLanguages(options, projectRoot), ["en"]);
    assert.equal(existsSync(join(projectRoot, ".takt")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolveEjectTargetLanguages uses configured language when no language option is provided", () => {
  const projectRoot = makeTmpDir();
  try {
    writeProjectConfig(projectRoot, "ja");

    assert.deepEqual(
      resolveEjectTargetLanguages(parseEjectArgs([]), projectRoot),
      ["ja"],
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("parseEjectArgs accepts explicit language, force, and dry-run", () => {
  assert.deepEqual(parseEjectArgs(["--lang", "ja", "--force", "--dry-run"]), {
    help: false,
    languages: ["ja"],
    force: true,
    dryRun: true,
  });
});

test("parseEjectArgs accepts all languages", () => {
  const options = parseEjectArgs(["--all-languages"]);

  assert.deepEqual(options, {
    help: false,
    languages: ["en", "ja"],
    force: false,
    dryRun: false,
  });
  assert.deepEqual(resolveEjectTargetLanguages(options, "/unused/project"), ["en", "ja"]);
});

test("parseEjectArgs rejects invalid or missing language values", () => {
  assertUsageError(
    () => parseEjectArgs(["--lang", "fr"]),
    /--lang must be one of: en, ja/,
  );
  assertUsageError(
    () => parseEjectArgs(["--lang"]),
    /--lang requires a value/,
  );
});

test("parseEjectArgs rejects conflicting language options before writes", async () => {
  const projectRoot = makeTmpDir();
  try {
    assertUsageError(
      () => parseEjectArgs(["--lang", "ja", "--all-languages"]),
      /Cannot combine --lang with --all-languages/,
    );

    await assert.rejects(
      () => runEject(["--lang", "ja", "--all-languages"], {
        projectRoot,
        packageRoot: projectRoot,
      }),
      (err) =>
        err instanceof UsageError &&
        /Cannot combine --lang with --all-languages/.test(err.message),
    );
    assert.equal(existsSync(join(projectRoot, ".takt")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("parseEjectArgs rejects unknown options and positional arguments", () => {
  assertUsageError(
    () => parseEjectArgs(["--bogus"]),
    /Unknown option: --bogus/,
  );
  assertUsageError(
    () => parseEjectArgs(["target-dir"]),
    /Unexpected argument: target-dir/,
  );
});
