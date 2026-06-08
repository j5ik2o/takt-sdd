#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = resolve(__dirname, "..");
const languages = ["en", "ja"];

const actionPathEnums = [
  "EXISTING_SPEC_UPDATE",
  "DIRECT_IMPLEMENTATION",
  "SINGLE_SPEC",
  "MULTI_SPEC",
  "MIXED_DECOMPOSITION",
];

const workflowSpecs = [
  {
    file: "kiro-discovery.yaml",
    expectedSteps: ["classify-action-path", "plan-discovery-artifacts", "write-discovery-artifacts", "report-discovery"],
    instructions: ["kiro-discovery"],
    policies: ["kiro-discovery-routing"],
    reports: ["kiro-discovery-result"],
    requiredTerms: [
      "brief.md",
      ".kiro/steering/roadmap.md",
      "required plannedFiles missing",
      "required createdFiles missing",
      "required discovery artifacts missing",
      ...actionPathEnums,
    ],
  },
  {
    file: "kiro-spec-batch.yaml",
    expectedSteps: [
      "parse-roadmap",
      "plan-waves",
      "dispatch-wave",
      "cross-spec-review",
      "coordinate-remediation",
      "finalize-batch",
    ],
    instructions: ["kiro-spec-batch", "kiro-cross-spec-review"],
    policies: ["kiro-roadmap-dependency-waves", "kiro-cross-spec-boundaries"],
    reports: ["kiro-batch-summary", "kiro-cross-spec-review"],
    requiredTerms: [
      "## Specs (dependency order)",
      "dynamic subagent dispatch",
      "loop_monitors",
      "loop_monitors.threshold",
      "DECOMPOSITION_RETURN",
    ],
  },
];

const facetSpecs = [
  {
    kind: "instructions",
    file: "kiro-discovery.md",
    parent: "plan",
    skill: "kiro-discovery",
    skillSection: "## Step 2: Determine Action Path",
    terms: ["brief.md", ".kiro/steering/roadmap.md", "blockingReason", ...actionPathEnums],
  },
  {
    kind: "instructions",
    file: "kiro-spec-batch.md",
    parent: "supervise",
    skill: "kiro-spec-batch",
    skillSection: "## Step 2: Build Dependency Waves",
    terms: ["dependency wave", "dynamic subagent dispatch", "kiro-spec-generation-workflows", "feature result"],
  },
  {
    kind: "instructions",
    file: "kiro-cross-spec-review.md",
    parent: "review-arch",
    skill: "kiro-spec-batch",
    skillSection: "## Step 4: Cross-Spec Review",
    terms: ["data model consistency", "interface alignment", "duplicate functionality", "DECOMPOSITION_RETURN"],
  },
  {
    kind: "policies",
    file: "kiro-discovery-routing.md",
    parent: "research",
    terms: actionPathEnums,
  },
  {
    kind: "policies",
    file: "kiro-roadmap-dependency-waves.md",
    parent: "task-decomposition",
    terms: ["## Specs (dependency order)", "Existing Spec Updates", "Direct Implementation Candidates", "circular dependency"],
  },
  {
    kind: "policies",
    file: "kiro-cross-spec-boundaries.md",
    parent: "design-planning",
    terms: ["data model consistency", "interface alignment", "task boundary", "decomposition"],
  },
  {
    kind: "output-contracts",
    file: "kiro-discovery-result.md",
    parent: "validation",
    terms: ["actionPath", "createdFiles", "nextAction", "blockingReason", ...actionPathEnums],
  },
  {
    kind: "output-contracts",
    file: "kiro-batch-summary.md",
    parent: "validation",
    terms: ["wavePlan", "featureResults", "failedFeatures", "crossSpecReview", "implementationReady"],
  },
  {
    kind: "output-contracts",
    file: "kiro-cross-spec-review.md",
    parent: "validation",
    terms: ["severity", "affectedSpecs", "suggestedFix", "DECOMPOSITION_RETURN", "repairTarget"],
  },
];

const discoveryBatchFacetKinds = ["instructions", "policies", "output-contracts", "personas"];
const expectedDiscoveryBatchFacets = new Set(facetSpecs.map((spec) => `${spec.kind}/${spec.file}`));

function readText(path) {
  return readFileSync(path, "utf8");
}

function rel(repoRoot, path) {
  return relative(repoRoot, path);
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return {};
  }
  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    return {};
  }
  const fields = {};
  for (const line of content.slice(4, end).split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+)\s*$/);
    if (match) {
      fields[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
  return fields;
}

function parseFacetParent(content) {
  const match = content.match(/^\{extends:\s*([A-Za-z0-9._-]+)\s*\}$/m);
  return match ? match[1] : null;
}

function getStepNames(content) {
  return [...content.matchAll(/^  - name:\s*(.+)\s*$/gm)].map((match) => match[1]);
}

function extractMachineTokens(content) {
  const tokens = new Set();
  for (const match of content.matchAll(/`([^`]+)`/g)) {
    const token = match[1];
    if (/^[A-Za-z0-9_.:/-]+$/.test(token) || token.startsWith(".kiro/") || token.startsWith("## ")) {
      tokens.add(token);
    }
  }
  for (const match of content.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) {
    tokens.add(match[0]);
  }
  return [...tokens].sort();
}

function diffLists(left, right) {
  const rightSet = new Set(right);
  const leftSet = new Set(left);
  return {
    missingFromRight: left.filter((item) => !rightSet.has(item)),
    extraInRight: right.filter((item) => !leftSet.has(item)),
  };
}

function containsAll(content, terms, path, failures, repoRoot, code = "DISCOVERY_BATCH_DRIFT") {
  for (const term of terms) {
    if (!content.includes(term)) {
      failures.push(`${code}: ${rel(repoRoot, path)} missing required term: ${term}`);
    }
  }
}

function validateWorkflow(repoRoot, lang, spec) {
  const failures = [];
  const path = join(repoRoot, ".takt", lang, "workflows", spec.file);
  if (!existsSync(path)) {
    return [`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing`];
  }
  const content = readText(path);
  const stepNames = getStepNames(content);
  if (stepNames.length <= 1) {
    failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} must not be a single-step prompt wrapper`);
  }
  for (const expectedStep of spec.expectedSteps) {
    if (!stepNames.includes(expectedStep)) {
      failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing step ${expectedStep}`);
    }
  }
  for (const instruction of spec.instructions) {
    if (!new RegExp(`^\\s+${instruction}:\\s+\\.\\./facets/instructions/${instruction}\\.md\\s*$`, "m").test(content)) {
      failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing instruction reference ${instruction}`);
    }
  }
  for (const policy of spec.policies) {
    if (!new RegExp(`^\\s+${policy}:\\s+\\.\\./facets/policies/${policy}\\.md\\s*$`, "m").test(content) && !content.includes(`- ${policy}`)) {
      failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing policy reference ${policy}`);
    }
  }
  for (const report of spec.reports) {
    if (!new RegExp(`^\\s+${report}:\\s+\\.\\./facets/output-contracts/${report}\\.md\\s*$`, "m").test(content) && !content.includes(`format: ${report}`)) {
      failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing report format ${report}`);
    }
  }
  if (/\bworkflow_call\b/.test(content)) {
    failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} must not use workflow_call for phase reuse`);
  }
  if (/\btakt\s+-w\b|\btakt\s+.*\s-w\s+/.test(content)) {
    failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} must not use shell takt -w for phase reuse`);
  }
  if (/\bretryCount\b|\bmaxAttempts\b|\battempt budget\b|\bretry budget\b/i.test(content)) {
    failures.push(`WORKFLOW_DRIFT: ${rel(repoRoot, path)} must use loop_monitors.threshold instead of an independent retry counter`);
  }
  containsAll(content, spec.requiredTerms, path, failures, repoRoot, "WORKFLOW_DRIFT");
  return failures;
}

function validateFacet(repoRoot, lang, spec) {
  const failures = [];
  const path = join(repoRoot, ".takt", lang, "facets", spec.kind, spec.file);
  if (!existsSync(path)) {
    return [`FACET_DRIFT: ${rel(repoRoot, path)} missing`];
  }
  const content = readText(path);
  const frontmatter = parseFrontmatter(content);
  if (spec.skill && frontmatter.extends_skill !== spec.skill) {
    failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} must declare extends_skill: ${spec.skill}`);
  }
  if (spec.skillSection && frontmatter.extends_skill_section !== spec.skillSection) {
    failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} must declare extends_skill_section: "${spec.skillSection}"`);
  }
  if (spec.skill && existsSync(join(repoRoot, ".agents"))) {
    const skillPath = join(repoRoot, ".agents", "skills", spec.skill, "SKILL.md");
    if (!existsSync(skillPath)) {
      failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} references missing skill ${rel(repoRoot, skillPath)}`);
    } else if (spec.skillSection && !readText(skillPath).includes(`${spec.skillSection}\n`)) {
      failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} references missing skill section ${spec.skillSection}`);
    }
  }
  const actualParent = parseFacetParent(content);
  if (actualParent !== spec.parent) {
    failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} must extend built-in ${spec.kind}/${spec.parent}`);
  }
  if (!actualParent) {
    failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} must declare a built-in facet parent`);
  }
  if (actualParent && existsSync(join(repoRoot, "node_modules"))) {
    const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", spec.kind, `${actualParent}.md`);
    if (!existsSync(parentPath)) {
      failures.push(`FACET_DRIFT: ${rel(repoRoot, path)} extends missing built-in parent ${rel(repoRoot, parentPath)}`);
    }
  }
  containsAll(content, spec.terms, path, failures, repoRoot, "FACET_DRIFT");
  return failures;
}

function isDiscoveryBatchScopedFacet(file) {
  const basename = file.replace(/\.md$/, "");
  return basename.startsWith("kiro-") && (
    basename.includes("discovery") ||
    basename.includes("spec-batch") ||
    basename.includes("batch-summary") ||
    basename.includes("cross-spec") ||
    basename.includes("roadmap-dependency")
  );
}

function validateNoUnusedDiscoveryBatchFacets(repoRoot, lang) {
  const failures = [];
  for (const kind of discoveryBatchFacetKinds) {
    const dir = join(repoRoot, ".takt", lang, "facets", kind);
    if (!existsSync(dir)) {
      continue;
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".md") || !isDiscoveryBatchScopedFacet(file)) {
        continue;
      }
      const key = `${kind}/${file}`;
      if (!expectedDiscoveryBatchFacets.has(key)) {
        failures.push(`UNUSED_FACET_DRIFT: ${rel(repoRoot, join(dir, file))} is in discovery/batch scope but is not connected`);
      }
    }
  }
  return failures;
}

function validateLanguageParity(repoRoot) {
  const failures = [];
  for (const spec of workflowSpecs) {
    const enPath = join(repoRoot, ".takt", "en", "workflows", spec.file);
    const jaPath = join(repoRoot, ".takt", "ja", "workflows", spec.file);
    if (!existsSync(enPath) || !existsSync(jaPath)) {
      continue;
    }
    const enSteps = getStepNames(readText(enPath));
    const jaSteps = getStepNames(readText(jaPath));
    const stepDiff = diffLists(enSteps, jaSteps);
    if (stepDiff.missingFromRight.length > 0 || stepDiff.extraInRight.length > 0) {
      failures.push(
        `LANGUAGE_PARITY_DRIFT: ${spec.file} en/ja step names differ: missing in ja [${stepDiff.missingFromRight.join(", ")}], extra in ja [${stepDiff.extraInRight.join(", ")}]`,
      );
    }

    const enTokens = extractMachineTokens(readText(enPath));
    const jaTokens = extractMachineTokens(readText(jaPath));
    const tokenDiff = diffLists(enTokens, jaTokens);
    if (tokenDiff.missingFromRight.length > 0 || tokenDiff.extraInRight.length > 0) {
      failures.push(
        `LANGUAGE_PARITY_DRIFT: ${spec.file} en/ja workflow machine tokens differ: missing in ja [${tokenDiff.missingFromRight.join(", ")}], extra in ja [${tokenDiff.extraInRight.join(", ")}]`,
      );
    }
  }

  for (const spec of facetSpecs) {
    const enPath = join(repoRoot, ".takt", "en", "facets", spec.kind, spec.file);
    const jaPath = join(repoRoot, ".takt", "ja", "facets", spec.kind, spec.file);
    if (!existsSync(enPath) || !existsSync(jaPath)) {
      continue;
    }
    const enTokens = extractMachineTokens(readText(enPath));
    const jaTokens = extractMachineTokens(readText(jaPath));
    const tokenDiff = diffLists(enTokens, jaTokens);
    if (tokenDiff.missingFromRight.length > 0 || tokenDiff.extraInRight.length > 0) {
      failures.push(
        `LANGUAGE_PARITY_DRIFT: ${spec.kind}/${spec.file} en/ja machine tokens differ: missing in ja [${tokenDiff.missingFromRight.join(", ")}], extra in ja [${tokenDiff.extraInRight.join(", ")}]`,
      );
    }
  }
  return failures;
}

function sectionBody(content, heading) {
  const start = content.indexOf(`${heading}\n`);
  if (start === -1) {
    return "";
  }
  const bodyStart = start + heading.length + 1;
  const next = content.slice(bodyStart).search(/^##\s+/m);
  return next === -1 ? content.slice(bodyStart) : content.slice(bodyStart, bodyStart + next);
}

function parseRoadmapLine(line) {
  const match = line.match(/^- \[([ xX])\]\s+([a-zA-Z0-9._-]+)\s+--\s+(.+?)\.?\s+Dependencies:\s*(.+)\s*$/);
  if (!match) {
    return null;
  }
  return {
    featureName: match[2],
    description: match[3],
    dependencies: match[4].trim().toLowerCase() === "none"
      ? []
      : match[4].split(",").map((dependency) => dependency.trim()).filter(Boolean),
    status: match[1].toLowerCase() === "x" ? "done" : "pending",
  };
}

export function parseRoadmap(content) {
  const errors = [];
  const specs = [];
  const specsBody = sectionBody(content, "## Specs (dependency order)");
  if (!specsBody) {
    errors.push("missing ## Specs (dependency order) section");
  }
  for (const line of specsBody.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (!trimmed.startsWith("- [")) {
      errors.push(`invalid roadmap spec entry: ${line}`);
      continue;
    }
    const entry = parseRoadmapLine(trimmed);
    if (!entry) {
      errors.push(`invalid roadmap spec entry: ${line}`);
      continue;
    }
    specs.push(entry);
  }
  const names = new Set(specs.map((spec) => spec.featureName));
  for (const spec of specs) {
    for (const dependency of spec.dependencies) {
      if (!names.has(dependency)) {
        errors.push(`${spec.featureName} has missing dependency ${dependency}`);
      }
    }
  }
  return {
    specs,
    awarenessOnlySections: ["Existing Spec Updates", "Direct Implementation Candidates"].filter((section) =>
      content.includes(`## ${section}`),
    ),
    errors,
  };
}

export function buildDependencyWaves(specs) {
  const errors = [];
  const byName = new Map(specs.map((spec) => [spec.featureName, spec]));
  for (const spec of specs) {
    for (const dependency of spec.dependencies) {
      if (!byName.has(dependency)) {
        errors.push(`${spec.featureName} has missing dependency ${dependency}`);
      }
    }
  }
  if (errors.length > 0) {
    return { ok: false, waves: [], skippedCompleted: [], errors };
  }

  const completed = new Set(specs.filter((spec) => spec.status === "done").map((spec) => spec.featureName));
  const pending = new Set(specs.filter((spec) => spec.status === "pending").map((spec) => spec.featureName));
  const waves = [];

  while (pending.size > 0) {
    const current = [...pending].filter((featureName) => {
      const spec = byName.get(featureName);
      return spec.dependencies.every((dependency) => completed.has(dependency));
    });
    if (current.length === 0) {
      return {
        ok: false,
        waves,
        skippedCompleted: [...completed],
        errors: [`circular dependency among pending specs: ${[...pending].sort().join(", ")}`],
      };
    }
    current.sort();
    waves.push({ waveNumber: waves.length + 1, featureNames: current });
    for (const featureName of current) {
      pending.delete(featureName);
      completed.add(featureName);
    }
  }

  return {
    ok: true,
    waves,
    skippedCompleted: specs.filter((spec) => spec.status === "done").map((spec) => spec.featureName).sort(),
    errors: [],
  };
}

export function validateBatchPlanPrerequisites(repoRoot, specs) {
  const errors = [];
  for (const spec of specs) {
    if (spec.status !== "pending") {
      continue;
    }
    const briefPath = join(repoRoot, ".kiro", "specs", spec.featureName, "brief.md");
    if (!existsSync(briefPath)) {
      errors.push(`pending spec ${spec.featureName} missing .kiro/specs/${spec.featureName}/brief.md`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateRoadmapParserFixture(repoRoot) {
  const failures = [];
  const roadmapPath = join(repoRoot, ".kiro", "steering", "roadmap.md");
  if (!existsSync(roadmapPath)) {
    return failures;
  }
  const result = parseRoadmap(readText(roadmapPath));
  for (const error of result.errors) {
    failures.push(`ROADMAP_PARSER_DRIFT: ${rel(repoRoot, roadmapPath)} ${error}`);
  }
  const plan = buildDependencyWaves(result.specs);
  for (const error of plan.errors) {
    failures.push(`ROADMAP_PARSER_DRIFT: ${rel(repoRoot, roadmapPath)} ${error}`);
  }
  const prerequisites = validateBatchPlanPrerequisites(repoRoot, result.specs);
  for (const error of prerequisites.errors) {
    failures.push(`ROADMAP_PARSER_DRIFT: ${rel(repoRoot, roadmapPath)} ${error}`);
  }
  return failures;
}

export function validateKiroDiscoveryBatchWorkflows(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? defaultRepoRoot);
  const failures = [];

  for (const lang of languages) {
    for (const spec of workflowSpecs) {
      failures.push(...validateWorkflow(repoRoot, lang, spec));
    }
    for (const spec of facetSpecs) {
      failures.push(...validateFacet(repoRoot, lang, spec));
    }
    failures.push(...validateNoUnusedDiscoveryBatchFacets(repoRoot, lang));
  }
  failures.push(...validateRoadmapParserFixture(repoRoot));
  failures.push(...validateLanguageParity(repoRoot));

  return {
    ok: failures.length === 0,
    checkedWorkflows: workflowSpecs.map((spec) => spec.file),
    checkedFacets: facetSpecs.map((spec) => `${spec.kind}/${spec.file}`),
    failures,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateKiroDiscoveryBatchWorkflows();
  if (!result.ok) {
    console.error(result.failures.join("\n"));
    process.exit(1);
  }
  console.log("Kiro discovery/batch workflow validation passed.");
}
