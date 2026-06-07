#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");
const languages = ["en", "ja"];
const facetKinds = ["instructions", "output-contracts", "policies"];
const workflowReferenceExemptInstructionFacets = new Map([
  ["kiro-resolve-skill-identity.md", "shared identity resolver contract, not a workflow step instruction"],
  ["kiro-collect-validation-evidence.md", "shared evidence vocabulary embedded by validation readiness adapters"],
]);

const outputContracts = [
  {
    file: "kiro-status.md",
    fields: ["status", "feature", "phase", "approvals", "readiness", "ready_for_implementation", "error_category", "evidence", "summary"],
    enums: ["FOUND", "MISSING", "INVALID", "READY", "NOT_READY", "INCONSISTENT"],
  },
  {
    file: "kiro-validation-result.md",
    fields: ["verdict", "DECISION", "scope", "checked_items", "findings", "error_category", "evidence", "summary"],
    enums: ["PASS", "FAIL", "NEEDS_FIX", "BLOCKED", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED"],
  },
  {
    file: "kiro-review-verdict.md",
    fields: ["VERDICT", "verdict", "review_scope", "findings", "requirement_refs", "task_refs", "boundary_violations", "evidence", "summary"],
    enums: ["APPROVED", "REJECTED"],
  },
  {
    file: "kiro-debug-decision.md",
    fields: ["NEXT_ACTION", "decision", "root_cause", "failure_category", "retry_eligible", "abort_reason", "affected_task_refs", "evidence", "summary"],
    enums: ["RETRY_TASK", "BLOCK_TASK", "STOP_FOR_HUMAN"],
  },
  {
    file: "kiro-completion-verification.md",
    fields: ["STATUS", "verdict", "completed_task_refs", "remaining_work", "verification_evidence", "manual_verification_reason", "blocked_reason", "safe_to_update_progress", "summary"],
    enums: ["VERIFIED", "NOT_VERIFIED", "MANUAL_VERIFY_REQUIRED", "COMPLETE", "INCOMPLETE", "BLOCKED"],
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

function escapeRegExp(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsContractTerm(content, term) {
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(term)}([^A-Za-z0-9_-]|$)`).test(content);
}

function containsAllContractTerms(content, terms, path, failures) {
  for (const term of terms) {
    if (!containsContractTerm(content, term)) {
      failures.push(`${rel(path)} missing required term: ${term}`);
    }
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return {};
  }
  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    return {};
  }
  const frontmatter = content.slice(4, end).trim();
  const result = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([^:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    value = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    result[key] = value;
  }
  return result;
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
      containsAllContractTerms(content, contract.fields, path, failures);
      containsAllContractTerms(content, contract.enums, path, failures);
      if (!content.includes("summary") || !/not be used|使ってはならない|参照して分岐/.test(content)) {
        failures.push(`${rel(path)} must separate human summary from machine fields`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateKiroSkillInheritance() {
  const failures = [];
  const byLanguage = new Map();
  for (const lang of languages) {
    const dir = join(repoRoot, ".takt", lang, "facets", "instructions");
    for (const path of listFilesRecursive(dir).filter((file) => basename(file).startsWith("kiro-"))) {
      const content = readText(path);
      const frontmatter = parseFrontmatter(content);
      const customReason = frontmatter["Full custom skill reason"];
      if (customReason) {
        byLanguage.set(`${lang}:${basename(path)}`, { customReason });
        continue;
      }
      const skill = frontmatter.extends_skill;
      const section = frontmatter.extends_skill_section;
      const additionalSection = frontmatter.extends_skill_additional_section;
      if (!skill || !section) {
        failures.push(`${rel(path)} missing extends_skill or extends_skill_section frontmatter`);
        continue;
      }
      if (!supportedSkills.has(skill)) {
        failures.push(`${rel(path)} has unsupported extends_skill: ${skill}`);
        continue;
      }
      const skillPaths = [".agents/skills", ".claude/skills"]
        .map((root) => join(repoRoot, root, skill, "SKILL.md"))
        .filter((candidate) => existsSync(candidate));
      if (skillPaths.length === 0) {
        failures.push(`SKILL_SOURCE_MISSING: ${rel(path)} extends ${skill}`);
        continue;
      }
      const skillContents = skillPaths.map((skillPath) => ({ path: skillPath, content: readText(skillPath) }));
      if (!skillContents.some((skillSource) => skillSource.content.includes(section))) {
        failures.push(`SKILL_SECTION_NOT_FOUND: ${rel(path)} references ${skill} section ${section} missing from all skill sources`);
      }
      if (additionalSection && !skillContents.some((skillSource) => skillSource.content.includes(additionalSection))) {
        failures.push(
          `SKILL_SECTION_NOT_FOUND: ${rel(path)} references ${skill} additional section ${additionalSection} missing from all skill sources`,
        );
      }
      const suspiciousCopies = [
        "<background_information>",
        "<instructions>",
        "Safety & Fallback",
        "Critical Constraints",
      ].filter((term) => skillContents.some((skillSource) => skillSource.content.includes(term)) && content.includes(term));
      if (suspiciousCopies.length > 0) {
        failures.push(`SKILL_BODY_COPY_DETECTED: ${rel(path)} repeats skill body markers ${suspiciousCopies.join(", ")}`);
      }
      byLanguage.set(`${lang}:${basename(path)}`, { skill, section, additionalSection: additionalSection ?? "" });
    }
  }

  const basenames = new Set([...byLanguage.keys()].map((key) => key.slice(3)));
  for (const file of basenames) {
    const en = byLanguage.get(`en:${file}`);
    const ja = byLanguage.get(`ja:${file}`);
    if (!en || !ja) {
      failures.push(`LANGUAGE_PAIR_DRIFT: instruction facet ${file} must exist in both languages`);
      continue;
    }
    if (en.customReason || ja.customReason) {
      if (en.customReason !== ja.customReason) {
        failures.push(`SKILL_CUSTOM_REASON_DRIFT: ${file} custom skill reasons differ between languages`);
      }
      continue;
    }
    if (en.skill !== ja.skill || en.section !== ja.section || en.additionalSection !== ja.additionalSection) {
      failures.push(`SKILL_ADAPTER_DRIFT: ${file} en=${JSON.stringify(en)} ja=${JSON.stringify(ja)}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function workflowStepBlocks(content) {
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let inSteps = false;
  let current = null;
  for (const line of lines) {
    if (/^steps:\s*$/.test(line)) {
      inSteps = true;
      continue;
    }
    if (!inSteps) continue;
    if (/^[A-Za-z_][A-Za-z0-9_-]*:\s*/.test(line)) {
      break;
    }
    if (/^  - name:/.test(line)) {
      if (current) blocks.push(current);
      current = [line];
      continue;
    }
    if (current) current.push(line);
  }
  if (current) blocks.push(current);
  return blocks;
}

function workflowStepName(block) {
  const nameLine = block.find((line) => /^  - name:\s*/.test(line));
  return nameLine?.replace(/^  - name:\s*/, "").trim() || "(unknown step)";
}

function workflowStepUsesFormat(block, format) {
  return block.some((line) => line.trim() === `format: ${format}`);
}

function workflowStepConditions(block) {
  return block
    .filter((line) => /^\s+- condition:\s+/.test(line))
    .map((line) => line.trim())
    .join("\n");
}

function validateKiroSkillFieldContract() {
  const failures = [];
  for (const lang of languages) {
    const reviewPath = join(repoRoot, ".takt", lang, "facets", "output-contracts", "kiro-review-verdict.md");
    const debugPath = join(repoRoot, ".takt", lang, "facets", "output-contracts", "kiro-debug-decision.md");
    const validationPath = join(repoRoot, ".takt", lang, "facets", "output-contracts", "kiro-validation-result.md");
    const completionPath = join(repoRoot, ".takt", lang, "facets", "output-contracts", "kiro-completion-verification.md");
    if (!existsSync(reviewPath)) {
      failures.push(`${rel(reviewPath)} missing`);
    } else {
      containsAllContractTerms(readText(reviewPath), ["VERDICT", "APPROVED", "REJECTED", "workflow branching"], reviewPath, failures);
    }
    if (!existsSync(debugPath)) {
      failures.push(`${rel(debugPath)} missing`);
    } else {
      containsAllContractTerms(readText(debugPath), ["NEXT_ACTION", "RETRY_TASK", "BLOCK_TASK", "STOP_FOR_HUMAN", "workflow branching"], debugPath, failures);
    }
    if (!existsSync(validationPath)) {
      failures.push(`${rel(validationPath)} missing`);
    } else {
      containsAllContractTerms(readText(validationPath), ["DECISION", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED", "primary field"], validationPath, failures);
    }
    if (!existsSync(completionPath)) {
      failures.push(`${rel(completionPath)} missing`);
    } else {
      containsAllContractTerms(
        readText(completionPath),
        ["STATUS", "VERIFIED", "NOT_VERIFIED", "MANUAL_VERIFY_REQUIRED", "primary field"],
        completionPath,
        failures,
      );
    }

    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    for (const workflow of listFilesRecursive(workflowDir).filter((path) => basename(path).startsWith("kiro-") && path.endsWith(".yaml"))) {
      const content = readText(workflow);
      for (const block of workflowStepBlocks(content)) {
        const stepName = workflowStepName(block);
        const conditions = workflowStepConditions(block);
        if (workflowStepUsesFormat(block, "kiro-review-verdict") && !/\bVERDICT\b/.test(conditions)) {
          failures.push(`${rel(workflow)} step ${stepName} must branch on VERDICT for kiro-review-verdict`);
        }
        if (workflowStepUsesFormat(block, "kiro-debug-decision") && !/\bNEXT_ACTION\b/.test(conditions)) {
          failures.push(`${rel(workflow)} step ${stepName} must branch on NEXT_ACTION for kiro-debug-decision`);
        }
        if (workflowStepUsesFormat(block, "kiro-validation-result")) {
          if (!/\bDECISION\b/.test(conditions)) {
            failures.push(`${rel(workflow)} step ${stepName} must branch on DECISION for kiro-validation-result`);
          }
          if (/\bvalidation\.verdict\b|\bverdict\s+(?:PASS|FAIL|NEEDS_FIX|BLOCKED)\b|finding category MANUAL_VERIFICATION_REQUIRED/.test(conditions)) {
            failures.push(`${rel(workflow)} step ${stepName} must not branch on legacy validation verdict fields for kiro-validation-result`);
          }
        }
        if (workflowStepUsesFormat(block, "kiro-completion-verification") && !/\bSTATUS\b/.test(conditions)) {
          failures.push(`${rel(workflow)} step ${stepName} must branch on STATUS for kiro-completion-verification`);
        }
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
    const content = readText(path);
    const scriptMappingTerms = [...scriptMap.entries()].flatMap(([script, identity]) => [script, identity]);
    containsAll(content, scriptMappingTerms, path, failures);
    containsAll(content, ["UNSUPPORTED_KIRO_IDENTITY", "SKILL_SOURCE_MISSING", ".agents/skills", ".claude/skills", "runtime control plane"], path, failures);
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

function validateUnusedKiroInstructionFacets() {
  const failures = [];
  for (const lang of languages) {
    const instructionDir = join(repoRoot, ".takt", lang, "facets", "instructions");
    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    const referenced = new Set();

    for (const workflow of listFilesRecursive(workflowDir).filter((path) => basename(path).startsWith("kiro-") && path.endsWith(".yaml"))) {
      const content = readText(workflow);
      for (const match of content.matchAll(/\.\.\/facets\/instructions\/([^/\s]+\.md)/g)) {
        referenced.add(match[1]);
      }
    }

    for (const facet of listFilesRecursive(instructionDir).filter((path) => basename(path).startsWith("kiro-") && path.endsWith(".md"))) {
      const file = basename(facet);
      if (!referenced.has(file) && !workflowReferenceExemptInstructionFacets.has(file)) {
        failures.push(`${rel(facet)} is not referenced by any kiro-*.yaml workflow`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateKiroWorkflowShapeRules() {
  const failures = [];
  const closedLoopWorkflowPattern = /^kiro-spec-(requirements|design|tasks)\.yaml$/;
  const readOnlyWorkflowPattern = /^(kiro-spec-status|kiro-validate-(gap|design|impl))\.yaml$/;
  for (const lang of languages) {
    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    for (const workflow of listFilesRecursive(workflowDir).filter((path) => basename(path).startsWith("kiro-") && path.endsWith(".yaml"))) {
      const content = readText(workflow);
      const workflowName = basename(workflow);
      const stepCount = (content.match(/^  - name:/gm) ?? []).length;
      if (/\bworkflow_call\b/.test(content)) {
        failures.push(`${rel(workflow)} must not use workflow_call for Kiro workflow reuse`);
      }
      if (/\btakt\s+-w\b|\btakt\s+.*\s-w\b/.test(content)) {
        failures.push(`${rel(workflow)} must not shell out to takt -w for Kiro workflow reuse`);
      }
      if (/retryCount|maxAttempts|max-attempt|loop-health|loop health/i.test(content)) {
        failures.push(`${rel(workflow)} must not define custom retry or loop-health source of truth`);
      }
      if (closedLoopWorkflowPattern.test(workflowName)) {
        if (stepCount < 3) {
          failures.push(`${rel(workflow)} must not be a single-step generation wrapper`);
        }
        containsAllContractTerms(content, ["loop_monitors", "threshold"], workflow, failures);
        containsAll(content, ["review", "repair", "finalize"], workflow, failures);
      }
      if (readOnlyWorkflowPattern.test(workflowName)) {
        if (stepCount < 3) {
          failures.push(`${rel(workflow)} must use collect -> validate/classify -> report read-only shape`);
        }
        containsAll(content, ["collect", "report", "required_permission_mode: readonly"], workflow, failures);
        if (workflowName === "kiro-spec-status.yaml") {
          containsAll(content, ["classify"], workflow, failures);
        } else {
          containsAll(content, ["validate"], workflow, failures);
        }
        if (/\bloop_monitors\b/.test(content)) {
          failures.push(`${rel(workflow)} must not define loop_monitors for read-only validation`);
        }
        if (/^\s*edit:\s*true\b/m.test(content) || /^\s*required_permission_mode:\s*edit\b/m.test(content)) {
          failures.push(`${rel(workflow)} must remain read-only`);
        }
        if (/^  - name:.*\b(repair|debug)\b/m.test(content)) {
          failures.push(`${rel(workflow)} must not include repair or debug steps`);
        }
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
    kiroSkillInheritance: validateKiroSkillInheritance(),
    kiroSkillFieldContract: validateKiroSkillFieldContract(),
    kiroWorkflowShapeRules: validateKiroWorkflowShapeRules(),
    workflowFacetReferences: validateWorkflowFacetReferences(),
    unusedKiroInstructionFacets: validateUnusedKiroInstructionFacets(),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
}

if (process.argv[1] && __filename === resolve(process.argv[1])) {
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
