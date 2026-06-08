#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAllowedKiroAiQualityGateCallSites,
  getKiroAiQualityGateContractTerms,
  getKiroWorkflowCoverageEntries,
} from "./kiro-ai-quality-gate-contracts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = join(__dirname, "..");
const languages = ["en", "ja"];
const generationGateRequiredCategories = new Set(["existing_gate_coverage", "generation_scoped_gate_required"]);
const noDirectGateCategories = new Set(["orchestration_delegated", "orchestration_decision_required"]);
const decisionRequiredCategories = new Set(["maintainer_decision_required", "orchestration_decision_required"]);

function readText(path) {
  return readFileSync(path, "utf8");
}

function rel(repoRoot, path) {
  return relative(repoRoot, path);
}

function listKiroWorkflowNames(repoRoot, language) {
  const dir = join(repoRoot, ".takt", language, "workflows");
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((file) => file.startsWith("kiro-") && file.endsWith(".yaml"))
    .map((file) => file.replace(/\.yaml$/, ""))
    .sort();
}

function stepBlocks(content) {
  const lines = content.split("\n");
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (/^  - name:\s+/.test(line)) {
      if (current) {
        blocks.push(current);
      }
      current = [line];
    } else if (current) {
      if (/^\S/.test(line)) {
        blocks.push(current);
        current = null;
      } else {
        current.push(line);
      }
    }
  }
  if (current) {
    blocks.push(current);
  }
  return blocks;
}

function stepScalar(block, key) {
  if (key === "name") {
    const match = block.join("\n").match(/^  - name:\s*(.+)\s*$/m);
    return match?.[1] ?? "";
  }
  const match = block.join("\n").match(new RegExp(`^    ${key}:\\s*(.+)\\s*$`, "m"));
  return match?.[1] ?? "";
}

function extractWorkflowCalls(content) {
  return stepBlocks(content)
    .filter((block) => stepScalar(block, "kind") === "workflow_call")
    .map((block) => `${stepScalar(block, "name")} -> ${stepScalar(block, "call")}`)
    .sort();
}

function extractReportNames(content) {
  return [...content.matchAll(/^\s+- name:\s*([^.\s]+\.md)\s*$/gm)].map((match) => match[1]).sort();
}

function workflowPath(repoRoot, language, workflowName) {
  return join(repoRoot, ".takt", language, "workflows", `${workflowName}.yaml`);
}

function validateCoverageInventory(repoRoot, coverageEntries) {
  const failures = [];
  const entries = coverageEntries;
  const entryNames = entries.map((entry) => entry.workflowName).sort();
  const entryNameSet = new Set(entryNames);

  for (const language of languages) {
    const workflowNames = listKiroWorkflowNames(repoRoot, language);
    for (const workflowName of workflowNames) {
      if (!entryNameSet.has(workflowName)) {
        failures.push(
          `MAINTAINER_DECISION_REQUIRED: ${workflowName} exists in ${language} workflows but is missing from Kiro AI quality gate coverage inventory`,
        );
      }
    }
    for (const entryName of entryNames) {
      if (!workflowNames.includes(entryName)) {
        failures.push(`COVERAGE_INVENTORY_DRIFT: ${entryName} is classified but missing from ${language} workflows`);
      }
    }
  }

  if (new Set(entryNames).size !== entryNames.length) {
    failures.push("COVERAGE_INVENTORY_DRIFT: duplicate workflowName entries exist in coverage inventory");
  }
  for (const entry of entries) {
    if (decisionRequiredCategories.has(entry.category)) {
      failures.push(
        `MAINTAINER_DECISION_REQUIRED: ${entry.workflowName} remains classified as ${entry.category} and must not be treated as covered`,
      );
    }
  }

  return { ok: failures.length === 0, failures };
}

function validateLanguageParity(repoRoot) {
  const failures = [];
  const enNames = listKiroWorkflowNames(repoRoot, "en");
  const jaNames = listKiroWorkflowNames(repoRoot, "ja");
  for (const workflowName of enNames) {
    if (!jaNames.includes(workflowName)) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${workflowName} exists in en workflows only`);
    }
  }
  for (const workflowName of jaNames) {
    if (!enNames.includes(workflowName)) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${workflowName} exists in ja workflows only`);
    }
  }
  for (const workflowName of enNames.filter((name) => jaNames.includes(name))) {
    const enContent = readText(workflowPath(repoRoot, "en", workflowName));
    const jaContent = readText(workflowPath(repoRoot, "ja", workflowName));
    const enCalls = JSON.stringify(extractWorkflowCalls(enContent));
    const jaCalls = JSON.stringify(extractWorkflowCalls(jaContent));
    if (enCalls !== jaCalls) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${workflowName} workflow_call structure differs between en and ja`);
    }
    const enReports = JSON.stringify(extractReportNames(enContent));
    const jaReports = JSON.stringify(extractReportNames(jaContent));
    if (enReports !== jaReports) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${workflowName} report names differ between en and ja`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateGatePlacement(repoRoot, coverageEntries) {
  const failures = [];
  const entries = coverageEntries;
  const allowedSites = getAllowedKiroAiQualityGateCallSites();

  for (const entry of entries.filter((candidate) => generationGateRequiredCategories.has(candidate.category))) {
    const sites = allowedSites.filter((site) => site.workflowName === entry.workflowName);
    if (entry.allowedGateCall && sites.length === 0) {
      failures.push(`ELIGIBLE_GATE_BYPASS: ${entry.workflowName} requires ${entry.allowedGateCall} but has no allowed call sites`);
      continue;
    }
    for (const language of languages) {
      const path = workflowPath(repoRoot, language, entry.workflowName);
      if (!existsSync(path)) {
        continue;
      }
      const content = readText(path);
      const calls = new Set(extractWorkflowCalls(content));
      for (const site of sites) {
        const expected = `${site.stepName} -> ${site.callPath}`;
        if (!calls.has(expected)) {
          failures.push(
            `ELIGIBLE_GATE_BYPASS: ${rel(repoRoot, path)} missing allowed gate call ${site.stepName} -> ${site.callPath}`,
          );
        }
        if (!content.includes(`- ${site.stepName}`)) {
          failures.push(`ELIGIBLE_GATE_BYPASS: ${rel(repoRoot, path)} loop monitor or route is missing ${site.stepName}`);
        }
      }
    }
  }

  for (const language of languages) {
    for (const workflowName of listKiroWorkflowNames(repoRoot, language)) {
      const path = workflowPath(repoRoot, language, workflowName);
      const content = readText(path);
      for (const call of extractWorkflowCalls(content)) {
        const [stepName, callPath] = call.split(" -> ");
        const allowed = allowedSites.some(
          (site) => site.workflowName === workflowName && site.stepName === stepName && site.callPath === callPath,
        );
        if (!allowed) {
          failures.push(`INVALID_GATE_CALL: ${rel(repoRoot, path)} uses unapproved workflow_call ${call}`);
        }
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

function validateReadOnlyAndDelegatedBoundaries(repoRoot, coverageEntries) {
  const failures = [];
  for (const entry of coverageEntries) {
    for (const language of languages) {
      const path = workflowPath(repoRoot, language, entry.workflowName);
      if (!existsSync(path)) {
        continue;
      }
      const content = readText(path);
      if (entry.category === "read_only_out_of_scope") {
        if (/^loop_monitors:\s*$/m.test(content) || /workflow_call|ai-quality-gate|ai-antipattern|quality gate fix/i.test(content)) {
          failures.push(`READ_ONLY_GATE_BEHAVIOR: ${rel(repoRoot, path)} must not include AI gate or fix-loop behavior`);
        }
        if (/required_permission_mode:\s*edit|edit:\s*true|repair-|debug-|fix-/i.test(content)) {
          failures.push(`READ_ONLY_GATE_BEHAVIOR: ${rel(repoRoot, path)} must stay read-only without repair/debug/fix steps`);
        }
      }
      if (noDirectGateCategories.has(entry.category)) {
        if (!entry.adjacentOwner) {
          failures.push(`ORCHESTRATION_DELEGATION_DRIFT: ${entry.workflowName} must record an adjacent AI review owner`);
        }
        if (entry.allowedGateCall) {
          failures.push(`ORCHESTRATION_DELEGATION_DRIFT: ${entry.workflowName} must not declare allowedGateCall`);
        }
        if (/kiro-ai-quality-gate|kiro-spec-ai-quality-gate|ai-antipattern/i.test(content)) {
          failures.push(`ORCHESTRATION_DELEGATION_DRIFT: ${rel(repoRoot, path)} must not directly own AI gate behavior`);
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateGateContractTerms(repoRoot) {
  const failures = [];
  const terms = getKiroAiQualityGateContractTerms();
  const specTerms = [
    ...terms.specGeneration.reviewReports,
    ...terms.specGeneration.optionalFixReports,
    ...terms.shared.routingTerms,
    ...terms.shared.catchAllTerms,
    ...terms.shared.loopOutcomeTerms,
  ];
  for (const language of languages) {
    const path = workflowPath(repoRoot, language, "kiro-spec-ai-quality-gate");
    if (!existsSync(path)) {
      failures.push(`GATE_CONTRACT_DRIFT: ${rel(repoRoot, path)} missing`);
      continue;
    }
    const content = readText(path);
    for (const term of specTerms) {
      if (!content.includes(term)) {
        failures.push(`GATE_CONTRACT_DRIFT: ${rel(repoRoot, path)} missing required gate contract term: ${term}`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

export function validateKiroAiQualityGateWorkflowCoverage(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const coverageEntries = options.coverageEntries ?? getKiroWorkflowCoverageEntries();
  const sections = {
    coverageInventory: validateCoverageInventory(repoRoot, coverageEntries),
    languageParity: validateLanguageParity(repoRoot),
    gatePlacement: validateGatePlacement(repoRoot, coverageEntries),
    readOnlyAndDelegatedBoundaries: validateReadOnlyAndDelegatedBoundaries(repoRoot, coverageEntries),
    gateContractTerms: validateGateContractTerms(repoRoot),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
}

if (process.argv[1] && __filename === resolve(process.argv[1])) {
  const result = validateKiroAiQualityGateWorkflowCoverage();
  if (result.ok) {
    console.log("Kiro AI quality gate workflow coverage validation passed");
  } else {
    console.error("Kiro AI quality gate workflow coverage validation failed");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}
