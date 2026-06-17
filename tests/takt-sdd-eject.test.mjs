import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";
import { UsageError } from "../cli/init-adapter.mjs";
import {
  buildEjectPlan,
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

function writePackageAsset(packageRoot, lang, section, relativePath, content) {
  const assetPath = join(packageRoot, ".takt", lang, section, relativePath);
  mkdirSync(dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, content, "utf-8");
  return assetPath;
}

function writeProjectAsset(projectRoot, lang, section, relativePath, content) {
  const assetPath = join(projectRoot, ".takt", lang, section, relativePath);
  mkdirSync(dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, content, "utf-8");
  return assetPath;
}

function assertUsageError(fn, messagePattern) {
  assert.throws(
    fn,
    (err) => err instanceof UsageError && messagePattern.test(err.message),
  );
}

function actionByRelativePath(plan) {
  return new Map(plan.items.map((item) => [item.relativePath, item.action]));
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

test("buildEjectPlan classifies package workflows and facets without non-asset files", () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new workflow\n");
    writePackageAsset(packageRoot, "en", "facets", "shared.md", "same facet\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream facet\n");
    writePackageAsset(packageRoot, "en", "facets", "nested/deep.md", "nested facet\n");
    writeFileSync(join(packageRoot, "package.json"), "{}\n", "utf-8");
    writeFileSync(join(packageRoot, ".takt", "config.yaml"), "language: en\n", "utf-8");
    writeFileSync(join(packageRoot, ".takt", ".manifest.json"), "{}\n", "utf-8");
    mkdirSync(join(packageRoot, "scripts"), { recursive: true });
    writeFileSync(join(packageRoot, "scripts", "kiro-staged.mjs"), "script\n", "utf-8");
    mkdirSync(join(packageRoot, ".takt", "en", "metadata"), { recursive: true });
    writeFileSync(join(packageRoot, ".takt", "en", "metadata", "ignored.json"), "{}\n", "utf-8");

    writeProjectAsset(projectRoot, "en", "facets", "shared.md", "same facet\n");
    const changedTarget = writeProjectAsset(
      projectRoot,
      "en",
      "facets",
      "changed.md",
      "project facet\n",
    );
    const extraProjectFile = writeProjectAsset(
      projectRoot,
      "en",
      "workflows",
      "project-only.yaml",
      "project only\n",
    );
    writeProjectConfig(projectRoot, "en");
    writeFileSync(join(projectRoot, ".takt", ".manifest.json"), "{}\n", "utf-8");
    mkdirSync(join(projectRoot, "scripts"), { recursive: true });
    writeFileSync(join(projectRoot, "scripts", "kiro-staged.mjs"), "project script\n", "utf-8");
    writeFileSync(join(projectRoot, "package.json"), "{}\n", "utf-8");

    const plan = buildEjectPlan(
      { projectRoot, packageRoot },
      parseEjectArgs(["--lang", "en"]),
    );

    assert.deepEqual(actionByRelativePath(plan), new Map([
      [".takt/en/facets/changed.md", "collision"],
      [".takt/en/facets/nested/deep.md", "copy"],
      [".takt/en/facets/shared.md", "skip"],
      [".takt/en/workflows/new.yaml", "copy"],
    ]));
    assert.deepEqual(
      plan.collisions.map((item) => item.relativePath),
      [".takt/en/facets/changed.md"],
    );
    assert.equal(existsSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml")), false);
    assert.equal(readFileSync(changedTarget, "utf-8"), "project facet\n");
    assert.equal(readFileSync(extraProjectFile, "utf-8"), "project only\n");
    assert.equal(readFileSync(join(projectRoot, "scripts", "kiro-staged.mjs"), "utf-8"), "project script\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("buildEjectPlan classifies differing targets as overwrite when force is set", () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "kiro-impl.yaml", "upstream\n");
    writeProjectAsset(projectRoot, "en", "workflows", "kiro-impl.yaml", "project\n");

    const plan = buildEjectPlan(
      { projectRoot, packageRoot },
      parseEjectArgs(["--lang", "en", "--force"]),
    );

    assert.deepEqual(actionByRelativePath(plan), new Map([
      [".takt/en/workflows/kiro-impl.yaml", "overwrite"],
    ]));
    assert.deepEqual(plan.collisions, []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("buildEjectPlan uses the resolved language when no language option is provided", () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writeProjectConfig(projectRoot, "ja");
    writePackageAsset(packageRoot, "en", "workflows", "kiro-impl.yaml", "english\n");
    writePackageAsset(packageRoot, "ja", "workflows", "kiro-impl.yaml", "japanese\n");

    const plan = buildEjectPlan({ projectRoot, packageRoot }, parseEjectArgs([]));

    assert.deepEqual(
      plan.items.map((item) => item.relativePath),
      [".takt/ja/workflows/kiro-impl.yaml"],
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});
