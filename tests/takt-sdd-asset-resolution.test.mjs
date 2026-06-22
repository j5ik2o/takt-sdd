import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import os from "node:os";
import {
  getProjectConfigLanguage,
  resolveLanguage,
  resolveWorkflowAsset,
} from "../cli/asset-resolution.mjs";

function makeTmpDir(prefix) {
  return mkdtempSync(join(os.tmpdir(), prefix));
}

function writeProjectConfig(projectRoot, content) {
  const taktDir = join(projectRoot, ".takt");
  mkdirSync(taktDir, { recursive: true });
  writeFileSync(join(taktDir, "config.yaml"), content, "utf-8");
}

function writeManifest(projectRoot, lang) {
  const taktDir = join(projectRoot, ".takt");
  mkdirSync(taktDir, { recursive: true });
  writeFileSync(
    join(taktDir, ".manifest.json"),
    JSON.stringify({ version: "1.0.0", lang }, null, 2),
    "utf-8",
  );
}

function writePackageWorkflow(packageRoot, lang, workflowName) {
  const workflowDir = join(packageRoot, "builtins", lang, "workflows");
  mkdirSync(workflowDir, { recursive: true });
  const workflowPath = join(workflowDir, `${workflowName}.yaml`);
  writeFileSync(workflowPath, `# package ${lang} ${workflowName}\nsteps: []\n`, "utf-8");
  return workflowPath;
}

function writeProjectWorkflow(projectRoot, lang, workflowName) {
  const workflowDir = join(projectRoot, ".takt", lang, "workflows");
  mkdirSync(workflowDir, { recursive: true });
  const workflowPath = join(workflowDir, `${workflowName}.yaml`);
  writeFileSync(workflowPath, `# project ${lang} ${workflowName}\nsteps: []\n`, "utf-8");
  return workflowPath;
}

function writeProjectRootWorkflow(projectRoot, workflowName) {
  const workflowDir = join(projectRoot, ".takt", "workflows");
  mkdirSync(workflowDir, { recursive: true });
  const workflowPath = join(workflowDir, `${workflowName}.yaml`);
  writeFileSync(workflowPath, `# project root ${workflowName}\nsteps: []\n`, "utf-8");
  return workflowPath;
}

test("resolveLanguage prefers config language over manifest language", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  try {
    writeProjectConfig(projectRoot, "language: ja\n");
    writeManifest(projectRoot, "en");

    assert.deepEqual(resolveLanguage(projectRoot), {
      lang: "ja",
      source: "config",
    });
    assert.equal(getProjectConfigLanguage(projectRoot), "ja");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolveLanguage uses manifest fallback when config language is invalid", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  try {
    writeProjectConfig(projectRoot, "language: fr\n");
    writeManifest(projectRoot, "ja");

    assert.deepEqual(resolveLanguage(projectRoot), {
      lang: "ja",
      source: "manifest",
    });
    assert.equal(getProjectConfigLanguage(projectRoot), undefined);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolveLanguage defaults to en without creating .takt", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  try {
    assert.deepEqual(resolveLanguage(projectRoot), {
      lang: "en",
      source: "default",
    });
    assert.equal(getProjectConfigLanguage(projectRoot), undefined);
    assert.equal(existsSync(join(projectRoot, ".takt")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolveLanguage defaults to en when config and manifest do not contain supported languages", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  try {
    writeProjectConfig(projectRoot, "language: fr\n");
    writeManifest(projectRoot, "de");

    assert.deepEqual(resolveLanguage(projectRoot), {
      lang: "en",
      source: "default",
    });
    assert.equal(getProjectConfigLanguage(projectRoot), undefined);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("getProjectConfigLanguage reads only config and ignores manifest fallback", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  try {
    writeManifest(projectRoot, "ja");

    assert.equal(getProjectConfigLanguage(projectRoot), undefined);
    assert.deepEqual(resolveLanguage(projectRoot), {
      lang: "ja",
      source: "manifest",
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("resolveWorkflowAsset prefers project root override over language override and package workflow", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  const packageRoot = makeTmpDir("takt-sdd-assets-package-");
  try {
    const rootWorkflow = writeProjectRootWorkflow(projectRoot, "kiro-impl");
    writeProjectWorkflow(projectRoot, "ja", "kiro-impl");
    writePackageWorkflow(packageRoot, "ja", "kiro-impl");

    assert.deepEqual(
      resolveWorkflowAsset({
        projectRoot,
        packageRoot,
        lang: "ja",
        workflowName: "kiro-impl",
      }),
      {
        workflowPath: rootWorkflow,
        kind: "project-root",
        lang: "ja",
      },
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("resolveWorkflowAsset prefers project language override over package workflow", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  const packageRoot = makeTmpDir("takt-sdd-assets-package-");
  try {
    const projectWorkflow = writeProjectWorkflow(projectRoot, "ja", "kiro-impl");
    writePackageWorkflow(packageRoot, "ja", "kiro-impl");

    assert.deepEqual(
      resolveWorkflowAsset({
        projectRoot,
        packageRoot,
        lang: "ja",
        workflowName: "kiro-impl",
      }),
      {
        workflowPath: projectWorkflow,
        kind: "project-language",
        lang: "ja",
      },
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("resolveWorkflowAsset returns package workflow when project has no .takt", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  const packageRoot = makeTmpDir("takt-sdd-assets-package-");
  try {
    const packageWorkflow = writePackageWorkflow(packageRoot, "en", "kiro-impl");

    assert.deepEqual(
      resolveWorkflowAsset({
        projectRoot,
        packageRoot,
        lang: "en",
        workflowName: "kiro-impl",
      }),
      {
        workflowPath: packageWorkflow,
        kind: "package",
        lang: "en",
      },
    );
    assert.equal(existsSync(join(projectRoot, ".takt")), false);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("resolveWorkflowAsset does not fallback from ja to en package workflow", () => {
  const projectRoot = makeTmpDir("takt-sdd-assets-project-");
  const packageRoot = makeTmpDir("takt-sdd-assets-package-");
  try {
    writeProjectWorkflow(projectRoot, "en", "kiro-impl");
    writePackageWorkflow(packageRoot, "en", "kiro-impl");

    assert.equal(
      resolveWorkflowAsset({
        projectRoot,
        packageRoot,
        lang: "ja",
        workflowName: "kiro-impl",
      }),
      undefined,
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(packageRoot, { recursive: true, force: true });
  }
});
