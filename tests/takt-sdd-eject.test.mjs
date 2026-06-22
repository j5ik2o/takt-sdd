import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
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
  const assetPath = join(packageRoot, "builtins", lang, section, relativePath);
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

function snapshotProjectFiles(projectRoot) {
  const snapshot = new Map();

  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = join(dir, entry.name);
      const relativePath = relative(projectRoot, entryPath).replaceAll("\\", "/");

      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        snapshot.set(relativePath, readFileSync(entryPath, "utf-8"));
      }
    }
  };

  if (statSync(projectRoot).isDirectory()) {
    walk(projectRoot);
  }

  return snapshot;
}

async function captureStdout(fn) {
  const chunks = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = function write(chunk, encoding, callback) {
    chunks.push(String(chunk));
    if (typeof encoding === "function") encoding();
    if (typeof callback === "function") callback();
    return true;
  };

  try {
    const result = await fn();
    return { result, stdout: chunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
  }
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
    mkdirSync(join(packageRoot, ".takt"), { recursive: true });
    writeFileSync(join(packageRoot, ".takt", "config.yaml"), "language: en\n", "utf-8");
    writeFileSync(join(packageRoot, ".takt", ".manifest.json"), "{}\n", "utf-8");
    mkdirSync(join(packageRoot, "scripts"), { recursive: true });
    writeFileSync(join(packageRoot, "scripts", "kiro-staged.mjs"), "script\n", "utf-8");
    mkdirSync(join(packageRoot, "builtins", "en", "metadata"), { recursive: true });
    writeFileSync(join(packageRoot, "builtins", "en", "metadata", "ignored.json"), "{}\n", "utf-8");

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
    mkdirSync(join(packageRoot, "builtins", "en", "facets"), { recursive: true });
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

test("buildEjectPlan rejects missing bundled asset sections", () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "kiro-impl.yaml", "workflow\n");

    assertUsageError(
      () => buildEjectPlan(
        { projectRoot, packageRoot },
        parseEjectArgs(["--lang", "en"]),
      ),
      /Bundled asset directory is missing/,
    );
    assert.equal(existsSync(join(projectRoot, ".takt")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("buildEjectPlan treats directory targets as collisions even with force", () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    mkdirSync(join(packageRoot, "builtins", "en", "workflows"), { recursive: true });
    writePackageAsset(packageRoot, "en", "facets", "blocked.md", "upstream\n");
    mkdirSync(join(projectRoot, ".takt", "en", "facets", "blocked.md"), {
      recursive: true,
    });

    const plan = buildEjectPlan(
      { projectRoot, packageRoot },
      parseEjectArgs(["--lang", "en", "--force"]),
    );

    assert.deepEqual(actionByRelativePath(plan), new Map([
      [".takt/en/facets/blocked.md", "collision"],
    ]));
    assert.deepEqual(
      plan.collisions.map((item) => item.relativePath),
      [".takt/en/facets/blocked.md"],
    );
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
    mkdirSync(join(packageRoot, "builtins", "ja", "facets"), { recursive: true });

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

test("runEject dry-run reports copy, no-op, and collisions without writing files", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new\n");
    writePackageAsset(packageRoot, "en", "facets", "same.md", "same\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream\n");
    writeProjectAsset(projectRoot, "en", "facets", "same.md", "same\n");
    const changedTarget = writeProjectAsset(
      projectRoot,
      "en",
      "facets",
      "changed.md",
      "project\n",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en", "--dry-run"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 1);
    assert.match(stdout, /Dry run/i);
    assert.match(stdout, /copy/i);
    assert.match(stdout, /skip|no-op/i);
    assert.match(stdout, /collision/i);
    assert.match(stdout, /\.takt\/en\/workflows\/new\.yaml/);
    assert.match(stdout, /\.takt\/en\/facets\/same\.md/);
    assert.match(stdout, /\.takt\/en\/facets\/changed\.md/);
    assert.equal(existsSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml")), false);
    assert.equal(readFileSync(changedTarget, "utf-8"), "project\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject dry-run force reports overwrites and does not write files", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream\n");
    const changedTarget = writeProjectAsset(
      projectRoot,
      "en",
      "facets",
      "changed.md",
      "project\n",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en", "--dry-run", "--force"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.match(stdout, /Dry run/i);
    assert.match(stdout, /copy/i);
    assert.match(stdout, /overwrite/i);
    assert.match(stdout, /\.takt\/en\/workflows\/new\.yaml/);
    assert.match(stdout, /\.takt\/en\/facets\/changed\.md/);
    assert.equal(existsSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml")), false);
    assert.equal(readFileSync(changedTarget, "utf-8"), "project\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject refuses collisions without force before any writes", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream\n");
    const changedTarget = writeProjectAsset(
      projectRoot,
      "en",
      "facets",
      "changed.md",
      "project\n",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 1);
    assert.match(stdout, /collision/i);
    assert.match(stdout, /\.takt\/en\/facets\/changed\.md/);
    assert.equal(existsSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml")), false);
    assert.equal(readFileSync(changedTarget, "utf-8"), "project\n");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject collision without force preserves the full project tree snapshot", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "missing.yaml", "missing\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream\n");
    writeProjectAsset(projectRoot, "en", "facets", "changed.md", "project\n");
    writeProjectAsset(projectRoot, "en", "workflows", "project-only.yaml", "project only\n");
    writeProjectConfig(projectRoot, "en");
    writeFileSync(join(projectRoot, ".takt", ".manifest.json"), '{"lang":"en"}\n', "utf-8");
    mkdirSync(join(projectRoot, "scripts"), { recursive: true });
    writeFileSync(join(projectRoot, "scripts", "kiro-staged.mjs"), "project script\n", "utf-8");
    writeFileSync(join(projectRoot, "package.json"), '{"scripts":{"kiro:impl":"custom"}}\n', "utf-8");

    const before = snapshotProjectFiles(projectRoot);

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 1);
    assert.match(stdout, /no files were written/i);
    assert.match(stdout, /\.takt\/en\/facets\/changed\.md/);
    assert.deepEqual(snapshotProjectFiles(projectRoot), before);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject force refuses directory target collisions before any writes", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new\n");
    writePackageAsset(packageRoot, "en", "facets", "blocked.md", "upstream\n");
    mkdirSync(join(projectRoot, ".takt", "en", "facets", "blocked.md"), {
      recursive: true,
    });

    const before = snapshotProjectFiles(projectRoot);

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en", "--force"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 1);
    assert.match(stdout, /collision/i);
    assert.match(stdout, /\.takt\/en\/facets\/blocked\.md/);
    assert.equal(existsSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml")), false);
    assert.deepEqual(snapshotProjectFiles(projectRoot), before);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject all-languages force writes en and ja assets without metadata writes", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "kiro-impl.yaml", "en workflow\n");
    writePackageAsset(packageRoot, "en", "facets", "persona.md", "en facet\n");
    writePackageAsset(packageRoot, "ja", "workflows", "kiro-impl.yaml", "ja workflow\n");
    writePackageAsset(packageRoot, "ja", "facets", "persona.md", "ja facet\n");
    writeFileSync(join(packageRoot, "package.json"), '{"version":"9.9.9"}\n', "utf-8");
    mkdirSync(join(packageRoot, ".takt"), { recursive: true });
    writeFileSync(join(packageRoot, ".takt", "config.yaml"), "language: ja\n", "utf-8");
    writeFileSync(join(packageRoot, ".takt", ".manifest.json"), '{"lang":"ja"}\n', "utf-8");
    mkdirSync(join(packageRoot, "scripts"), { recursive: true });
    writeFileSync(join(packageRoot, "scripts", "kiro-staged.mjs"), "package script\n", "utf-8");

    writeProjectAsset(projectRoot, "en", "facets", "persona.md", "old en facet\n");
    writeProjectAsset(projectRoot, "ja", "workflows", "kiro-impl.yaml", "old ja workflow\n");
    writeProjectAsset(projectRoot, "en", "workflows", "project-only.yaml", "project only\n");
    writeProjectConfig(projectRoot, "en");
    writeFileSync(join(projectRoot, ".takt", ".manifest.json"), '{"lang":"en"}\n', "utf-8");
    mkdirSync(join(projectRoot, "scripts"), { recursive: true });
    writeFileSync(join(projectRoot, "scripts", "kiro-staged.mjs"), "project script\n", "utf-8");
    writeFileSync(join(projectRoot, "package.json"), '{"scripts":{"kiro:impl":"custom"}}\n', "utf-8");

    const plan = buildEjectPlan(
      { projectRoot, packageRoot },
      parseEjectArgs(["--all-languages", "--force"]),
    );

    assert.deepEqual(actionByRelativePath(plan), new Map([
      [".takt/en/facets/persona.md", "overwrite"],
      [".takt/en/workflows/kiro-impl.yaml", "copy"],
      [".takt/ja/facets/persona.md", "copy"],
      [".takt/ja/workflows/kiro-impl.yaml", "overwrite"],
    ]));

    const { result, stdout } = await captureStdout(() =>
      runEject(["--all-languages", "--force"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.match(stdout, /copied:\s*2/i);
    assert.match(stdout, /overwritten:\s*2/i);
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "workflows", "kiro-impl.yaml"), "utf-8"),
      "en workflow\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "facets", "persona.md"), "utf-8"),
      "en facet\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "ja", "workflows", "kiro-impl.yaml"), "utf-8"),
      "ja workflow\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "ja", "facets", "persona.md"), "utf-8"),
      "ja facet\n",
    );
    assert.equal(readFileSync(join(projectRoot, ".takt", "config.yaml"), "utf-8"), "language: en\n");
    assert.equal(readFileSync(join(projectRoot, ".takt", ".manifest.json"), "utf-8"), '{"lang":"en"}\n');
    assert.equal(readFileSync(join(projectRoot, "scripts", "kiro-staged.mjs"), "utf-8"), "project script\n");
    assert.equal(readFileSync(join(projectRoot, "package.json"), "utf-8"), '{"scripts":{"kiro:impl":"custom"}}\n');
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "workflows", "project-only.yaml"), "utf-8"),
      "project only\n",
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject applies copies and force overwrites with success guidance", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "new.yaml", "new\n");
    writePackageAsset(packageRoot, "en", "facets", "same.md", "same\n");
    writePackageAsset(packageRoot, "en", "facets", "changed.md", "upstream\n");
    writeProjectAsset(projectRoot, "en", "facets", "same.md", "same\n");
    const changedTarget = writeProjectAsset(
      projectRoot,
      "en",
      "facets",
      "changed.md",
      "project\n",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "en", "--force"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "workflows", "new.yaml"), "utf-8"),
      "new\n",
    );
    assert.equal(readFileSync(changedTarget, "utf-8"), "upstream\n");
    assert.match(stdout, /copied:\s*1/i);
    assert.match(stdout, /skipped:\s*1/i);
    assert.match(stdout, /overwritten:\s*1/i);
    assert.match(stdout, /project-owned/i);
    assert.match(stdout, /\.takt\/config\.yaml/);
    assert.match(stdout, /not create or change/i);
    assert.equal(existsSync(join(projectRoot, ".takt", "config.yaml")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject successful eject does not prune old files or create metadata", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "en", "workflows", "kiro-impl.yaml", "workflow\n");
    writePackageAsset(packageRoot, "en", "facets", "persona.md", "facet\n");
    writeProjectAsset(projectRoot, "en", "workflows", "removed-upstream.yaml", "old workflow\n");
    writeProjectAsset(projectRoot, "en", "facets", "local-only.md", "local facet\n");

    const { result } = await captureStdout(() =>
      runEject(["--lang", "en"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "workflows", "kiro-impl.yaml"), "utf-8"),
      "workflow\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "facets", "persona.md"), "utf-8"),
      "facet\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "workflows", "removed-upstream.yaml"), "utf-8"),
      "old workflow\n",
    );
    assert.equal(
      readFileSync(join(projectRoot, ".takt", "en", "facets", "local-only.md"), "utf-8"),
      "local facet\n",
    );
    assert.equal(existsSync(join(projectRoot, ".takt", "config.yaml")), false);
    assert.equal(existsSync(join(projectRoot, ".takt", ".manifest.json")), false);
    assert.equal(existsSync(join(projectRoot, "scripts", "kiro-staged.mjs")), false);
    assert.equal(existsSync(join(projectRoot, "package.json")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject shows ja-only manual config guidance using config-only language", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "ja", "workflows", "kiro-impl.yaml", "ja\n");
    mkdirSync(join(packageRoot, "builtins", "ja", "facets"), { recursive: true });
    mkdirSync(join(projectRoot, ".takt"), { recursive: true });
    writeFileSync(
      join(projectRoot, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "ja" }),
      "utf-8",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "ja"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.match(stdout, /language:\s*ja/);
    assert.match(stdout, /\.takt\/config\.yaml/);
    assert.match(stdout, /manual|yourself|set/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("runEject suppresses ja-only manual config guidance when config language is ja", async () => {
  const projectRoot = makeTmpDir();
  const packageRoot = makeTmpDir();
  try {
    writePackageAsset(packageRoot, "ja", "workflows", "kiro-impl.yaml", "ja\n");
    mkdirSync(join(packageRoot, "builtins", "ja", "facets"), { recursive: true });
    writeProjectConfig(projectRoot, "ja");
    writeFileSync(
      join(projectRoot, ".takt", ".manifest.json"),
      JSON.stringify({ lang: "en" }),
      "utf-8",
    );

    const { result, stdout } = await captureStdout(() =>
      runEject(["--lang", "ja"], { projectRoot, packageRoot }),
    );

    assert.equal(result, 0);
    assert.doesNotMatch(stdout, /For ja-only eject/);
    assert.doesNotMatch(stdout, /set language:\s*ja/i);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});
