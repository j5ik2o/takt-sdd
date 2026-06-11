#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const languages = ["en", "ja"];

const canonicalKiroScripts = new Map([
  ["kiro:discovery", "kiro-discovery"],
  ["kiro:spec:init", "kiro-spec-init"],
  ["kiro:spec:requirements", "kiro-spec-requirements"],
  ["kiro:validate:gap", "kiro-validate-gap"],
  ["kiro:spec:design", "kiro-spec-design"],
  ["kiro:validate:design", "kiro-validate-design"],
  ["kiro:spec:tasks", "kiro-spec-tasks"],
  ["kiro:spec:quick", "kiro-spec-quick"],
  ["kiro:spec:batch", "kiro-spec-batch"],
  ["kiro:spec:status", "kiro-spec-status"],
  ["kiro:impl", "kiro-impl"],
  ["kiro:validate:impl", "kiro-validate-impl"],
  ["kiro:steering", "kiro-steering"],
  ["kiro:steering-custom", "kiro-steering-custom"],
]);

function readText(path) {
  return readFileSync(path, "utf8");
}

function readPackageScripts(repoRoot) {
  return JSON.parse(readText(join(repoRoot, "package.json"))).scripts ?? {};
}

function extractInstallerScripts(repoRoot) {
  const path = join(repoRoot, "installer", "src", "install.ts");
  const content = readText(path);
  const match = content.match(/const SDD_SCRIPTS:[^{]+{([\s\S]*?)^};/m);
  if (!match) {
    return null;
  }
  const scripts = {};
  for (const line of match[1].split("\n")) {
    const entry = line.match(/^\s*"([^"]+)":\s*"([^"]+)",?\s*$/);
    if (entry) {
      scripts[entry[1]] = entry[2];
    }
  }
  return scripts;
}

function expectedKiroValue(workflowName) {
  return `node scripts/kiro-staged.mjs ${workflowName} --pipeline --skip-git -t`;
}

function kiroKeys(scripts) {
  return Object.keys(scripts).filter((key) => key.startsWith("kiro:")).sort();
}

function sortedValues(values) {
  return [...values].sort();
}

function validateCanonicalScripts(repoRoot) {
  const failures = [];
  const rootScripts = readPackageScripts(repoRoot);
  const installerScripts = extractInstallerScripts(repoRoot);
  if (!installerScripts) {
    return {
      ok: false,
      failures: ["KIRO_SCRIPT_SET_DRIFT: installer/src/install.ts SDD_SCRIPTS object not found"],
    };
  }

  const expectedKeys = sortedValues(canonicalKiroScripts.keys());
  for (const [label, scripts] of [
    ["package.json", rootScripts],
    ["installer/src/install.ts", installerScripts],
  ]) {
    const actualKeys = kiroKeys(scripts);
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      failures.push(
        `KIRO_SCRIPT_SET_DRIFT: ${label} canonical kiro:* keys mismatch expected=${JSON.stringify(expectedKeys)} actual=${JSON.stringify(actualKeys)}`,
      );
    }
    for (const [scriptName, workflowName] of canonicalKiroScripts) {
      const expected = expectedKiroValue(workflowName);
      if (scripts[scriptName] !== expected) {
        failures.push(
          `KIRO_SCRIPT_VALUE_DRIFT: ${label} ${scriptName} must equal ${JSON.stringify(expected)} actual=${JSON.stringify(scripts[scriptName])}`,
        );
      }
    }
  }

  for (const [scriptName, workflowName] of canonicalKiroScripts) {
    if (rootScripts[scriptName] !== installerScripts[scriptName]) {
      failures.push(
        `KIRO_SCRIPT_VALUE_DRIFT: package.json and installer/src/install.ts disagree for ${scriptName} (${workflowName})`,
      );
    }
  }

  const opsxInKiro = Object.keys(rootScripts).filter((key) => key.startsWith("opsx:") && canonicalKiroScripts.has(key));
  if (opsxInKiro.length > 0) {
    failures.push(`KIRO_SCRIPT_SET_DRIFT: opsx scripts must not be canonical Kiro scripts: ${opsxInKiro.join(", ")}`);
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Validate that retired cc-sdd:* and opsx:* scripts are NOT present in
 * package.json and installer SDD_SCRIPTS (req 3.1, 8.2 — absence enforcement).
 */
function validateRetiredScriptsAbsent(repoRoot) {
  const failures = [];
  const rootScripts = readPackageScripts(repoRoot);
  const installerScripts = extractInstallerScripts(repoRoot);

  for (const [label, scripts] of [
    ["package.json", rootScripts],
    ...(installerScripts ? [["installer/src/install.ts", installerScripts]] : []),
  ]) {
    for (const key of Object.keys(scripts)) {
      if (key.startsWith("cc-sdd:") || key.startsWith("opsx:")) {
        failures.push(
          `RETIRED_SCRIPT: ${label} must not contain retired script "${key}" (cc-sdd:* and opsx:* were retired in v2.0.0)`,
        );
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

/**
 * Validate that retired cc-sdd-* and opsx-* workflow yaml files are NOT
 * present in .takt/{en,ja}/workflows/ (req 1.1, 1.2, 8.2 — absence enforcement).
 */
function validateRetiredWorkflowAssetsAbsent(repoRoot) {
  const failures = [];

  for (const lang of languages) {
    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    if (!existsSync(workflowDir)) continue;
    let entries;
    try {
      entries = readdirSync(workflowDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.startsWith("cc-sdd-") || entry.startsWith("opsx-")) {
        const workflowName = entry.replace(/\.yaml$/, "");
        failures.push(
          `RETIRED_WORKFLOW_ASSET: .takt/${lang}/workflows/${entry} must not be present — ${workflowName} was retired in v2.0.0`,
        );
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

function hasWorkflow(repoRoot, workflowName) {
  return languages.some((language) => existsSync(join(repoRoot, ".takt", language, "workflows", `${workflowName}.yaml`)))
    || existsSync(join(repoRoot, ".takt", "workflows", `${workflowName}.yaml`));
}

function validateGuidanceText(repoRoot) {
  const failures = [];

  for (const path of ["CC-SDD-CODEX.md", "CC-SDD-CLAUDE.md", "COMMON.md"]) {
    const fullPath = join(repoRoot, path);
    if (!existsSync(fullPath)) {
      continue;
    }
    const content = readText(fullPath);
    if (!content.includes("$kiro-") || !content.includes("kiro:")) {
      failures.push(`GUIDANCE_DRIFT: ${path} must describe $kiro-* and kiro:* as the Kiro surface`);
    }
    if (/cc-sdd:\*.*正規|cc-sdd:\*.*canonical/is.test(content)) {
      failures.push(`GUIDANCE_DRIFT: ${path} must not present cc-sdd:* as canonical`);
    }
  }

  return { ok: failures.length === 0, failures };
}


function validateCrossSpecReleaseGate(repoRoot) {
  const failures = [];
  const rootScripts = readPackageScripts(repoRoot);
  const stagedWrapperPath = join(repoRoot, "scripts", "kiro-staged.mjs");
  if (!existsSync(stagedWrapperPath)) {
    failures.push("CROSS_SPEC_RELEASE_GATE_DRIFT: scripts/kiro-staged.mjs is required for staged public Kiro scripts");
  }
  for (const [scriptName, workflowName] of canonicalKiroScripts) {
    const value = rootScripts[scriptName];
    const workflowExists = hasWorkflow(repoRoot, workflowName);
    const stagedGuidance = value === expectedKiroValue(workflowName) && existsSync(stagedWrapperPath);
    if (!workflowExists && !stagedGuidance) {
      failures.push(
        `CROSS_SPEC_RELEASE_GATE_DRIFT: ${scriptName} (${workflowName}) has no workflow implementation and no staged migration guidance`,
      );
    }
  }
  return { ok: failures.length === 0, failures };
}

export function validateKiroWorkflowSurface({ repoRoot = defaultRepoRoot } = {}) {
  const checks = [
    validateCanonicalScripts(repoRoot),
    validateRetiredScriptsAbsent(repoRoot),
    validateRetiredWorkflowAssetsAbsent(repoRoot),
    validateGuidanceText(repoRoot),
    validateCrossSpecReleaseGate(repoRoot),
  ];
  const failures = checks.flatMap((check) => check.failures);
  return { ok: failures.length === 0, failures };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateKiroWorkflowSurface();
  if (!result.ok) {
    console.error("Kiro workflow surface validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
  console.log("Kiro workflow surface validation passed");
}
