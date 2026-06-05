#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const languages = ["en", "ja"];

const workflowSpecs = [
  {
    file: "kiro-spec-status.yaml",
    instructions: ["kiro-report-spec-status"],
    reports: ["kiro-status"],
    requiredTerms: ["kiro-status", "FEATURE_NOT_FOUND", "ARTIFACT_MISSING", "LIFECYCLE_INCONSISTENT"],
  },
  {
    file: "kiro-validate-gap.yaml",
    instructions: ["kiro-validate-gap-readiness"],
    reports: ["kiro-validation-result"],
    requiredTerms: ["kiro-validation-result", "MANUAL_VERIFICATION_REQUIRED", "FAIL", "BLOCKED"],
  },
  {
    file: "kiro-validate-design.yaml",
    instructions: ["kiro-validate-design-readiness"],
    reports: ["kiro-validation-result"],
    requiredTerms: ["kiro-validation-result", "Boundary Commitments", "File Structure Plan", "NEEDS_FIX"],
  },
  {
    file: "kiro-validate-impl.yaml",
    instructions: ["kiro-validate-impl-readiness"],
    reports: ["kiro-validation-result"],
    requiredTerms: ["kiro-validation-result", "MANUAL_VERIFICATION_REQUIRED", "tasks.md", "ready_for_implementation"],
  },
];

const instructionSpecs = [
  {
    file: "kiro-report-spec-status.md",
    parent: "gather-review",
    terms: ["spec.json", "phase", "approvals", "ready_for_implementation", "FEATURE_NOT_FOUND", "ARTIFACT_MISSING", "LIFECYCLE_INCONSISTENT", "kiro-status"],
  },
  {
    file: "kiro-validate-gap-readiness.md",
    parent: "review-qa",
    terms: ["requirements.md", "existing implementation", "missing components", "integration points", "recommended next action", "observed evidence", "missing evidence", "findings", "evidence", "MANUAL_VERIFICATION_REQUIRED", "kiro-validation-result"],
  },
  {
    file: "kiro-validate-design-readiness.md",
    parent: "review-arch",
    terms: ["requirements coverage", "Boundary Commitments", "File Structure Plan", "validation hooks", "boundary violation", "kiro-validation-result"],
  },
  {
    file: "kiro-validate-impl-readiness.md",
    parent: "supervise",
    terms: ["tasks.md", "ready_for_implementation", "task checkbox", "test/build evidence", "evidence mismatch", "observed evidence", "missing evidence", "findings", "evidence", "MANUAL_VERIFICATION_REQUIRED", "kiro-validation-result"],
  },
  {
    file: "kiro-collect-validation-evidence.md",
    parent: "gather-review",
    terms: ["observed evidence", "missing evidence", "MANUAL_VERIFICATION_REQUIRED", "PASS", "findings", "evidence"],
  },
];

const sharedContractFiles = [
  ".takt/{lang}/facets/output-contracts/kiro-status.md",
  ".takt/{lang}/facets/output-contracts/kiro-validation-result.md",
  ".takt/{lang}/facets/policies/kiro-artifact-operations.md",
  ".takt/{lang}/facets/policies/kiro-spec-lifecycle.md",
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
      const extendsPattern = new RegExp(`^\\{extends:\\s*${spec.parent}\\s*\\}$`, "m");
      if (!extendsPattern.test(content)) {
        failures.push(`${rel(path)} must extend built-in instructions/${spec.parent} with {extends: ${spec.parent}}`);
      }
      const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", "instructions", `${spec.parent}.md`);
      if (!existsSync(parentPath)) {
        failures.push(`${rel(path)} extends missing built-in parent ${rel(parentPath)}`);
      }
      containsAll(content, spec.terms, path, failures);
      if (!/read-only|読み取り専用|更新しない|変更しない/.test(content)) {
        failures.push(`${rel(path)} must state the read-only validation boundary`);
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
      if (/required_permission_mode:\s*edit|Write|Edit|cc-sdd-|opsx-|OpenSpec/.test(content)) {
        failures.push(`${rel(path)} contains out-of-boundary write or non-Kiro validation reference`);
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

export function validateKiroStatusValidationWorkflows() {
  const sections = {
    sharedContracts: validateSharedContractsExist(),
    languageParity: validateLanguageParity(),
    instructionFacets: validateInstructionFacets(),
    workflowFiles: validateWorkflowFiles(),
    packageScripts: validatePackageScripts(),
    boundaryLeaks: validateNoBoundaryLeaks(),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
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
