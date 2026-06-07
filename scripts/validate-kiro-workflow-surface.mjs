#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
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

const legacyScripts = new Map([
  ["cc-sdd:full", "cc-sdd-full"],
  ["cc-sdd:requirements", "cc-sdd-requirements"],
  ["cc-sdd:validate-gap", "cc-sdd-validate-gap"],
  ["cc-sdd:design", "cc-sdd-design"],
  ["cc-sdd:validate-design", "cc-sdd-validate-design"],
  ["cc-sdd:tasks", "cc-sdd-tasks"],
  ["cc-sdd:impl", "cc-sdd-impl"],
  ["cc-sdd:validate-impl", "cc-sdd-validate-impl"],
  ["cc-sdd:steering", "cc-sdd-steering"],
  ["cc-sdd:steering-custom", "cc-sdd-steering-custom"],
]);

const migrationPairs = new Map([
  ["cc-sdd:full", "kiro:spec:quick"],
  ["cc-sdd:requirements", "kiro:spec:requirements"],
  ["cc-sdd:validate-gap", "kiro:validate:gap"],
  ["cc-sdd:design", "kiro:spec:design"],
  ["cc-sdd:validate-design", "kiro:validate:design"],
  ["cc-sdd:tasks", "kiro:spec:tasks"],
  ["cc-sdd:impl", "kiro:impl"],
  ["cc-sdd:validate-impl", "kiro:validate:impl"],
  ["cc-sdd:steering", "kiro:steering"],
  ["cc-sdd:steering-custom", "kiro:steering-custom"],
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

function hasWorkflow(repoRoot, workflowName) {
  return languages.some((language) => existsSync(join(repoRoot, ".takt", language, "workflows", `${workflowName}.yaml`)))
    || existsSync(join(repoRoot, ".takt", "workflows", `${workflowName}.yaml`));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function invokesWorkflow(value, workflowName) {
  return new RegExp(`(?:^|\\s)-w\\s+${escapeRegExp(workflowName)}(?:\\s|$)`).test(value);
}

function validateLegacyScriptSet(repoRoot, label, scripts) {
  const failures = [];
  for (const [scriptName, workflowName] of legacyScripts) {
    const value = scripts[scriptName];
    if (!value) {
      failures.push(`LEGACY_SCRIPT_POLICY_DRIFT: ${label} missing ${scriptName}`);
      continue;
    }
    if (value.includes("kiro") || value.includes("kiro-staged") || !invokesWorkflow(value, workflowName)) {
      failures.push(
        `LEGACY_SCRIPT_POLICY_DRIFT: ${label} ${scriptName} must keep existing ${workflowName} workflow and must not alias Kiro actual=${JSON.stringify(value)}`,
      );
    }
    if (/missing|not installed|exit 1|throw new Error/.test(value)) {
      failures.push(`LEGACY_SCRIPT_POLICY_DRIFT: ${label} ${scriptName} must not be a fail-fast migration shim`);
    }
    if (!hasWorkflow(repoRoot, workflowName)) {
      failures.push(`LEGACY_SCRIPT_POLICY_DRIFT: ${label} ${scriptName} references missing workflow ${workflowName}`);
    }
  }
  return failures;
}

function validateLegacyDeprecationPolicy(repoRoot) {
  const rootScripts = readPackageScripts(repoRoot);
  const installerScripts = extractInstallerScripts(repoRoot) ?? {};
  const failures = [
    ...validateLegacyScriptSet(repoRoot, "package.json", rootScripts),
    ...validateLegacyScriptSet(repoRoot, "installer/src/install.ts", installerScripts),
  ];
  return { ok: failures.length === 0, failures };
}

function includesAll(content, terms) {
  return terms.every((term) => content.includes(term));
}

function validateMigrationDoc(repoRoot, path, oldCanonicalPattern, requiredTerms) {
  const failures = [];
  const fullPath = join(repoRoot, path);
  const content = readText(fullPath);
  if (!includesAll(content, requiredTerms)) {
    failures.push(`GUIDANCE_DRIFT: ${path} missing required Kiro migration terms`);
  }
  for (const [legacy, canonical] of migrationPairs) {
    if (!content.includes(legacy) || !content.includes(canonical)) {
      failures.push(`GUIDANCE_DRIFT: ${path} missing migration mapping ${legacy} -> ${canonical}`);
    }
  }
  if (oldCanonicalPattern.test(content)) {
    failures.push(`GUIDANCE_DRIFT: ${path} still presents cc-sdd as the canonical Kiro workflow surface`);
  }
  if (content.includes("`sdd:design`") || content.includes("`sdd:validate-design`")) {
    failures.push(`GUIDANCE_DRIFT: ${path} must not reference nonexistent sdd:* design scripts`);
  }
  return failures;
}

function validateGuidanceText(repoRoot) {
  const failures = [];
  failures.push(
    ...validateMigrationDoc(repoRoot, "README.md", /Use the full-auto workflow `cc-sdd-full`|SDD executes the following phases in order:/, [
      "Use `kiro:*` scripts for new SDD workflow usage.",
      "Migration from legacy `cc-sdd:*` scripts",
      "npm run kiro:spec:quick",
      "npm run opsx:full",
    ]),
  );
  failures.push(
    ...validateMigrationDoc(repoRoot, "README.ja.md", /フルオートワークフロー `cc-sdd-full`|SDD は以下のフェーズを順に実行する/, [
      "新規の SDD ワークフローでは `kiro:*` scripts を使う。",
      "旧 `cc-sdd:*` scripts からの移行",
      "npm run kiro:spec:quick",
      "npm run opsx:full",
    ]),
  );

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

function validateInstalledLegacyScripts(repoRoot) {
  const installerScripts = extractInstallerScripts(repoRoot) ?? {};
  const failures = [];
  for (const [scriptName, workflowName] of legacyScripts) {
    const value = installerScripts[scriptName];
    if (!value) {
      failures.push(`INSTALLED_LEGACY_SCRIPT_DRIFT: installer missing ${scriptName}`);
      continue;
    }
    if (!invokesWorkflow(value, workflowName)) {
      failures.push(`INSTALLED_LEGACY_SCRIPT_DRIFT: installer ${scriptName} must invoke ${workflowName}`);
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
    validateLegacyDeprecationPolicy(repoRoot),
    validateGuidanceText(repoRoot),
    validateInstalledLegacyScripts(repoRoot),
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
