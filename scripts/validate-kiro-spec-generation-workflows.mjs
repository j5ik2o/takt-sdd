#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractKiroSkillSourceInstruction } from "./validate-kiro-shared-contracts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = join(__dirname, "..");
const languages = ["en", "ja"];
const draftReviewRoutingTerms = ["draft_status", "review_gate", "READY_FOR_REVIEW", "PENDING"];
const generationResultContractTerms = [
  "phase",
  "validation",
  "featureName",
  "updatedFiles",
  "nextAction",
  "blockingReason",
  "draft_status",
  "review_gate",
  "draft_artifacts",
  "READY_FOR_REVIEW",
  "NEEDS_FIX",
  "BLOCKED",
  "WRITTEN",
  "PENDING",
  "PASSED",
  "FAILED",
  "NOT_APPLICABLE",
  "PASS",
];

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
    requiredTerms: [
      "requirements.md",
      "requirements-generated",
      "EARS",
      "kiro-spec-generation-result",
      ...draftReviewRoutingTerms,
    ],
    instructionFacets: ["kiro-spec-requirements", "kiro-spec-requirements-review"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result"],
  },
  {
    name: "kiro-spec-design",
    requiredTerms: [
      "design.md",
      "research.md",
      "design-generated",
      "Boundary Commitments",
      "File Structure Plan",
      ...draftReviewRoutingTerms,
      "unscoped git diff",
      "ai_gate_scope_mismatch",
      "review_target_scope_mismatch",
    ],
    instructionFacets: ["kiro-spec-design", "kiro-validate-design-readiness"],
    policyFacets: ["kiro-spec-generation"],
    outputContracts: ["kiro-spec-generation-result", "kiro-validation-result"],
  },
  {
    name: "kiro-spec-tasks",
    requiredTerms: [
      "tasks.md",
      "tasks-generated",
      "_Boundary:_",
      "_Depends:_",
      "kiro-spec-generation-result",
      ...draftReviewRoutingTerms,
      "draft_artifacts.tasks",
      "tasks_draft",
      "unscoped git diff",
      "fatal_review_issue",
      "AI_GATE_SCOPE_MISMATCH",
      "REVIEW_TARGET_SCOPE_MISMATCH",
      "MISSING_DRAFT_ARTIFACT",
    ],
    instructionFacets: ["kiro-spec-tasks", "kiro-spec-tasks-review"],
    policyFacets: ["kiro-spec-generation", "kiro-spec-task-annotations"],
    outputContracts: ["kiro-spec-generation-result", "kiro-spec-tasks-review-result"],
  },
  {
    name: "kiro-spec-quick",
    requiredTerms: [
      "quick-init",
      "quick-requirements",
      "quick-ai-quality-gate-requirements",
      "quick-review-requirements",
      "quick-repair-requirements",
      "quick-finalize-requirements",
      "quick-design",
      "quick-ai-quality-gate-design",
      "quick-review-design",
      "quick-repair-design",
      "quick-finalize-design",
      "quick-tasks",
      "quick-ai-quality-gate-tasks",
      "quick-review-tasks",
      "quick-repair-tasks",
      "quick-finalize-tasks",
      "quick-sanity-review",
      "unscoped git diff",
      "fatal_review_issue",
      "AI_GATE_SCOPE_MISMATCH",
      "REVIEW_TARGET_SCOPE_MISMATCH",
      "MISSING_DRAFT_ARTIFACT",
    ],
    instructionFacets: [
      "kiro-spec-init",
      "kiro-spec-requirements",
      "kiro-spec-requirements-review",
      "kiro-spec-design",
      "kiro-validate-design-readiness",
      "kiro-spec-tasks",
      "kiro-spec-tasks-review",
      "kiro-spec-quick-sanity-review",
    ],
    policyFacets: [
      "kiro-artifact-operations",
      "kiro-spec-lifecycle",
      "kiro-spec-generation",
      "kiro-spec-task-annotations",
    ],
    outputContracts: [
      "kiro-spec-generation-result",
      "kiro-validation-result",
      "kiro-spec-tasks-review-result",
      "kiro-spec-sanity-review",
    ],
  },
];

const auxiliaryWorkflowSpecs = [
  {
    name: "kiro-spec-ai-quality-gate",
    requiredTerms: [
      "ai-antipattern-review: ../facets/instructions/ai-review.md",
      "instruction: ai-antipattern-review",
      "kiro-ai-antipattern-fix-spec-generation",
    ],
    instructionFacets: [],
    policyFacets: [],
    outputContracts: [],
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
    terms: ["tasks.md", "_Boundary:_", "_Depends:_", "tasks-generated", "draft_artifacts.tasks", "non-empty dependencies"],
  },
  {
    kind: "instructions",
    name: "kiro-spec-tasks-review",
    terms: [
      "Review Task Plan",
      "task_plan_review",
      "task_graph_sanity_review",
      "fatal_review_issue",
      "read-only",
      "PASS",
      "NEEDS_FIXES",
      "RETURN_TO_DESIGN",
      "draft_artifacts.tasks",
      "tasks_draft",
      "ai_gate_scope_mismatch",
      "unscoped git diff",
      "non-empty dependencies",
    ],
  },
  {
    kind: "output-contracts",
    name: "kiro-spec-tasks-review-result",
    terms: ["task_plan_review", "task_graph_sanity_review", "fatal_review_issue", "PASS", "NEEDS_FIXES", "RETURN_TO_DESIGN", "summary"],
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
    terms: ["_Boundary:_", "_Depends:_", "none", "(P)", "non-empty dependencies"],
  },
  {
    kind: "output-contracts",
    name: "kiro-spec-generation-result",
    terms: generationResultContractTerms,
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
    termSets: [["phase requirements", "draft_status READY_FOR_REVIEW", "review_gate PENDING"]],
  },
  {
    step: "quick-finalize-requirements",
    termSets: [["phase requirements", "requirements.md written", "requirements-generated", "approvals.requirements.generated true"]],
  },
  {
    step: "quick-design",
    termSets: [["phase design", "draft_status READY_FOR_REVIEW", "review_gate PENDING"]],
  },
  {
    step: "quick-finalize-design",
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
    termSets: [["phase tasks", "draft_status READY_FOR_REVIEW", "review_gate PENDING"]],
  },
  {
    step: "quick-finalize-tasks",
    termSets: [
      [
        "same auto-approve semantics",
        "phase tasks",
        "draft_status WRITTEN",
        "review_gate PASSED",
        "tasks.md written",
        "tasks-generated",
        "approvals.requirements.approved true",
        "approvals.design.approved true",
        "approvals.tasks.generated true",
        "approvals.tasks.approved true",
        "ready_for_implementation true",
      ],
      [
        "not auto-approve",
        "phase tasks",
        "draft_status WRITTEN",
        "review_gate PASSED",
        "tasks.md written",
        "tasks-generated",
        "approvals.requirements.approved true",
        "approvals.design.approved true",
        "approvals.tasks.generated true",
      ],
    ],
  },
];

const taskWorkflowCompletionTermSets = [
  [
    "auto-approve",
    "phase tasks",
    "draft_status WRITTEN",
    "review_gate PASSED",
    "tasks.md written",
    "tasks-generated",
    "approvals.requirements.approved true",
    "approvals.design.approved true",
    "approvals.tasks.generated true",
    "approvals.tasks.approved true",
    "ready_for_implementation true",
  ],
  [
    "not auto-approve",
    "phase tasks",
    "draft_status WRITTEN",
    "review_gate PASSED",
    "tasks.md written",
    "tasks-generated",
    "approvals.requirements.approved true",
    "approvals.design.approved true",
    "approvals.tasks.generated true",
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
const skillAdapterFacetSpecs = [
  {
    name: "kiro-spec-requirements-review",
    extendsSkill: "kiro-spec-requirements",
    extendsSkillSection: "### Step 4: Review Requirements Draft",
    machineFields: ["validation.verdict"],
    enums: ["PASS", "NEEDS_FIX", "BLOCKED"],
  },
  {
    name: "kiro-spec-tasks-review",
    extendsSkill: "kiro-spec-tasks",
    extendsSkillSection: "### Step 3: Review Task Plan",
    extendsSkillAdditionalSection: "### Step 3.5: Run Task-Graph Sanity Review",
    machineFields: ["task_plan_review", "task_graph_sanity_review", "fatal_review_issue"],
    enums: ["PASS", "NEEDS_FIXES", "RETURN_TO_DESIGN", "NONE", "AI_GATE_SCOPE_MISMATCH", "REVIEW_TARGET_SCOPE_MISMATCH", "MISSING_DRAFT_ARTIFACT"],
  },
  {
    name: "kiro-validate-design-readiness",
    extendsSkill: "kiro-validate-design",
    extendsSkillSection: "## Execution Steps",
    machineFields: ["DECISION"],
    enums: ["GO", "NO-GO", "MANUAL_VERIFY_REQUIRED"],
    requiredTerms: [
      "Draft review mode",
      "kiro-spec-design-result.md",
      "kiro-spec-quick-design-result.md",
      "draft_artifacts",
      "design.md draft",
      "missing_draft_artifact",
      "ai_gate_scope_mismatch",
      "review_target_scope_mismatch",
      "review_target",
      "unscoped git diff",
      "path filter",
      "git diff",
      "current dirty worktree",
      "local repair possible",
    ],
  },
  {
    name: "kiro-spec-quick-sanity-review",
    extendsSkill: "kiro-spec-quick",
    extendsSkillSection: "#### Final Sanity Review",
    machineFields: ["verdict"],
    enums: ["PASS", "NEEDS_FIX", "BLOCKED"],
  },
];

const generationWorkflowStepSpecs = [
  {
    name: "kiro-spec-requirements",
    steps: ["generate-requirements", "review-requirements", "repair-requirements", "finalize-requirements"],
  },
  {
    name: "kiro-spec-design",
    steps: ["generate-design", "review-design", "repair-design", "finalize-design"],
  },
  {
    name: "kiro-spec-tasks",
    steps: ["generate-tasks", "review-tasks", "repair-tasks", "finalize-tasks"],
  },
  {
    name: "kiro-spec-quick",
    steps: [
      "quick-init",
      "quick-requirements",
      "quick-review-requirements",
      "quick-repair-requirements",
      "quick-finalize-requirements",
      "quick-design",
      "quick-review-design",
      "quick-repair-design",
      "quick-finalize-design",
      "quick-tasks",
      "quick-review-tasks",
      "quick-repair-tasks",
      "quick-finalize-tasks",
      "quick-sanity-review",
    ],
  },
];

const reviewStepFieldContractSpecs = [
  {
    workflow: "kiro-spec-requirements",
    step: "review-requirements",
    outputContract: "kiro-spec-generation-result",
    requiredConditionTermSets: [
      ["validation.verdict", "PASS"],
      ["validation.verdict", "NEEDS_FIX"],
      ["validation.verdict", "BLOCKED"],
    ],
    forbiddenFields: ["review.verdict"],
  },
  {
    workflow: "kiro-spec-design",
    step: "review-design",
    outputContract: "kiro-validation-result",
    requiredConditionTermSets: [
      ["DECISION", "GO"],
      ["DECISION", "NO-GO"],
      ["DECISION", "MANUAL_VERIFY_REQUIRED"],
    ],
    forbiddenFields: ["validation.verdict", "review.verdict"],
  },
  {
    workflow: "kiro-spec-tasks",
    step: "review-tasks",
    outputContract: "kiro-spec-tasks-review-result",
    requiredConditionTermSets: [
      ["task_plan_review", "PASS", "task_graph_sanity_review", "PASS"],
      ["task_plan_review", "NEEDS_FIXES", "task_graph_sanity_review", "NEEDS_FIXES"],
      ["task_plan_review", "RETURN_TO_DESIGN", "task_graph_sanity_review", "RETURN_TO_DESIGN"],
    ],
    forbiddenFields: ["validation.verdict", "review.verdict"],
  },
  {
    workflow: "kiro-spec-quick",
    step: "quick-review-requirements",
    outputContract: "kiro-spec-generation-result",
    requiredConditionTermSets: [
      ["validation.verdict", "PASS"],
      ["validation.verdict", "NEEDS_FIX"],
      ["validation.verdict", "BLOCKED"],
    ],
    forbiddenFields: ["review.verdict"],
  },
  {
    workflow: "kiro-spec-quick",
    step: "quick-review-design",
    outputContract: "kiro-validation-result",
    requiredConditionTermSets: [
      ["DECISION", "GO"],
      ["DECISION", "NO-GO"],
      ["DECISION", "MANUAL_VERIFY_REQUIRED"],
    ],
    forbiddenFields: ["validation.verdict", "review.verdict"],
  },
  {
    workflow: "kiro-spec-quick",
    step: "quick-review-tasks",
    outputContract: "kiro-spec-tasks-review-result",
    requiredConditionTermSets: [
      ["task_plan_review", "PASS", "task_graph_sanity_review", "PASS"],
      ["task_plan_review", "NEEDS_FIXES", "task_graph_sanity_review", "NEEDS_FIXES"],
      ["task_plan_review", "RETURN_TO_DESIGN", "task_graph_sanity_review", "RETURN_TO_DESIGN"],
    ],
    forbiddenFields: ["validation.verdict", "review.verdict"],
  },
  {
    workflow: "kiro-spec-quick",
    step: "quick-sanity-review",
    outputContract: "kiro-spec-sanity-review",
    requiredConditionTermSets: [
      ["verdict", "PASS"],
      ["verdict", "NEEDS_FIX"],
      ["verdict", "BLOCKED"],
    ],
    forbiddenFields: ["validation.verdict", "review.verdict"],
  },
];

const outOfBoundaryKiroSpecInstructionFacets = new Set(["kiro-spec-batch", "kiro-spec-status"]);

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactTerm(content, term) {
  const tokenChars = "A-Za-z0-9_.-";
  return new RegExp(`(^|[^${tokenChars}])${escapeRegExp(term)}($|[^${tokenChars}])`).test(content);
}

function hasConditionWithTerms(conditions, terms) {
  return conditions.some((condition) => terms.every((term) => hasExactTerm(condition, term)));
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
    for (const spec of [...phaseWorkflowSpecs, ...auxiliaryWorkflowSpecs]) {
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
      if (spec.kind === "output-contracts" && spec.name === "kiro-spec-generation-result") {
        validateGenerationResultContractShape(content, path, failures, repoRoot);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateGenerationResultContractShape(content, path, failures, repoRoot) {
  const draftStatusLine = content.match(/^- `draft_status`:[^\n]*/m)?.[0] ?? "";
  if (/\b(?:NEEDS_FIX|BLOCKED)\b/.test(draftStatusLine)) {
    failures.push(
      `FACET_DRIFT: ${rel(repoRoot, path)} must not list validation verdict values NEEDS_FIX or BLOCKED as draft_status states`,
    );
  }
  if (/^- `(?:NEEDS_FIX|BLOCKED)`\s/m.test(content)) {
    failures.push(
      `FACET_DRIFT: ${rel(repoRoot, path)} must describe NEEDS_FIX and BLOCKED as validation.verdict values`,
    );
  }
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
    const requiredSteps = [
      "quick-init",
      "quick-requirements",
      "quick-review-requirements",
      "quick-repair-requirements",
      "quick-finalize-requirements",
      "quick-design",
      "quick-review-design",
      "quick-repair-design",
      "quick-finalize-design",
      "quick-tasks",
      "quick-review-tasks",
      "quick-repair-tasks",
      "quick-finalize-tasks",
      "quick-sanity-review",
    ];
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

    for (const block of blocks) {
      const blockText = block.join("\n");
      const stepName = stepScalar(block, "name");
      const kind = stepScalar(block, "kind");
      const call = stepScalar(block, "call");
      const hasLegacyWorkflowCall = /^    workflow_call:\s*/m.test(blockText);
      const hasWorkflowCall = kind === "workflow_call" || hasLegacyWorkflowCall;
      if (!hasWorkflowCall) {
        continue;
      }
      if (!stepName.startsWith("quick-ai-quality-gate-") || kind !== "workflow_call" || call !== "./kiro-spec-ai-quality-gate.yaml") {
        failures.push(
          `QUICK_COMPOSITION_DRIFT: ${rel(repoRoot, path)} workflow_call is only allowed for quick spec AI quality gate steps`,
        );
      }
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
    const block = blocks.find((candidate) => stepScalar(candidate, "name") === "finalize-tasks");
    if (!block) {
      failures.push(`TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} missing finalize-tasks step`);
      continue;
    }

    const conditions = conditionLines(block);
    for (const terms of taskWorkflowCompletionTermSets) {
      if (!hasConditionWithTerms(conditions, terms)) {
        failures.push(
          `TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} finalize-tasks missing completion condition with terms: ${terms.join(", ")}`,
        );
      }
    }

    for (const candidate of blocks.filter((step) =>
      ["generate-tasks", "repair-tasks", "finalize-tasks"].includes(stepScalar(step, "name")),
    )) {
      const stepName = stepScalar(candidate, "name");
      for (const condition of conditionLines(candidate)) {
        if (condition.includes("task plan review PASS") || condition.includes("task graph sanity review PASS")) {
          failures.push(
            `TASK_WORKFLOW_DRIFT: ${rel(repoRoot, path)} step ${stepName} must not branch on review-only fields in kiro-spec-generation-result`,
          );
        }
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

function adapterSignature(content, spec) {
  const skillSource = extractKiroSkillSourceInstruction(content);
  return {
    skill: skillSource.skill,
    section: skillSource.section,
    additionalSections: skillSource.additionalSections,
    machineFields: spec.machineFields.filter((field) => hasExactTerm(content, field)).sort(),
    enums: spec.enums.filter((value) => hasExactTerm(content, value)).sort(),
  };
}

function compareAdapterSignatures(failures, spec, enSignature, jaSignature) {
  for (const key of ["skill", "section", "additionalSections"]) {
    if (JSON.stringify(enSignature[key]) !== JSON.stringify(jaSignature[key])) {
      failures.push(
        `SKILL_ADAPTER_DRIFT: .takt/{en,ja}/facets/instructions/${spec.name}.md ${key} mismatch: en=${JSON.stringify(enSignature[key])} ja=${JSON.stringify(jaSignature[key])}`,
      );
    }
  }

  for (const key of ["machineFields", "enums"]) {
    const enValue = JSON.stringify(enSignature[key]);
    const jaValue = JSON.stringify(jaSignature[key]);
    if (enValue !== jaValue) {
      failures.push(
        `SKILL_ADAPTER_DRIFT: .takt/{en,ja}/facets/instructions/${spec.name}.md ${key} mismatch: en=${enValue} ja=${jaValue}`,
      );
    }
  }
}

function validateSkillAdapterFacets(repoRoot) {
  const failures = [];
  for (const spec of skillAdapterFacetSpecs) {
    const signatures = {};
    for (const lang of languages) {
      const path = join(repoRoot, ".takt", lang, "facets", "instructions", `${spec.name}.md`);
      if (!existsSync(path)) {
        failures.push(`SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} missing`);
        continue;
      }

      const content = readText(path);
      const skillSource = extractKiroSkillSourceInstruction(content);
      if (skillSource.skill !== spec.extendsSkill) {
        failures.push(`SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} skill must equal ${JSON.stringify(spec.extendsSkill)}`);
      }
      if (skillSource.section !== spec.extendsSkillSection) {
        failures.push(`SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} section must equal ${JSON.stringify(spec.extendsSkillSection)}`);
      }
      if (spec.extendsSkillAdditionalSection && !skillSource.additionalSections.includes(spec.extendsSkillAdditionalSection)) {
        failures.push(
          `SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} additionalSections must include ${JSON.stringify(spec.extendsSkillAdditionalSection)}`,
        );
      }

      for (const field of spec.machineFields) {
        if (!hasExactTerm(content, field)) {
          failures.push(`SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} missing machine field: ${field}`);
        }
      }
      for (const value of spec.enums) {
        if (!hasExactTerm(content, value)) {
          failures.push(`SKILL_ADAPTER_DRIFT: ${rel(repoRoot, path)} missing enum: ${value}`);
        }
      }
      containsAll(content, spec.requiredTerms ?? [], path, failures, repoRoot, "SKILL_ADAPTER_DRIFT");
      signatures[lang] = adapterSignature(content, spec);
    }

    if (signatures.en && signatures.ja) {
      compareAdapterSignatures(failures, spec, signatures.en, signatures.ja);
    }
  }

  return { ok: failures.length === 0, failures };
}

function generationInstructionFacetNames() {
  return [
    ...new Set(
      phaseWorkflowSpecs
        .flatMap((spec) => spec.instructionFacets)
        .filter((name) => name.startsWith("kiro-spec-")),
    ),
  ].sort();
}

function workflowInstructionReferences(content) {
  return topLevelMap(content, "instructions").map((entry) => entry.split("=")[0]);
}

function validateLegacyKiroGenerationSurface(repoRoot) {
  const failures = [];
  const expectedInstructionFacets = generationInstructionFacetNames();

  for (const lang of languages) {
    const referencedInstructionFacets = new Set();
    for (const spec of phaseWorkflowSpecs) {
      const workflowPath = join(repoRoot, ".takt", lang, "workflows", `${spec.name}.yaml`);
      if (!existsSync(workflowPath)) {
        continue;
      }
      for (const reference of workflowInstructionReferences(readText(workflowPath))) {
        referencedInstructionFacets.add(reference);
      }
    }

    for (const spec of generationWorkflowStepSpecs) {
      const workflowPath = join(repoRoot, ".takt", lang, "workflows", `${spec.name}.yaml`);
      if (!existsSync(workflowPath)) {
        continue;
      }
      const actualSteps = stepBlocks(readText(workflowPath)).map((block) => stepScalar(block, "name"));
      for (const step of spec.steps) {
        if (!actualSteps.includes(step)) {
          failures.push(
            `LEGACY_KIRO_GENERATION_DRIFT: ${rel(repoRoot, workflowPath)} must be a Kiro skill adapter step sequence and include step ${step}`,
          );
        }
      }
    }

    for (const facet of expectedInstructionFacets) {
      const facetPath = join(repoRoot, ".takt", lang, "facets", "instructions", `${facet}.md`);
      if (!existsSync(facetPath)) {
        continue;
      }
      const skillSource = extractKiroSkillSourceInstruction(readText(facetPath));
      if (!skillSource.skill) {
        failures.push(
          `LEGACY_KIRO_GENERATION_DRIFT: ${rel(repoRoot, facetPath)} must include Kiro Skill Source for thin Kiro skill adapter reuse`,
        );
      }
    }

    const instructionFacetDir = join(repoRoot, ".takt", lang, "facets", "instructions");
    for (const facet of listBasenames(repoRoot, rel(repoRoot, instructionFacetDir), ".md")) {
      if (outOfBoundaryKiroSpecInstructionFacets.has(facet)) {
        continue;
      }
      const facetPath = join(instructionFacetDir, `${facet}.md`);
      if (!referencedInstructionFacets.has(facet)) {
        failures.push(
          `LEGACY_KIRO_GENERATION_DRIFT: ${rel(repoRoot, facetPath)} is an unreferenced Kiro-specific instruction facet`,
        );
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

function validateReviewFieldContracts(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    for (const spec of reviewStepFieldContractSpecs) {
      const workflowPath = join(repoRoot, ".takt", lang, "workflows", `${spec.workflow}.yaml`);
      if (!existsSync(workflowPath)) {
        continue;
      }

      const block = stepBlocks(readText(workflowPath)).find((candidate) => stepScalar(candidate, "name") === spec.step);
      if (!block) {
        failures.push(
          `REVIEW_FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} missing review step ${spec.step}`,
        );
        continue;
      }

      const blockText = block.join("\n");
      if (!blockText.includes(`format: ${spec.outputContract}`)) {
        failures.push(
          `REVIEW_OUTPUT_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} step ${spec.step} must emit ${spec.outputContract}`,
        );
      }

      const conditions = conditionLines(block);
      for (const terms of spec.requiredConditionTermSets) {
        if (!hasConditionWithTerms(conditions, terms)) {
          failures.push(
            `REVIEW_FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} step ${spec.step} must branch on Kiro skill field terms: ${terms.join(", ")}`,
          );
        }
      }

      for (const forbiddenField of spec.forbiddenFields) {
        if (conditions.some((condition) => condition.includes(forbiddenField))) {
          failures.push(
            `REVIEW_FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} step ${spec.step} must not route review result through ${forbiddenField}`,
          );
        }
      }
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
    skillAdapterFacets: validateSkillAdapterFacets(repoRoot),
    legacyGenerationSurface: validateLegacyKiroGenerationSurface(repoRoot),
    reviewFieldContracts: validateReviewFieldContracts(repoRoot),
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
