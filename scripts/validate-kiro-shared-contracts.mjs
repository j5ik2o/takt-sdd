#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const languages = ["en", "ja"];
const facetKinds = ["instructions", "output-contracts", "policies"];

const outputContracts = [
  {
    file: "kiro-status.md",
    fields: ["status", "feature", "phase", "approvals", "readiness", "ready_for_implementation", "error_category", "evidence", "summary"],
    enums: ["FOUND", "MISSING", "INVALID", "READY", "NOT_READY", "INCONSISTENT"],
  },
  {
    file: "kiro-validation-result.md",
    fields: ["verdict", "scope", "checked_items", "findings", "error_category", "evidence", "summary"],
    enums: ["PASS", "FAIL", "NEEDS_FIX", "BLOCKED"],
  },
  {
    file: "kiro-review-verdict.md",
    fields: ["verdict", "review_scope", "findings", "requirement_refs", "task_refs", "boundary_violations", "evidence", "summary"],
    enums: ["GO", "NO_GO"],
  },
  {
    file: "kiro-debug-decision.md",
    fields: ["decision", "root_cause", "failure_category", "retry_eligible", "abort_reason", "affected_task_refs", "evidence", "summary"],
    enums: ["RETRY_TASK", "BLOCK_TASK", "STOP_FOR_HUMAN"],
  },
  {
    file: "kiro-completion-verification.md",
    fields: ["verdict", "completed_task_refs", "remaining_work", "verification_evidence", "blocked_reason", "safe_to_update_progress", "summary"],
    enums: ["COMPLETE", "INCOMPLETE", "BLOCKED"],
  },
];

const supportedSkills = new Set([
  "kiro-debug",
  "kiro-discovery",
  "kiro-impl",
  "kiro-review",
  "kiro-spec-batch",
  "kiro-spec-design",
  "kiro-spec-init",
  "kiro-spec-quick",
  "kiro-spec-requirements",
  "kiro-spec-status",
  "kiro-spec-tasks",
  "kiro-steering",
  "kiro-steering-custom",
  "kiro-validate-design",
  "kiro-validate-gap",
  "kiro-validate-impl",
  "kiro-verify-completion",
]);

const scriptMap = new Map([
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

function normalizeSkillExpression(input) {
  let expression = input.trim();
  if (expression.startsWith("npm run ")) {
    expression = expression.slice("npm run ".length).trim();
  }
  expression = expression.split(/\s+--\s+|\s+/)[0] ?? "";
  expression = expression.replace(/^[$/]/, "");
  const identity = scriptMap.get(expression) ?? expression;
  if (!identity.startsWith("kiro-") || !supportedSkills.has(identity)) {
    return { status: "MISSING", errorCategory: "UNSUPPORTED_KIRO_IDENTITY", identity };
  }
  const sourceRoots = [".agents/skills", ".claude/skills"]
    .map((root) => join(repoRoot, root, identity, "SKILL.md"))
    .filter((path) => existsSync(path))
    .map((path) => rel(dirname(path)));
  if (sourceRoots.length === 0) {
    return { status: "MISSING", errorCategory: "SKILL_SOURCE_MISSING", identity, sourceRoots };
  }
  return { status: "FOUND", identity, sourceRoots };
}

function validateOutputContracts() {
  const failures = [];
  for (const lang of languages) {
    for (const contract of outputContracts) {
      const path = join(repoRoot, ".takt", lang, "facets", "output-contracts", contract.file);
      if (!existsSync(path)) {
        failures.push(`${rel(path)} missing`);
        continue;
      }
      const content = readText(path);
      containsAll(content, contract.fields, path, failures);
      containsAll(content, contract.enums, path, failures);
      if (!content.includes("summary") || !/not be used|使ってはならない|参照して分岐/.test(content)) {
        failures.push(`${rel(path)} must separate human summary from machine fields`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateSkillIdentityFixtures() {
  const failures = [];
  const equivalent = ["kiro-impl", "$kiro-impl", "/kiro-impl", "kiro:impl", "npm run kiro:impl -- feature=x"];
  for (const input of equivalent) {
    const result = normalizeSkillExpression(input);
    if (result.identity !== "kiro-impl" || result.status !== "FOUND") {
      failures.push(`skill identity fixture failed for ${input}: ${JSON.stringify(result)}`);
    }
  }
  const quick = normalizeSkillExpression("kiro:spec:quick");
  if (quick.identity !== "kiro-spec-quick" || quick.status !== "FOUND") {
    failures.push(`kiro:spec:quick did not resolve to kiro-spec-quick: ${JSON.stringify(quick)}`);
  }
  const unsupported = normalizeSkillExpression("opsx:apply");
  if (unsupported.errorCategory !== "UNSUPPORTED_KIRO_IDENTITY") {
    failures.push(`opsx:apply must be unsupported: ${JSON.stringify(unsupported)}`);
  }
  for (const lang of languages) {
    const path = join(repoRoot, ".takt", lang, "facets", "instructions", "kiro-resolve-skill-identity.md");
    if (!existsSync(path)) {
      failures.push(`${rel(path)} missing`);
      continue;
    }
    containsAll(readText(path), ["UNSUPPORTED_KIRO_IDENTITY", "SKILL_SOURCE_MISSING", ".agents/skills", ".claude/skills", "runtime control plane"], path, failures);
  }
  return { ok: failures.length === 0, failures };
}

function validateArtifactLifecycleTerms() {
  const failures = [];
  const artifactTerms = [
    ".kiro/steering/roadmap.md",
    ".kiro/specs/<feature>/",
    "requirements.md",
    "design.md",
    "tasks.md",
    "spec.json",
    "FEATURE_NOT_FOUND",
    "ARTIFACT_MISSING",
    "SPEC_JSON_INVALID",
    "LIFECYCLE_INCONSISTENT",
    "OpenSpec",
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
  for (const lang of languages) {
    const artifactPath = join(repoRoot, ".takt", lang, "facets", "policies", "kiro-artifact-operations.md");
    const lifecyclePath = join(repoRoot, ".takt", lang, "facets", "policies", "kiro-spec-lifecycle.md");
    if (!existsSync(artifactPath)) {
      failures.push(`${rel(artifactPath)} missing`);
    } else {
      containsAll(readText(artifactPath), artifactTerms, artifactPath, failures);
    }
    if (!existsSync(lifecyclePath)) {
      failures.push(`${rel(lifecyclePath)} missing`);
    } else {
      containsAll(readText(lifecyclePath), lifecycleTerms, lifecyclePath, failures);
    }
  }
  return { ok: failures.length === 0, failures };
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

function validateFacetInheritance() {
  const failures = [];
  const resolverPath = join(repoRoot, "node_modules", "takt", "dist", "infra", "config", "loaders", "resource-resolver.js");
  if (!existsSync(resolverPath)) {
    failures.push("FACET_EXTENDS_UNSUPPORTED: takt resource resolver not found");
  } else {
    const resolver = readText(resolverPath);
    if (!resolver.includes("EXTENDS_LINE_PATTERN") || !resolver.includes("BARE_FACET_NAME_PATTERN")) {
      failures.push("FACET_EXTENDS_UNSUPPORTED: takt runtime does not expose supported bare-name extends parsing");
    }
  }

  for (const lang of languages) {
    for (const kind of facetKinds) {
      const dir = join(repoRoot, ".takt", lang, "facets", kind);
      for (const path of listFilesRecursive(dir).filter((file) => basename(file).startsWith("kiro-"))) {
        const content = readText(path);
        const match = content.match(/^[ \t]*\{extends:\s*([^}]+?)\s*\}[ \t]*$/m);
        if (!match) {
          if (!content.includes("Full custom reason:")) {
            failures.push(`${rel(path)} must use {extends: parent} or state Full custom reason`);
          }
          continue;
        }
        const parent = match[1].trim();
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(parent)) {
          failures.push(`${rel(path)} has unsupported non-bare extends parent: ${parent}`);
          continue;
        }
        const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", kind, `${parent}.md`);
        if (!existsSync(parentPath)) {
          failures.push(`BUILTIN_FACET_NOT_FOUND: ${rel(path)} extends ${rel(parentPath)}`);
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateWorkflowFacetReferences() {
  const failures = [];
  for (const lang of languages) {
    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    const kiroWorkflows = listFilesRecursive(workflowDir).filter((path) => basename(path).startsWith("kiro-") && path.endsWith(".yaml"));
    for (const workflow of kiroWorkflows) {
      const content = readText(workflow);
      const refs = [...content.matchAll(/\.\.\/facets\/([^/\s]+)\/([^/\s]+)\.md/g)];
      for (const [, kind, file] of refs) {
        const facetPath = join(repoRoot, ".takt", lang, "facets", kind, `${file}.md`);
        if (!existsSync(facetPath)) {
          failures.push(`${rel(workflow)} references missing facet ${rel(facetPath)}`);
        }
      }
      if (content.includes("cc-sdd-")) {
        failures.push(`${rel(workflow)} must not depend on cc-sdd shared contract names for Kiro workflow branching`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

export function validateKiroSharedContracts() {
  const sections = {
    outputContracts: validateOutputContracts(),
    skillIdentityFixtures: validateSkillIdentityFixtures(),
    artifactLifecycleTerms: validateArtifactLifecycleTerms(),
    facetInheritance: validateFacetInheritance(),
    workflowFacetReferences: validateWorkflowFacetReferences(),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateKiroSharedContracts();
  if (result.ok) {
    console.log("Kiro shared contract validation passed");
  } else {
    console.error("Kiro shared contract validation failed");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}
