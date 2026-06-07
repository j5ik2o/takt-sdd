#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = join(__dirname, "..");
let repoRoot = defaultRepoRoot;
const languages = ["en", "ja"];

const workflowSpecs = [
  {
    file: "kiro-spec-status.yaml",
    instructions: ["kiro-report-spec-status"],
    reports: ["kiro-status"],
    expectedSteps: ["collect-status-evidence", "classify-status", "report-status"],
    requiredTerms: ["kiro-status", "FEATURE_NOT_FOUND", "ARTIFACT_MISSING", "LIFECYCLE_INCONSISTENT", "SPEC_JSON_INVALID", "NOT_READY", "INCONSISTENT"],
  },
  {
    file: "kiro-validate-gap.yaml",
    instructions: ["kiro-validate-gap-readiness"],
    reports: ["kiro-validation-result"],
    expectedSteps: ["collect-gap-evidence", "validate-gap", "report-gap"],
    primaryField: "DECISION",
    requiredTerms: ["kiro-validation-result", "DECISION", "MANUAL_VERIFY_REQUIRED", "GO", "NO-GO"],
  },
  {
    file: "kiro-validate-design.yaml",
    instructions: ["kiro-validate-design-readiness"],
    reports: ["kiro-validation-result"],
    expectedSteps: ["collect-design-evidence", "validate-design", "report-design"],
    primaryField: "DECISION",
    requiredTerms: ["kiro-validation-result", "Boundary Commitments", "File Structure Plan", "DECISION", "NO-GO"],
  },
  {
    file: "kiro-validate-impl.yaml",
    instructions: ["kiro-validate-impl-readiness"],
    reports: ["kiro-validation-result"],
    expectedSteps: ["collect-impl-evidence", "validate-impl", "report-impl"],
    primaryField: "DECISION",
    requiredTerms: ["kiro-validation-result", "DECISION", "MANUAL_VERIFY_REQUIRED", "tasks.md", "ready_for_implementation"],
  },
];

const instructionSpecs = [
  {
    file: "kiro-report-spec-status.md",
    parent: "gather-review",
    skill: "kiro-spec-status",
    skillSection: "### Step 3: Generate Report",
    terms: ["spec.json", "phase", "approvals", "ready_for_implementation", "initialized", "FOUND", "INVALID", "FEATURE_NOT_FOUND", "ARTIFACT_MISSING", "SPEC_JSON_INVALID", "LIFECYCLE_INCONSISTENT", "READY", "NOT_READY", "INCONSISTENT", "kiro-status"],
  },
  {
    file: "kiro-validate-gap-readiness.md",
    parent: "review-qa",
    skill: "kiro-validate-gap",
    skillSection: "## Core Task",
    primaryField: "DECISION",
    primaryEnums: ["GO", "NO-GO", "MANUAL_VERIFY_REQUIRED"],
    terms: ["requirements.md", "existing implementation", "missing components", "integration points", "recommended next action", "observed evidence", "missing evidence", "findings", "evidence", "DECISION", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED", "MANUAL_VERIFICATION_REQUIRED", "kiro-validation-result"],
  },
  {
    file: "kiro-validate-design-readiness.md",
    parent: "review-arch",
    skill: "kiro-validate-design",
    skillSection: "## Execution Steps",
    primaryField: "DECISION",
    primaryEnums: ["GO", "NO-GO", "MANUAL_VERIFY_REQUIRED"],
    terms: ["requirements coverage", "Boundary Commitments", "File Structure Plan", "validation hooks", "boundary violation", "DECISION", "DECISION:", "machine field", "GO/NO-GO", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED", "kiro-validation-result"],
  },
  {
    file: "kiro-validate-impl-readiness.md",
    parent: "supervise",
    skill: "kiro-validate-impl",
    skillSection: "## Execution Steps",
    primaryField: "DECISION",
    primaryEnums: ["GO", "NO-GO", "MANUAL_VERIFY_REQUIRED"],
    terms: ["tasks.md", "ready_for_implementation", "DECISION", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED", "ARTIFACT_MISSING", "LIFECYCLE_INCONSISTENT", "task checkbox", "test/build evidence", "evidence mismatch", "observed evidence", "missing evidence", "findings", "evidence", "MANUAL_VERIFICATION_REQUIRED", "kiro-validation-result"],
  },
  {
    file: "kiro-collect-validation-evidence.md",
    parent: "gather-review",
    terms: ["observed evidence", "missing evidence", "MANUAL_VERIFICATION_REQUIRED", "DECISION", "GO", "findings", "evidence"],
  },
];

const sharedContractFiles = [
  ".takt/{lang}/facets/output-contracts/kiro-status.md",
  ".takt/{lang}/facets/output-contracts/kiro-validation-result.md",
  ".takt/{lang}/facets/policies/kiro-artifact-operations.md",
  ".takt/{lang}/facets/policies/kiro-spec-lifecycle.md",
];

const downstreamFieldContractSpecs = [
  {
    file: "kiro-spec-design.yaml",
    instruction: "kiro-validate-design-readiness",
  },
  {
    file: "kiro-spec-quick.yaml",
    instruction: "kiro-validate-design-readiness",
  },
  {
    file: "kiro-impl.yaml",
    instruction: "kiro-validate-impl-final",
  },
];

function readText(path) {
  return readFileSync(path, "utf8");
}

function rel(path) {
  return relative(repoRoot, path);
}

function containsAll(content, terms, path, failures) {
  for (const term of terms) {
    if (!content.includes(term)) {
      failures.push(`${rel(path)} missing required term: ${term}`);
    }
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) return {};
  const end = content.indexOf("\n---", 4);
  if (end === -1) return {};
  const fields = {};
  for (const line of content.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
    if (!match) continue;
    fields[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return fields;
}

function getStepNames(content) {
  return [...content.matchAll(/^  - name:\s*(.+)\s*$/gm)].map((match) => match[1]);
}

function getStepBlocks(content) {
  const matches = [...content.matchAll(/^  - name:\s*(.+)\s*$/gm)];
  return matches.map((match, index) => {
    const start = match.index;
    const end = matches[index + 1]?.index ?? content.length;
    return { name: match[1], content: content.slice(start, end) };
  });
}

function getInstructionStepBlocks(content, instruction) {
  return getStepBlocks(content).filter((step) =>
    new RegExp(`^\\s+instruction:\\s*${instruction}\\s*$`, "m").test(step.content),
  );
}

function conditionsForStep(stepContent) {
  return [...stepContent.matchAll(/^\s+- condition:\s*(.+)\s*$/gm)].map((match) => match[1]);
}

function hasAllDecisionRoutes(conditions) {
  return ["DECISION GO", "DECISION NO-GO", "DECISION MANUAL_VERIFY_REQUIRED"].every((term) =>
    conditions.some((condition) => condition.includes(term)),
  );
}

function listFilesRecursive(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listFilesRecursive(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function validateSharedContractsExist() {
  const failures = [];
  for (const lang of languages) {
    for (const template of sharedContractFiles) {
      const path = join(repoRoot, template.replace("{lang}", lang));
      if (!existsSync(path)) {
        failures.push(`${rel(path)} missing`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateInstructionFacets() {
  const failures = [];
  for (const lang of languages) {
    for (const spec of instructionSpecs) {
      const path = join(repoRoot, ".takt", lang, "facets", "instructions", spec.file);
      if (!existsSync(path)) {
        failures.push(`${rel(path)} missing`);
        continue;
      }
      const content = readText(path);
      const frontmatter = parseFrontmatter(content);
      if (spec.skill && frontmatter.extends_skill !== spec.skill) {
        failures.push(`${rel(path)} must declare extends_skill: ${spec.skill}`);
      }
      if (spec.skillSection && frontmatter.extends_skill_section !== spec.skillSection) {
        failures.push(`${rel(path)} must declare extends_skill_section: "${spec.skillSection}"`);
      }
      const extendsPattern = new RegExp(`^\\{extends:\\s*${spec.parent}\\s*\\}$`, "m");
      if (!extendsPattern.test(content)) {
        failures.push(`${rel(path)} must extend built-in instructions/${spec.parent} with {extends: ${spec.parent}}`);
      }
      const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", "instructions", `${spec.parent}.md`);
      if (!existsSync(parentPath)) {
        failures.push(`${rel(path)} extends missing built-in parent ${rel(parentPath)}`);
      }
      containsAll(content, spec.terms, path, failures);
      if (spec.primaryField && !content.includes(`primary field`) && !content.includes(`primary workflow-routing field`)) {
        failures.push(`${rel(path)} must describe ${spec.primaryField} as the primary machine field`);
      }
      for (const enumValue of spec.primaryEnums ?? []) {
        if (!content.includes(enumValue)) {
          failures.push(`${rel(path)} missing primary ${spec.primaryField} enum: ${enumValue}`);
        }
      }
      if (!/read-only|読み取り専用|更新しない|変更しない/.test(content)) {
        failures.push(`${rel(path)} must state the read-only validation boundary`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateSkillAdapterParity() {
  const failures = [];
  for (const spec of instructionSpecs.filter((instruction) => instruction.skill)) {
    const frontmatters = languages.map((lang) => {
      const path = join(repoRoot, ".takt", lang, "facets", "instructions", spec.file);
      return { path, frontmatter: existsSync(path) ? parseFrontmatter(readText(path)) : {} };
    });
    const [first, ...rest] = frontmatters;
    for (const candidate of rest) {
      for (const field of ["extends_skill", "extends_skill_section"]) {
        if (candidate.frontmatter[field] !== first.frontmatter[field]) {
          failures.push(
            `${rel(candidate.path)} ${field} must match ${rel(first.path)} for Kiro skill adapter parity`,
          );
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateReadOnlyWorkflowShape() {
  const failures = [];
  for (const lang of languages) {
    for (const spec of workflowSpecs) {
      const path = join(repoRoot, ".takt", lang, "workflows", spec.file);
      if (!existsSync(path)) continue;
      const content = readText(path);
      const stepNames = getStepNames(content);
      if (stepNames.length < 3) {
        failures.push(`${rel(path)} must use read-only collect -> classify/validate -> report steps, not a single prompt wrapper`);
      }
      if (spec.expectedSteps && stepNames.join("\n") !== spec.expectedSteps.join("\n")) {
        failures.push(`${rel(path)} must keep read-only step order: ${spec.expectedSteps.join(" -> ")}`);
      }
      for (const step of getStepBlocks(content)) {
        if (!/^\s+edit:\s*false\s*$/m.test(step.content)) {
          failures.push(`${rel(path)} step ${step.name} must use edit: false`);
        }
        if (!/^\s+required_permission_mode:\s*readonly\s*$/m.test(step.content)) {
          failures.push(`${rel(path)} step ${step.name} must use required_permission_mode: readonly`);
        }
        if (/(repair|debug|write|update|execute|retry|finalize)/i.test(step.name)) {
          failures.push(`${rel(path)} step ${step.name} violates read-only validation shape`);
        }
      }
      const reportStep = getStepBlocks(content).at(-1);
      if (reportStep && !/^\s+output_contracts:\s*$/m.test(reportStep.content)) {
        failures.push(`${rel(path)} final report step must emit the parseable report contract`);
      }
      if (/workflow_call|takt\s+-w|required_permission_mode:\s*edit|\bWrite\b|\bEdit\b|repair-|debug-|update-progress|tasks\.md checkbox update|design\.md update/.test(content)) {
        failures.push(`${rel(path)} contains artifact mutation, nested workflow, repair, or debug behavior`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateWorkflowFiles() {
  const failures = [];
  for (const lang of languages) {
    for (const spec of workflowSpecs) {
      const path = join(repoRoot, ".takt", lang, "workflows", spec.file);
      if (!existsSync(path)) {
        failures.push(`${rel(path)} missing`);
        continue;
      }
      const content = readText(path);
      containsAll(content, spec.requiredTerms, path, failures);
      for (const instruction of spec.instructions) {
        if (!content.includes(`${instruction}: ../facets/instructions/${instruction}.md`)) {
          failures.push(`${rel(path)} missing instruction reference ${instruction}`);
        }
      }
      for (const report of spec.reports) {
        if (!content.includes(`${report}: ../facets/output-contracts/${report}.md`)) {
          failures.push(`${rel(path)} missing report format reference ${report}`);
        }
      }
      if (!/edit:\s*false/.test(content)) {
        failures.push(`${rel(path)} must keep validation steps edit: false`);
      }
      if (/instruction:\s*\n\s*-/.test(content)) {
        failures.push(`${rel(path)} must use a single TAKT instruction reference, not an instruction array`);
      }
      const stepBlocks = getStepBlocks(content);
      for (const step of stepBlocks) {
        const conditions = conditionsForStep(step.content);
        if (spec.primaryField === "DECISION" && /^\s+output_contracts:\s*$/m.test(step.content)) {
          if (!hasAllDecisionRoutes(conditions)) {
            failures.push(`${rel(path)} step ${step.name} must route GO, NO-GO, and MANUAL_VERIFY_REQUIRED with DECISION`);
          }
          if (conditions.some((condition) => /validation\.verdict|review\.verdict/.test(condition))) {
            failures.push(`${rel(path)} step ${step.name} must not route Kiro skill adapter results through validation.verdict or review.verdict`);
          }
        }
      }
      const passIndex = content.indexOf("condition: DECISION GO");
      const manualIndex = content.indexOf("condition: DECISION MANUAL_VERIFY_REQUIRED");
      if (manualIndex !== -1 && passIndex !== -1 && passIndex < manualIndex) {
        failures.push(`${rel(path)} must route MANUAL_VERIFY_REQUIRED before DECISION GO`);
      }
      const readyIndex = content.indexOf("condition: status FOUND and readiness READY");
      const statusErrorIndexes = [
        content.indexOf("condition: status MISSING"),
        content.indexOf("condition: status INVALID"),
        content.indexOf("condition: error_category ARTIFACT_MISSING"),
        content.indexOf("condition: error_category SPEC_JSON_INVALID"),
      ].filter((index) => index !== -1);
      if (readyIndex !== -1 && statusErrorIndexes.some((index) => readyIndex < index)) {
        failures.push(`${rel(path)} must route status errors before readiness READY`);
      }
      if (/required_permission_mode:\s*edit|Write|Edit|cc-sdd-|opsx-|OpenSpec/.test(content)) {
        failures.push(`${rel(path)} contains out-of-boundary write or non-Kiro validation reference`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateDownstreamFieldContracts() {
  const failures = [];
  for (const lang of languages) {
    for (const spec of downstreamFieldContractSpecs) {
      const path = join(repoRoot, ".takt", lang, "workflows", spec.file);
      if (!existsSync(path)) {
        failures.push(`${rel(path)} missing for downstream Kiro field contract validation`);
        continue;
      }
      const content = readText(path);
      const adapterSteps = getInstructionStepBlocks(content, spec.instruction);
      if (adapterSteps.length === 0) {
        failures.push(`${rel(path)} must contain adapter step using ${spec.instruction}`);
        continue;
      }
      for (const step of adapterSteps) {
        const conditions = conditionsForStep(step.content);
        if (!hasAllDecisionRoutes(conditions)) {
          failures.push(`${rel(path)} step ${step.name} must route Kiro validation adapter with DECISION GO, DECISION NO-GO, and DECISION MANUAL_VERIFY_REQUIRED`);
        }
        if (conditions.some((condition) => /validation\.verdict|review\.verdict/.test(condition))) {
          failures.push(`${rel(path)} step ${step.name} must keep DECISION as the primary Kiro skill field, not validation.verdict or review.verdict`);
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateLanguageParity() {
  const failures = [];
  for (const [kind, names] of [
    ["workflows", workflowSpecs.map((spec) => spec.file)],
    ["facets/instructions", instructionSpecs.map((spec) => spec.file)],
  ]) {
    for (const name of names) {
      for (const lang of languages) {
        const path = join(repoRoot, ".takt", lang, kind, name);
        if (!existsSync(path)) {
          failures.push(`${rel(path)} missing for ${kind} parity`);
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validatePackageScripts() {
  const failures = [];
  const path = join(repoRoot, "package.json");
  const content = readText(path);
  containsAll(content, ["validate:kiro-status-validation-workflows", "test:kiro-status-validation-workflows", "validate-kiro-status-validation-workflows.mjs", "kiro-status-validation-workflows.test.mjs"], path, failures);
  return { ok: failures.length === 0, failures };
}

function validateNoBoundaryLeaks() {
  const failures = [];
  const targets = [
    ...languages.flatMap((lang) => [
      join(repoRoot, ".takt", lang, "workflows"),
      join(repoRoot, ".takt", lang, "facets", "instructions"),
    ]),
  ];
  const ownedNames = new Set([
    ...workflowSpecs.map((spec) => spec.file),
    ...instructionSpecs.map((spec) => spec.file),
  ]);
  const relevantFiles = targets.flatMap(listFilesRecursive).filter((path) => ownedNames.has(basename(path)));
  for (const path of relevantFiles) {
    const content = readText(path);
    if (/roadmap\.md|kiro-spec-batch|kiro-impl task execution|checkbox update|requirements\/design\/tasks artifact を生成|OpenSpec strict/.test(content)) {
      failures.push(`${rel(path)} appears to absorb out-of-boundary generation, batch, implementation, or OpenSpec behavior`);
    }
  }
  return { ok: failures.length === 0, failures };
}

export function validateKiroStatusValidationWorkflows(options = {}) {
  const previousRepoRoot = repoRoot;
  repoRoot = options.repoRoot ?? defaultRepoRoot;
  try {
    const sections = {
      sharedContracts: validateSharedContractsExist(),
      languageParity: validateLanguageParity(),
      instructionFacets: validateInstructionFacets(),
      skillAdapterParity: validateSkillAdapterParity(),
      workflowFiles: validateWorkflowFiles(),
      readOnlyWorkflowShape: validateReadOnlyWorkflowShape(),
      downstreamFieldContracts: validateDownstreamFieldContracts(),
      packageScripts: validatePackageScripts(),
      boundaryLeaks: validateNoBoundaryLeaks(),
    };
    const failures = Object.entries(sections).flatMap(([name, result]) =>
      result.failures.map((failure) => `${name}: ${failure}`),
    );
    return { ok: failures.length === 0, failures, sections };
  } finally {
    repoRoot = previousRepoRoot;
  }
}

if (process.argv[1] && __filename === resolve(process.argv[1])) {
  const result = validateKiroStatusValidationWorkflows();
  if (result.ok) {
    console.log("Kiro status/validation workflow validation passed");
  } else {
    console.error("Kiro status/validation workflow validation failed");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}
