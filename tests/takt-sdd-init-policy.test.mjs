import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import os from "node:os";

import {
  buildInitHelpText,
  buildInitRetiredGuidance,
  runInit,
  runRetiredInit,
} from "../cli/init-adapter.mjs";
import { main } from "../cli/main.mjs";

function makeTmp(prefix = "takt-retired-init-") {
  return mkdtempSync(join(os.tmpdir(), prefix));
}

function walkFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, base));
    } else {
      files.push(full.slice(base.length + 1));
    }
  }
  return files.sort();
}

function snapshotFiles(dir) {
  return new Map(
    walkFiles(dir).map((relativePath) => [
      relativePath,
      readFileSync(join(dir, relativePath), "utf-8"),
    ]),
  );
}

async function captureStdout(fn) {
  const chunks = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  try {
    const value = await fn();
    return { value, output: chunks.join("") };
  } finally {
    process.stdout.write = original;
  }
}

async function captureStderr(fn) {
  const chunks = [];
  const original = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, ...rest) => {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  };
  try {
    const value = await fn();
    return { value, output: chunks.join("") };
  } finally {
    process.stderr.write = original;
  }
}

function writeExistingProjectFiles(root) {
  mkdirSync(join(root, ".takt"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, ".takt", "config.yaml"), "language: ja\n", "utf-8");
  writeFileSync(join(root, "scripts", "kiro-staged.mjs"), "console.log('keep');\n", "utf-8");
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({ scripts: { "kiro:impl": "takt-sdd kiro-impl" } }, null, 2)}\n`,
    "utf-8",
  );
}

function writeExistingNoCopyProjectFiles(root) {
  mkdirSync(join(root, ".takt", "en", "workflows"), { recursive: true });
  mkdirSync(join(root, ".takt", "en", "facets", "instructions"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, ".takt", "config.yaml"), "language: ja\n# keep user config\n", "utf-8");
  writeFileSync(
    join(root, ".takt", ".manifest.json"),
    `${JSON.stringify(
      {
        version: "1.0.0",
        installedAt: "2026-06-17T00:00:00.000Z",
        lang: "en",
        files: {
          ".takt/en/workflows/kiro-impl.yaml": "project-owned-workflow-hash",
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(
    join(root, ".takt", "en", "workflows", "kiro-impl.yaml"),
    "name: project-owned-kiro-impl\nsteps: []\n",
    "utf-8",
  );
  writeFileSync(
    join(root, ".takt", "en", "facets", "instructions", "custom.md"),
    "# Project-owned instruction\n",
    "utf-8",
  );
  writeFileSync(join(root, "scripts", "kiro-staged.mjs"), "console.log('project-owned');\n", "utf-8");
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "project-owned-app",
        private: true,
        scripts: {
          "kiro:impl": "takt-sdd kiro-impl",
          test: "node --test",
        },
        metadata: {
          keep: "project-owned",
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}

test("buildInitHelpText returns deprecated help that points to bundled assets and eject", () => {
  const text = buildInitHelpText("1.2.3");
  assert.match(text, /takt-sdd 1\.2\.3/);
  assert.match(text, /deprecated/i);
  assert.match(text, /bundled workflows\/facets/i);
  assert.match(text, /installed package/i);
  assert.match(text, /takt-sdd eject/);
});

test("buildInitRetiredGuidance explains no-copy runtime and customization via eject", () => {
  const text = buildInitRetiredGuidance();
  assert.match(text, /retired/i);
  assert.match(text, /bundled workflows\/facets/i);
  assert.match(text, /installed package/i);
  assert.match(text, /takt-sdd eject/);
});

test("runRetiredInit prints deprecated help to stdout and exits 0 for --help and -h", async () => {
  for (const flag of ["--help", "-h"]) {
    const { value: code, output } = await captureStdout(() => runRetiredInit([flag]));
    assert.equal(code, 0);
    assert.match(output, /deprecated/i);
    assert.match(output, /takt-sdd eject/);
  }
});

test("runRetiredInit prints guidance to stderr and exits 1 for any non-help argv without validating old options", async () => {
  const { value: code, output } = await captureStderr(() =>
    runRetiredInit([".", "--force", "--dry-run", "--lang", "bogus", "--tag", "v1"]),
  );
  assert.equal(code, 1);
  assert.match(output, /retired/i);
  assert.match(output, /takt-sdd eject/);
  assert.doesNotMatch(output, /--lang must be/);
  assert.doesNotMatch(output, /--tag is not supported/);
});

test("runInit is retired and does not call installer core injection", async () => {
  let installerCalled = false;
  const { value: code, output } = await captureStderr(() =>
    runInit(
      { targetDir: "/path/that/does/not/need/to/exist", lang: "bogus", force: true, dryRun: false },
      { projectRoot: "/unused", packageRoot: "/unused" },
      {
        installFromSource() {
          installerCalled = true;
        },
      },
    ),
  );
  assert.equal(code, 1);
  assert.equal(installerCalled, false);
  assert.match(output, /retired/i);
});

test("main init help prints deprecated help to stdout and exits 0", async () => {
  const { value: code, output } = await captureStdout(() => main(["init", "--help"]));
  assert.equal(code, 0);
  assert.match(output, /deprecated/i);
  assert.match(output, /takt-sdd eject/);
});

test("main init help preserves existing manifest, ejected assets, script, and package metadata", async () => {
  const tmpDir = makeTmp();
  try {
    writeExistingNoCopyProjectFiles(tmpDir);
    const before = snapshotFiles(tmpDir);

    const { value: code, output } = await captureStdout(() => main(["--cwd", tmpDir, "init", "--help"]));

    assert.equal(code, 0);
    assert.match(output, /deprecated/i);
    assert.match(output, /takt-sdd eject/);
    assert.deepEqual(snapshotFiles(tmpDir), before);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("main init mixed help args print retired guidance to stderr, exit 1, and write no files", async () => {
  for (const args of [
    ["init", ".", "--help"],
    ["init", "--force", "--help"],
  ]) {
    const tmpDir = makeTmp();
    try {
      writeExistingProjectFiles(tmpDir);
      const before = snapshotFiles(tmpDir);

      let stderrResult;
      const { output: stdout } = await captureStdout(async () => {
        stderrResult = await captureStderr(() => main(["--cwd", tmpDir, ...args]));
      });
      const { value: code, output } = stderrResult;

      assert.equal(code, 1);
      assert.equal(stdout, "");
      assert.match(output, /retired/i);
      assert.match(output, /takt-sdd eject/);
      assert.deepEqual(snapshotFiles(tmpDir), before);
      assert.equal(existsSync(join(tmpDir, ".takt", ".manifest.json")), false);
      assert.equal(existsSync(join(tmpDir, ".takt", "workflows")), false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test("main init normal run exits 1, emits retired guidance, skips old validation, and writes no files", async () => {
  const tmpDir = makeTmp();
  try {
    writeExistingProjectFiles(tmpDir);
    const before = snapshotFiles(tmpDir);

    const { value: code, output } = await captureStderr(() =>
      main(["--cwd", tmpDir, "init", ".", "--force", "--dry-run", "--lang", "bogus"]),
    );

    assert.equal(code, 1);
    assert.match(output, /retired/i);
    assert.match(output, /bundled workflows\/facets/i);
    assert.match(output, /takt-sdd eject/);
    assert.doesNotMatch(output, /--lang must be/);
    assert.deepEqual(snapshotFiles(tmpDir), before);
    assert.equal(existsSync(join(tmpDir, ".takt", ".manifest.json")), false);
    assert.equal(existsSync(join(tmpDir, ".takt", "workflows")), false);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("main init normal run preserves existing manifest, ejected assets, script, and package metadata", async () => {
  const tmpDir = makeTmp();
  try {
    writeExistingNoCopyProjectFiles(tmpDir);
    const before = snapshotFiles(tmpDir);

    const { value: code, output } = await captureStderr(() =>
      main(["--cwd", tmpDir, "init", ".", "--force", "--dry-run", "--lang", "bogus", "--tag", "v1"]),
    );

    assert.equal(code, 1);
    assert.match(output, /retired/i);
    assert.match(output, /bundled workflows\/facets/i);
    assert.match(output, /takt-sdd eject/);
    assert.doesNotMatch(output, /--lang must be/);
    assert.doesNotMatch(output, /--tag is not supported/);
    assert.deepEqual(snapshotFiles(tmpDir), before);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
