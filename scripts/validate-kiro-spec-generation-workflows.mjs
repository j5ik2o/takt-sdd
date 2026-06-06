#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = join(__dirname, "..");
const languages = ["en", "ja"];

const phaseWorkflowSpecs = [
  {
    name: "kiro-spec-init",
    requiredTerms: ["spec.json", "requirements.md", "initialized", "kiro-spec-generation-result"],
    instructionFacets: ["kiro-spec-init"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result"],
  },
  {
    name: "kiro-spec-requirements",
    requiredTerms: ["requirements.md", "requirements-generated", "EARS", "kiro-spec-generation-result"],
    instructionFacets: ["kiro-spec-requirements"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result"],
  },
  {
    name: "kiro-spec-design",
    requiredTerms: ["design.md", "research.md", "design-generated", "Boundary Commitments", "File Structure Plan"],
    instructionFacets: ["kiro-spec-design"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result"],
  },
  {
    name: "kiro-spec-tasks",
    requiredTerms: ["tasks.md", "tasks-generated", "_Boundary:_", "_Depends:_", "kiro-spec-generation-result"],
    instructionFacets: ["kiro-spec-tasks"],
    policyFacets: ["kiro-spec-generation", "kiro-spec-task-annotations"],
    outputContracts: ["kiro-spec-generation-result"],
  },
  {
    name: "kiro-spec-quick",
    requiredTerms: ["quick-init", "quick-requirements", "quick-design", "quick-tasks", "quick-sanity-review"],
    instructionFacets: ["kiro-spec-quick"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result", "kiro-spec-sanity-review"],
  },
];

const facetSpecs = [
  {
    kind: "instructions",
    name: "kiro-spec-init",
    terms: ["spec.json", "requirements.md", "initialized", "brief.md"],
  },
  {
    kind: "instructions",
    name: "kiro-spec-requirements",
    terms: ["requirements.md", "EARS", "requirements-generated", "BLOCKED"],
  },
  {
    kind: "instructions",
    name: "kiro-spec-design",
    terms: ["design.md", "research.md", "Boundary Commitments", "File Structure Plan"],
  },
  {
    kind: "instructions",
    name: "kiro-spec-tasks",
    terms: ["tasks.md", "_Boundary:_", "_Depends:_", "tasks-generated"],
  },
  {
    kind: "instructions",
    name: "kiro-spec-quick",
    terms: ["quick-init", "quick-requirements", "quick-design", "quick-tasks", "quick-sanity-review"],
  },
  {
    kind: "policies",
    name: "kiro-spec-generation",
    terms: ["phase", "approvals", "ready_for_implementation", "auto-approve"],
  },
  {
    kind: "policies",
    name: "kiro-spec-task-annotations",
    terms: ["_Boundary:_", "_Depends:_", "none", "(P)"],
  },
  {
    kind: "output-contracts",
    name: "kiro-spec-generation-result",
    terms: ["phase", "validation", "featureName", "updatedFiles", "nextAction", "blockingReason", "PASS", "NEEDS_FIX", "BLOCKED"],
  },
  {
    kind: "output-contracts",
    name: "kiro-spec-sanity-review",
    terms: ["verdict", "findings", "requirements", "design", "tasks", "PASS", "NEEDS_FIX", "BLOCKED"],
  },
];

const lifecycleTerms = [
  "initialized",
  "requirements-generated",
  "design-generated",
  "tasks-generated",
  "approvals.requirements.generated",
  "approvals.requirements.approved",
  "approvals.design.generated",
  "approvals.design.approved",
  "approvals.tasks.generated",
  "approvals.tasks.approved",
  "ready_for_implementation",
  "auto-approve",
];

const languageParityFacetKinds = ["instructions", "policies", "output-contracts"];
const sharedContractTerms = [
  ...new Set([
    ...facetSpecs.flatMap((spec) => spec.terms),
    ...lifecycleTerms,
    "init",
    "requirements",
    "design",
    "tasks",
    "quick",
    "verdict",
    "evidence",
    "findings",
    "sharedContractValidation",
    "fix_targets",
    ".kiro/specs/<feature>",
    ".kiro/settings/templates/specs/init.json",
    "requirements-init.md",
    "kiro-spec-init",
    "kiro-spec-requirements",
    "kiro-spec-design",
    "kiro-spec-tasks",
    "kiro-spec-quick",
    "validate:kiro-spec-generation-workflows",
    "test:kiro-spec-generation-workflows",
    "takt -w",
    "takt --workflow",
    "workflow_call",
  ]),
].sort();

function readText(path) {
  return readFileSync(path, "utf8");
}

function rel(repoRoot, path) {
  return relative(repoRoot, path);
}

function containsAll(content, terms, path, failures, repoRoot, code) {
  for (const term of terms) {
    if (!content.includes(term)) {
      failures.push(`${code}: ${rel(repoRoot, path)} missing required term: ${term}`);
    }
  }
}

function listBasenames(repoRoot, relativeDir, extension) {
  const dir = join(repoRoot, relativeDir);
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((file) => file.startsWith("kiro-spec-") && file.endsWith(extension))
    .map((file) => file.slice(0, -extension.length))
    .sort();
}

function compareSets(failures, scope, enValues, jaValues) {
  for (const value of enValues) {
    if (!jaValues.includes(value)) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${scope} has ${value} in en only`);
    }
  }
  for (const value of jaValues) {
    if (!enValues.includes(value)) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${scope} has ${value} in ja only`);
    }
  }
}

function canonicalBlock(content, key) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) {
    return [];
  }
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\S/.test(line)) {
      break;
    }
    if (line.trim() && !line.trimStart().startsWith("#")) {
      block.push(line.replace(/\s+$/, ""));
    }
  }
  return block;
}

function topLevelScalar(content, key) {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)\\s*$`, "m"));
  return match?.[1] ?? "";
}

function topLevelMap(content, key) {
  const entries = [];
  for (const line of canonicalBlock(content, key)) {
    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*(.+)$/);
    if (match) {
      entries.push(`${match[1]}=${match[2]}`);
    }
  }
  return entries;
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
    const nameMatch = block.join("\n").match(/^  - name:\s*(.+)\s*$/m);
    return nameMatch?.[1] ?? "";
  }
  const match = block.join("\n").match(new RegExp(`^    ${key}:\\s*(.+)\\s*$`, "m"));
  return match?.[1] ?? "";
}

function indentedList(block, key) {
  const values = [];
  const lines = block.join("\n").split("\n");
  const start = lines.findIndex((line) => line === `    ${key}:`);
  if (start === -1) {
    return values;
  }
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^    [A-Za-z_]/.test(line)) {
      break;
    }
    const match = line.match(/^      -\s+(.+)$/);
    if (match) {
      values.push(match[1]);
    }
  }
  return values;
}

function workflowMachineFields(content) {
  const fields = {
    name: topLevelScalar(content, "name"),
    workflow_config: canonicalBlock(content, "workflow_config"),
    max_steps: topLevelScalar(content, "max_steps"),
    initial_step: topLevelScalar(content, "initial_step"),
    instructions: topLevelMap(content, "instructions"),
    policies: topLevelMap(content, "policies"),
    report_formats: topLevelMap(content, "report_formats"),
  };
  for (const [index, block] of stepBlocks(content).entries()) {
    fields[`steps[${index}].name`] = stepScalar(block, "name");
    fields[`steps[${index}].edit`] = stepScalar(block, "edit");
    fields[`steps[${index}].persona`] = stepScalar(block, "persona");
    fields[`steps[${index}].policy`] = indentedList(block, "policy");
    fields[`steps[${index}].knowledge`] = indentedList(block, "knowledge");
    fields[`steps[${index}].required_permission_mode`] = stepScalar(block, "required_permission_mode");
    fields[`steps[${index}].instruction`] = stepScalar(block, "instruction");
    fields[`steps[${index}].output_contract_formats`] = block
      .filter((line) => /^\s+format:\s+/.test(line))
      .map((line) => line.trim());
    fields[`steps[${index}].rules.next`] = block
      .filter((line) => /^\s+next:\s+/.test(line))
      .map((line) => line.trim());
    fields[`steps[${index}].rules.condition`] = block
      .filter((line) => /^\s+- condition:\s+/.test(line))
      .map((line) => line.trim());
  }
  return fields;
}

function compareMachineFields(failures, relPath, enFields, jaFields) {
  const keys = [...new Set([...Object.keys(enFields), ...Object.keys(jaFields)])].sort();
  for (const key of keys) {
    const enValue = JSON.stringify(enFields[key] ?? null);
    const jaValue = JSON.stringify(jaFields[key] ?? null);
    if (enValue !== jaValue) {
      failures.push(
        `LANGUAGE_PARITY_DRIFT: workflow machine field ${relPath} ${key} mismatch: en=${enValue} ja=${jaValue}`,
      );
    }
  }
}

function contractTerms(content) {
  return sharedContractTerms.filter((term) => content.includes(term));
}

function validateLanguageParity(repoRoot) {
  const failures = [];
  const enWorkflows = listBasenames(repoRoot, ".takt/en/workflows", ".yaml");
  const jaWorkflows = listBasenames(repoRoot, ".takt/ja/workflows", ".yaml");
  compareSets(failures, "workflows", enWorkflows, jaWorkflows);

  for (const name of enWorkflows.filter((workflow) => jaWorkflows.includes(workflow))) {
    const enPath = join(repoRoot, ".takt", "en", "workflows", `${name}.yaml`);
    const jaPath = join(repoRoot, ".takt", "ja", "workflows", `${name}.yaml`);
    compareMachineFields(
      failures,
      `.takt/{en,ja}/workflows/${name}.yaml`,
      workflowMachineFields(readText(enPath)),
      workflowMachineFields(readText(jaPath)),
    );
  }

  for (const kind of languageParityFacetKinds) {
    const enFacets = listBasenames(repoRoot, `.takt/en/facets/${kind}`, ".md");
    const jaFacets = listBasenames(repoRoot, `.takt/ja/facets/${kind}`, ".md");
    compareSets(failures, `facets/${kind}`, enFacets, jaFacets);

    for (const name of enFacets.filter((facet) => jaFacets.includes(facet))) {
      const enPath = join(repoRoot, ".takt", "en", "facets", kind, `${name}.md`);
      const jaPath = join(repoRoot, ".takt", "ja", "facets", kind, `${name}.md`);
      const enTerms = contractTerms(readText(enPath));
      const jaTerms = contractTerms(readText(jaPath));
      for (const term of enTerms) {
        if (!jaTerms.includes(term)) {
          failures.push(
            `LANGUAGE_PARITY_DRIFT: markdown contract terms .takt/{en,ja}/facets/${kind}/${name}.md missing in ja: ${term}`,
          );
        }
      }
      for (const term of jaTerms) {
        if (!enTerms.includes(term)) {
          failures.push(
            `LANGUAGE_PARITY_DRIFT: markdown contract terms .takt/{en,ja}/facets/${kind}/${name}.md missing in en: ${term}`,
          );
        }
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

function validateWorkflowFiles(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    for (const spec of phaseWorkflowSpecs) {
      const path = join(repoRoot, ".takt", lang, "workflows", `${spec.name}.yaml`);
      if (!existsSync(path)) {
        failures.push(`WORKFLOW_MISSING: ${rel(repoRoot, path)} missing`);
        continue;
      }

      const content = readText(path);
      containsAll(content, spec.requiredTerms, path, failures, repoRoot, "WORKFLOW_DRIFT");

      for (const facet of spec.instructionFacets) {
        if (!content.includes(`${facet}: ../facets/instructions/${facet}.md`)) {
          failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing instruction reference ${facet}`);
        }
      }
      for (const facet of spec.policyFacets) {
        if (!content.includes(`${facet}: ../facets/policies/${facet}.md`)) {
          failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing policy reference ${facet}`);
        }
      }
      for (const contract of spec.outputContracts) {
        if (!content.includes(`${contract}: ../facets/output-contracts/${contract}.md`)) {
          failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing output contract reference ${contract}`);
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateFacetFiles(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    for (const spec of facetSpecs) {
      const path = join(repoRoot, ".takt", lang, "facets", spec.kind, `${spec.name}.md`);
      if (!existsSync(path)) {
        failures.push(`FACET_MISSING: ${rel(repoRoot, path)} missing`);
        continue;
      }
      const content = readText(path);
      containsAll(content, spec.terms, path, failures, repoRoot, "FACET_DRIFT");
      if (!/^\s*\{extends:\s*[^}]+}\s*$/m.test(content) && !content.includes("Full custom reason:")) {
        failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} must use {extends: parent} or state Full custom reason`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateLifecycleTerms(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const path = join(repoRoot, ".takt", lang, "facets", "policies", "kiro-spec-lifecycle.md");
    if (!existsSync(path)) {
      failures.push(`LIFECYCLE_DRIFT: ${rel(repoRoot, path)} missing shared lifecycle policy`);
      continue;
    }
    containsAll(readText(path), lifecycleTerms, path, failures, repoRoot, "LIFECYCLE_DRIFT");
  }
  return { ok: failures.length === 0, failures };
}

function validateQuickComposition(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const path = join(repoRoot, ".takt", lang, "workflows", "kiro-spec-quick.yaml");
    if (!existsSync(path)) {
      failures.push(`QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} missing`);
      continue;
    }

    const content = readText(path);
    const requiredSteps = ["quick-init", "quick-requirements", "quick-design", "quick-tasks", "quick-sanity-review"];
    containsAll(content, requiredSteps, path, failures, repoRoot, "QUICK_COMPOSITION_DRIFT");

    if (/\bworkflow_call\b/.test(content)) {
      failures.push(`QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} must not depend on workflow_call`);
    }
    if (/\btakt\b[^\n]*(?:-w\s+|--workflow(?:\s+|=))kiro-spec-(?:init|requirements|design|tasks|quick)\b/.test(content)) {
      failures.push(`QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} must not use nested takt execution`);
    }
    if (/\bkiro-(?:discovery|spec-batch|impl)\b/.test(content)) {
      failures.push(`QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} must keep discovery, batch, and implementation out of quick path`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateScopeGuard() {
  return { ok: true, failures: [] };
}

export function validateKiroSpecGenerationWorkflows(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const sections = {
    workflowFiles: validateWorkflowFiles(repoRoot),
    facetFiles: validateFacetFiles(repoRoot),
    lifecycleTerms: validateLifecycleTerms(repoRoot),
    quickComposition: validateQuickComposition(repoRoot),
    languageParity: validateLanguageParity(repoRoot),
    scopeGuard: validateScopeGuard(),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
}

if (process.argv[1] && __filename === resolve(process.argv[1])) {
  const result = validateKiroSpecGenerationWorkflows();
  if (result.ok) {
    console.log("Kiro spec generation workflow validation passed");
  } else {
    console.error("Kiro spec generation workflow validation failed");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}
