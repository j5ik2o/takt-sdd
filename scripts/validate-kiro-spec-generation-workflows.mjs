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
    instructionFacets: ["kiro-spec-requirements", "kiro-spec-requirements-review"],
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
    instructionFacets: [
      "kiro-spec-init",
      "kiro-spec-requirements",
      "kiro-spec-design",
      "kiro-spec-tasks",
      "kiro-spec-quick-sanity-review",
    ],
    policyFacets: [
      "kiro-artifact-operations",
      "kiro-spec-lifecycle",
      "kiro-spec-generation",
      "kiro-spec-task-annotations",
    ],
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
    name: "kiro-spec-requirements-review",
    terms: ["Review Requirements Draft", "requirements review gate", "read-only", "validation.verdict", "PASS", "NEEDS_FIX", "BLOCKED"],
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
    name: "kiro-spec-quick-sanity-review",
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

const builtinInheritanceFacetSpecs = [
  ...facetSpecs,
  {
    kind: "policies",
    name: "kiro-spec-lifecycle",
    terms: lifecycleTerms,
  },
];

const downstreamBoundarySpecs = [
  {
    feature: "kiro-discovery-batch-workflows",
    path: ".kiro/specs/kiro-discovery-batch-workflows/design.md",
    requiredTerms: [
      "kiro-spec-generation-workflows",
      "kiro-spec-init",
      "kiro-spec-requirements",
      "kiro-spec-design",
      "kiro-spec-tasks",
      "standalone phase workflow",
      "generation result contract",
      "requirements/design/tasks の本文生成 rules",
      "individual generation の full behavior は scope 外",
    ],
  },
  {
    feature: "kiro-iterative-implementation-workflow",
    path: ".kiro/specs/kiro-iterative-implementation-workflow/design.md",
    requiredTerms: [
      "kiro-spec-generation-workflows",
      "tasks.md",
      "_Boundary:_",
      "_Depends:_",
      "numeric requirement coverage",
      "ready_for_implementation",
      "artifact generation",
      "spec generation",
    ],
  },
];

const quickPhaseParitySpecs = [
  {
    step: "quick-init",
    termSets: [["phase init", "spec.json written", "requirements.md written", "initialized"]],
  },
  {
    step: "quick-requirements",
    termSets: [["phase requirements", "requirements.md written", "requirements-generated", "approvals.requirements.generated true"]],
  },
  {
    step: "quick-design",
    termSets: [
      [
        "phase design",
        "design.md written",
        "research.md written",
        "design-generated",
        "approvals.requirements.approved true",
        "approvals.design.generated true",
      ],
    ],
  },
  {
    step: "quick-tasks",
    termSets: [
      [
        "same auto-approve semantics",
        "phase tasks",
        "tasks.md written",
        "tasks-generated",
        "approvals.requirements.approved true",
        "approvals.design.approved true",
        "approvals.tasks.generated true",
        "approvals.tasks.approved true",
        "ready_for_implementation true",
        "task plan review PASS",
        "task graph sanity review PASS",
      ],
      [
        "not auto-approve",
        "phase tasks",
        "tasks.md written",
        "tasks-generated",
        "approvals.requirements.approved true",
        "approvals.design.approved true",
        "approvals.tasks.generated true",
        "task plan review PASS",
        "task graph sanity review PASS",
      ],
    ],
  },
];

const taskWorkflowCompletionTermSets = [
  [
    "auto-approve",
    "phase tasks",
    "tasks.md written",
    "tasks-generated",
    "approvals.requirements.approved true",
    "approvals.design.approved true",
    "approvals.tasks.generated true",
    "approvals.tasks.approved true",
    "ready_for_implementation true",
    "task plan review PASS",
    "task graph sanity review PASS",
  ],
  [
    "not auto-approve",
    "phase tasks",
    "tasks.md written",
    "tasks-generated",
    "approvals.requirements.approved true",
    "approvals.design.approved true",
    "approvals.tasks.generated true",
    "task plan review PASS",
    "task graph sanity review PASS",
  ],
];

const unsupportedExtendsPattern = /[/:\\]/;

const approvalStages = ["requirements", "design", "tasks"];
const approvalFields = ["generated", "approved"];
const phaseArtifactContracts = {
  initialized: ["requirements.md"],
  "requirements-generated": ["requirements.md"],
  "design-generated": ["requirements.md", "design.md", "research.md"],
  "tasks-generated": ["requirements.md", "design.md", "tasks.md"],
};
const requiredDesignSections = ["Boundary Commitments", "File Structure Plan", "Requirements Traceability"];
const taskAnnotationContractPaths = [
  ".kiro/settings/templates/specs/tasks.md",
  ".takt/en/facets/policies/kiro-spec-task-annotations.md",
  ".takt/ja/facets/policies/kiro-spec-task-annotations.md",
];
const packageScriptSpecs = [
  {
    name: "validate:kiro-spec-generation-workflows",
    command: "node scripts/validate-kiro-spec-generation-workflows.mjs",
  },
  {
    name: "test:kiro-spec-generation-workflows",
    command: "node --test tests/kiro-spec-generation-workflows.test.mjs",
  },
];

const allowedPermissionModes = ["readonly", "edit", "full"];
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
    "kiro-spec-quick-sanity-review",
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

function conditionLines(block) {
  return block
    .join("\n")
    .split("\n")
    .map((line) => line.match(/^\s*-\s+condition:\s*(.+)\s*$/)?.[1])
    .filter(Boolean);
}

function hasConditionWithTerms(conditions, terms) {
  return conditions.some((condition) => terms.every((term) => condition.includes(term)));
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
      for (const block of stepBlocks(content)) {
        const stepName = stepScalar(block, "name") || "(unknown step)";
        const permissionMode = stepScalar(block, "required_permission_mode");
        if (permissionMode && !allowedPermissionModes.includes(permissionMode)) {
          failures.push(
            `WORKFLOW_DRIFT: ${rel(repoRoot, path)} step ${stepName} has invalid required_permission_mode: ${permissionMode}`,
          );
        }
      }

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
    const blocks = stepBlocks(content);
    for (const spec of quickPhaseParitySpecs) {
      const block = blocks.find((candidate) => stepScalar(candidate, "name") === spec.step);
      if (!block) {
        failures.push(`QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} missing quick parity step: ${spec.step}`);
        continue;
      }
      const conditions = conditionLines(block);
      for (const terms of spec.termSets) {
        if (!hasConditionWithTerms(conditions, terms)) {
          failures.push(
            `QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} step ${spec.step} missing standalone parity condition with terms: ${terms.join(", ")}`,
          );
        }
      }
    }

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

function validateTaskWorkflowCompletion(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const path = join(repoRoot, ".takt", lang, "workflows", "kiro-spec-tasks.yaml");
    if (!existsSync(path)) {
      failures.push(`TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing`);
      continue;
    }

    const content = readText(path);
    const blocks = stepBlocks(content);
    const block = blocks.find((candidate) => stepScalar(candidate, "name") === "generate-tasks");
    if (!block) {
      failures.push(`TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing generate-tasks step`);
      continue;
    }

    const conditions = conditionLines(block);
    for (const terms of taskWorkflowCompletionTermSets) {
      if (!hasConditionWithTerms(conditions, terms)) {
        failures.push(
          `TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} generate-tasks missing completion condition with terms: ${terms.join(", ")}`,
        );
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function listSpecDirectories(repoRoot) {
  const specsRoot = join(repoRoot, ".kiro", "specs");
  if (!existsSync(specsRoot)) {
    return [];
  }
  return readdirSync(specsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(specsRoot, entry.name))
    .filter((specDir) => existsSync(join(specDir, "spec.json")))
    .sort();
}

function readSpecJson(path, failures, repoRoot) {
  try {
    return JSON.parse(readText(path));
  } catch (error) {
    failures.push(`LIFECYCLE_INCONSISTENT: ${rel(repoRoot, path)} has invalid JSON: ${error.message}`);
    return null;
  }
}

function approvalValue(spec, stage, field) {
  return spec?.approvals?.[stage]?.[field];
}

function requireBooleanSpecField(failures, specPath, repoRoot, label, value) {
  if (typeof value !== "boolean") {
    failures.push(`LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} ${label} must be boolean`);
  }
}

function requireApproval(failures, specPath, repoRoot, spec, stage, field, expected) {
  const value = approvalValue(spec, stage, field);
  requireBooleanSpecField(failures, specPath, repoRoot, `approvals.${stage}.${field}`, value);
  if (typeof value === "boolean" && value !== expected) {
    failures.push(
      `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} approvals.${stage}.${field} must be ${expected}`,
    );
  }
}

function validateApprovalShape(failures, specPath, repoRoot, spec) {
  for (const stage of approvalStages) {
    for (const field of approvalFields) {
      requireBooleanSpecField(failures, specPath, repoRoot, `approvals.${stage}.${field}`, approvalValue(spec, stage, field));
    }
  }
  requireBooleanSpecField(failures, specPath, repoRoot, "ready_for_implementation", spec.ready_for_implementation);
}

function validateGeneratedProgression(failures, specPath, repoRoot, spec) {
  if (approvalValue(spec, "design", "generated") && !approvalValue(spec, "requirements", "generated")) {
    failures.push(
      `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} approvals.design.generated requires approvals.requirements.generated`,
    );
  }
  if (approvalValue(spec, "tasks", "generated")) {
    for (const stage of ["requirements", "design"]) {
      if (!approvalValue(spec, stage, "generated")) {
        failures.push(
          `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} approvals.tasks.generated requires approvals.${stage}.generated`,
        );
      }
    }
  }
}

function validateApprovedProgression(failures, specPath, repoRoot, spec) {
  for (const stage of approvalStages) {
    if (approvalValue(spec, stage, "approved") && !approvalValue(spec, stage, "generated")) {
      failures.push(
        `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} approvals.${stage}.approved requires approvals.${stage}.generated`,
      );
    }
  }
}

function validateReadyState(failures, specPath, repoRoot, spec) {
  if (spec.ready_for_implementation) {
    for (const stage of approvalStages) {
      if (!approvalValue(spec, stage, "approved")) {
        failures.push(
          `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} ready_for_implementation true requires approvals.${stage}.approved true`,
        );
      }
    }
  }
  if (approvalValue(spec, "tasks", "approved") && !spec.ready_for_implementation) {
    failures.push(
      `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} approvals.tasks.approved true requires ready_for_implementation true`,
    );
  }
}

function validatePhaseApprovals(failures, specPath, repoRoot, spec) {
  switch (spec.phase) {
    case "initialized":
      for (const stage of approvalStages) {
        for (const field of approvalFields) {
          requireApproval(failures, specPath, repoRoot, spec, stage, field, false);
        }
      }
      if (spec.ready_for_implementation) {
        failures.push(
          `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} initialized phase requires ready_for_implementation false`,
        );
      }
      break;
    case "requirements-generated":
      requireApproval(failures, specPath, repoRoot, spec, "requirements", "generated", true);
      requireApproval(failures, specPath, repoRoot, spec, "design", "generated", false);
      requireApproval(failures, specPath, repoRoot, spec, "tasks", "generated", false);
      if (spec.ready_for_implementation) {
        failures.push(
          `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} requirements-generated phase requires ready_for_implementation false`,
        );
      }
      break;
    case "design-generated":
      requireApproval(failures, specPath, repoRoot, spec, "requirements", "generated", true);
      requireApproval(failures, specPath, repoRoot, spec, "requirements", "approved", true);
      requireApproval(failures, specPath, repoRoot, spec, "design", "generated", true);
      requireApproval(failures, specPath, repoRoot, spec, "tasks", "generated", false);
      if (spec.ready_for_implementation) {
        failures.push(
          `LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} design-generated phase requires ready_for_implementation false`,
        );
      }
      break;
    case "tasks-generated":
      for (const stage of approvalStages) {
        requireApproval(failures, specPath, repoRoot, spec, stage, "generated", true);
      }
      for (const stage of ["requirements", "design"]) {
        requireApproval(failures, specPath, repoRoot, spec, stage, "approved", true);
      }
      break;
    default:
      failures.push(`LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} has unknown phase: ${spec.phase}`);
  }
}

function validateSpecArtifactLifecycle(repoRoot) {
  const failures = [];
  for (const specDir of listSpecDirectories(repoRoot)) {
    const specPath = join(specDir, "spec.json");
    const spec = readSpecJson(specPath, failures, repoRoot);
    if (!spec) {
      continue;
    }

    const requiredArtifacts = phaseArtifactContracts[spec.phase];
    if (!requiredArtifacts) {
      failures.push(`LIFECYCLE_INCONSISTENT: ${rel(repoRoot, specPath)} has unsupported phase artifact contract`);
    } else {
      for (const artifact of requiredArtifacts) {
        const artifactPath = join(specDir, artifact);
        if (!existsSync(artifactPath)) {
          failures.push(`ARTIFACT_MISSING: ${rel(repoRoot, artifactPath)} required for phase ${spec.phase}`);
        }
      }
    }

    validateApprovalShape(failures, specPath, repoRoot, spec);
    validateGeneratedProgression(failures, specPath, repoRoot, spec);
    validateApprovedProgression(failures, specPath, repoRoot, spec);
    validateReadyState(failures, specPath, repoRoot, spec);
    validatePhaseApprovals(failures, specPath, repoRoot, spec);
  }
  return { ok: failures.length === 0, failures };
}

function hasHeading(content, level, title) {
  return new RegExp(`^${"#".repeat(level)}\\s+${title}\\s*$`, "m").test(content);
}

function numberedRequirementSections(content) {
  const matches = [...content.matchAll(/^### Requirement\s+(\d+):\s+.+$/gm)];
  return matches.map((match, index) => {
    const next = matches[index + 1];
    return {
      id: match[1],
      body: content.slice(match.index, next?.index ?? content.length),
    };
  });
}

function validateRequirementsArtifact(failures, artifactPath, repoRoot, content) {
  const sections = numberedRequirementSections(content);
  if (sections.length === 0) {
    failures.push(
      `ARTIFACT_SECTION_DRIFT: ${rel(repoRoot, artifactPath)} must use numeric headings like "### Requirement 1:"`,
    );
    return;
  }

  for (const section of sections) {
    const criteria = [...section.body.matchAll(/^\d+\.\s+(.+)$/gm)].map((match) => match[1]);
    if (criteria.length === 0) {
      failures.push(
        `ARTIFACT_SECTION_DRIFT: ${rel(repoRoot, artifactPath)} Requirement ${section.id} missing numeric acceptance criteria`,
      );
      continue;
    }
    for (const criterion of criteria) {
      if (!/(?:場合|は|^When\b|^If\b|^While\b|^Where\b|^Upon\b|\bshall\b|\bmust\b)/i.test(criterion)) {
        failures.push(
          `ARTIFACT_SECTION_DRIFT: ${rel(repoRoot, artifactPath)} Requirement ${section.id} acceptance criterion must keep an EARS fixed phrase`,
        );
      }
    }
  }
}

function validateDesignArtifact(failures, artifactPath, repoRoot, content) {
  for (const section of requiredDesignSections) {
    if (!hasHeading(content, 2, section)) {
      failures.push(`ARTIFACT_SECTION_DRIFT: ${rel(repoRoot, artifactPath)} missing required section: ${section}`);
    }
  }
}

function executableTaskBlocks(content) {
  const matches = [...content.matchAll(/^- \[[ xX]\]\s+(\d+(?:\.\d+)?)(?:\.)?\s+(.+)$/gm)];
  return matches
    .filter((match, index) => {
      const id = match[1];
      const next = matches[index + 1];
      return id.includes(".") || !next || !next[1].startsWith(`${id}.`);
    })
    .map((match, index, executableMatches) => {
      const next = executableMatches[index + 1];
      return {
        id: match[1],
        title: match[2],
        block: content.slice(match.index, next?.index ?? content.length),
      };
    });
}

function taskAnnotationValue(block, label) {
  const match = block.match(new RegExp(`^\\s+-\\s+_${label}:_\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.trim();
}

function taskRequirementsValue(block) {
  const match = block.match(/^\s+-\s+_Requirements:\s*(.+?)_\s*$/m);
  return match?.[1]?.trim();
}

function hasObservableCompletion(block) {
  return block
    .split("\n")
    .some((line) => /^\s+-\s+/.test(line) && !/^\s+-\s+_(?:Requirements|Boundary|Depends):/.test(line));
}

function validateTaskRequirements(failures, artifactPath, repoRoot, task, requirements) {
  if (!requirements) {
    failures.push(`TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} missing _Requirements:_`);
    return;
  }

  for (const requirement of requirements.split(",").map((value) => value.trim())) {
    if (!/^\d+(?:\.\d+)?$/.test(requirement)) {
      failures.push(
        `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} has non-numeric requirement id: ${requirement}`,
      );
    }
  }
}

function boundaryNames(value) {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function validateTaskDependencies(failures, artifactPath, repoRoot, task, depends, taskIds) {
  if (depends === "none") {
    return;
  }
  if (/^none$/i.test(depends)) {
    failures.push(
      `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} dependency-free tasks must use "_Depends:_ none" exactly`,
    );
    return;
  }

  for (const dependency of depends.split(",").map((value) => value.trim())) {
    if (!/^\d+(?:\.\d+)?$/.test(dependency)) {
      failures.push(
        `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} has invalid dependency id: ${dependency}`,
      );
    } else if (dependency === task.id) {
      failures.push(`TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} depends on itself`);
    } else if (!taskIds.has(dependency)) {
      failures.push(
        `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} depends on unknown task: ${dependency}`,
      );
    }
  }
}

function validateTasksArtifact(failures, artifactPath, repoRoot, content) {
  const tasks = executableTaskBlocks(content);
  const taskIds = new Set(tasks.map((task) => task.id));
  const parallelTasks = [];
  for (const task of tasks) {
    const boundary = taskAnnotationValue(task.block, "Boundary");
    const depends = taskAnnotationValue(task.block, "Depends");
    const requirements = taskRequirementsValue(task.block);

    if (!hasObservableCompletion(task.block)) {
      failures.push(`TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} missing observable completion`);
    }
    validateTaskRequirements(failures, artifactPath, repoRoot, task, requirements);
    if (!boundary) {
      failures.push(`TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} missing _Boundary:_`);
    } else if (/\(P\)/.test(task.title)) {
      parallelTasks.push({ id: task.id, boundaries: boundaryNames(boundary) });
    }
    if (!depends) {
      failures.push(`TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} missing _Depends:_`);
      continue;
    }

    validateTaskDependencies(failures, artifactPath, repoRoot, task, depends, taskIds);

    if (/\(P\)/.test(task.title) && depends !== "none") {
      failures.push(
        `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} task ${task.id} uses (P) with non-empty dependencies`,
      );
    }
  }

  for (let leftIndex = 0; leftIndex < parallelTasks.length; leftIndex += 1) {
    const left = parallelTasks[leftIndex];
    const leftBoundaries = new Set(left.boundaries);
    for (const right of parallelTasks.slice(leftIndex + 1)) {
      const overlap = right.boundaries.filter((boundary) => leftBoundaries.has(boundary));
      if (overlap.length > 0) {
        failures.push(
          `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, artifactPath)} tasks ${left.id} and ${right.id} use (P) with overlapping boundary: ${overlap.join(", ")}`,
        );
      }
    }
  }
}

function validateGeneratedArtifacts(repoRoot) {
  const failures = [];
  for (const specDir of listSpecDirectories(repoRoot)) {
    const spec = readSpecJson(join(specDir, "spec.json"), failures, repoRoot);
    const requirementsPath = join(specDir, "requirements.md");
    if (existsSync(requirementsPath) && spec?.phase !== "initialized") {
      validateRequirementsArtifact(failures, requirementsPath, repoRoot, readText(requirementsPath));
    }

    const designPath = join(specDir, "design.md");
    if (existsSync(designPath)) {
      validateDesignArtifact(failures, designPath, repoRoot, readText(designPath));
    }

    const tasksPath = join(specDir, "tasks.md");
    if (existsSync(tasksPath)) {
      validateTasksArtifact(failures, tasksPath, repoRoot, readText(tasksPath));
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateTaskAnnotationContract(repoRoot) {
  const failures = [];
  for (const relativePath of taskAnnotationContractPaths) {
    const path = join(repoRoot, relativePath);
    if (!existsSync(path)) {
      failures.push(`TASK_ANNOTATION_DRIFT: ${relativePath} missing task annotation grammar source`);
      continue;
    }
    const content = readText(path);
    containsAll(content, ["_Boundary:_", "_Depends:_ none"], path, failures, repoRoot, "TASK_ANNOTATION_DRIFT");
    if (!/(?:every executable task|すべての executable task)/i.test(content)) {
      failures.push(
        `TASK_ANNOTATION_DRIFT: ${rel(repoRoot, path)} must require Boundary annotation for every executable task`,
      );
    }
  }
  return { ok: failures.length === 0, failures };
}

function validatePackageScripts(repoRoot) {
  const failures = [];
  const packagePath = join(repoRoot, "package.json");
  if (!existsSync(packagePath)) {
    failures.push("PACKAGE_SCRIPT_DRIFT: package.json missing");
    return { ok: false, failures };
  }

  let packageJson;
  try {
    packageJson = JSON.parse(readText(packagePath));
  } catch (error) {
    failures.push(`PACKAGE_SCRIPT_DRIFT: ${rel(repoRoot, packagePath)} has invalid JSON: ${error.message}`);
    return { ok: false, failures };
  }

  for (const spec of packageScriptSpecs) {
    const script = packageJson.scripts?.[spec.name];
    if (script !== spec.command) {
      failures.push(
        `PACKAGE_SCRIPT_DRIFT: ${rel(repoRoot, packagePath)} scripts.${spec.name} must equal "${spec.command}"`,
      );
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateDownstreamBoundaries(repoRoot) {
  const failures = [];
  for (const spec of downstreamBoundarySpecs) {
    const path = join(repoRoot, spec.path);
    if (!existsSync(path)) {
      continue;
    }

    containsAll(readText(path), spec.requiredTerms, path, failures, repoRoot, "DOWNSTREAM_BOUNDARY_DRIFT");
  }
  return { ok: failures.length === 0, failures };
}

function extendsParent(content) {
  return content.match(/^\s*\{extends:\s*([^}]+?)\s*}\s*$/m)?.[1]?.trim();
}

function validateBuiltinFacetInheritance(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    for (const spec of builtinInheritanceFacetSpecs) {
      const path = join(repoRoot, ".takt", lang, "facets", spec.kind, `${spec.name}.md`);
      if (!existsSync(path)) {
        continue;
      }

      const content = readText(path);
      const parent = extendsParent(content);
      if (!parent) {
        if (!content.includes("Full custom reason:")) {
          failures.push(
            `BUILTIN_FACET_INHERITANCE_DRIFT: ${rel(repoRoot, path)} must use {extends: parent} or state Full custom reason`,
          );
        }
        continue;
      }

      if (unsupportedExtendsPattern.test(parent)) {
        failures.push(
          `BUILTIN_FACET_EXTENDS_UNSUPPORTED: ${rel(repoRoot, path)} uses non-bare parent reference: ${parent}`,
        );
        continue;
      }

      const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", spec.kind, `${parent}.md`);
      if (!existsSync(parentPath)) {
        failures.push(
          `BUILTIN_FACET_NOT_FOUND: ${rel(repoRoot, path)} extends missing built-in facet ${rel(repoRoot, parentPath)}`,
        );
      }
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
    specArtifactLifecycle: validateSpecArtifactLifecycle(repoRoot),
    generatedArtifacts: validateGeneratedArtifacts(repoRoot),
    taskAnnotationContract: validateTaskAnnotationContract(repoRoot),
    packageScripts: validatePackageScripts(repoRoot),
    quickComposition: validateQuickComposition(repoRoot),
    taskWorkflowCompletion: validateTaskWorkflowCompletion(repoRoot),
    languageParity: validateLanguageParity(repoRoot),
    downstreamBoundaries: validateDownstreamBoundaries(repoRoot),
    builtinFacetInheritance: validateBuiltinFacetInheritance(repoRoot),
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
