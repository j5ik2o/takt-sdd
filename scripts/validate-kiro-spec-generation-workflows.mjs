#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
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
