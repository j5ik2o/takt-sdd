#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractKiroSkillSourceInstruction } from "./validate-kiro-shared-contracts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultRepoRoot = join(__dirname, "..");
const languages = ["en", "ja"];

const instructionSpecs = [
  {
    name: "kiro-impl-plan-one-task",
    skill: "kiro-impl",
    section: "## Step 2: Select Tasks & Determine Mode",
    parent: "plan",
    terms: [
      "ready_for_implementation",
      "spec.json",
      "tasks.md",
      "_Boundary:_",
      "_Depends:_",
      "one task",
      "READY_FOR_REVIEW",
      "BLOCKED",
      "selected_task",
      "blocker_note_required",
      "baseline_dirty_files",
    ],
  },
  {
    name: "kiro-impl-execute-task",
    skill: "kiro-impl",
    section: "## Step 3: Execute Implementation",
    parent: "implement-after-tests",
    terms: [
      "## Status Report",
      "STATUS",
      "READY_FOR_REVIEW",
      "BLOCKED",
      "NEEDS_CONTEXT",
      "RED_PHASE_OUTPUT",
      "kiro-implementation-result",
      "baseline_dirty_files",
      "changed_files",
      "Implementation Notes",
    ],
  },
  {
    name: "kiro-impl-update-progress",
    skill: "kiro-impl",
    section: "### Manual Mode (main context)",
    parent: "fix",
    terms: [
      "STATUS",
      "READY_FOR_REVIEW",
      "BLOCKED",
      "NEEDS_CONTEXT",
      "task_set_status",
      "VERIFIED",
      "safe_to_update_progress",
      "selected task",
      "checkbox",
      "executable leaf task",
      "group header",
      "Implementation Notes",
      ".kiro/specs/<feature>/tasks.md",
      "re-read",
    ],
  },
  {
    name: "kiro-review-task",
    skill: "kiro-review",
    section: "## Outputs",
    parent: "review-coding",
    terms: [
      "VERDICT",
      "APPROVED",
      "REJECTED",
      "approved",
      "needs_fix",
      "Review Verdict",
      "selected task",
      "boundary",
      "output source of truth",
      "TAKT routing",
      "baseline_dirty_files",
      "changed_files",
      "git diff -- <changed_files>",
      "implementation_scope_mismatch",
      "Adversarial review posture: default VERDICT is REJECTED",
    ],
  },
  {
    name: "kiro-review-architecture-task",
    skill: "kiro-review",
    section: "## Outputs",
    parent: "review-arch",
    terms: [
      "VERDICT",
      "APPROVED",
      "REJECTED",
      "approved",
      "needs_fix",
      "Review Verdict",
      "selected task",
      "boundary",
      "kiro-ai-antipattern-review.md",
      "baseline_dirty_files",
      "changed_files",
      "git diff -- <changed_files>",
      "implementation_scope_mismatch",
      "Adversarial review posture: default VERDICT is REJECTED",
    ],
  },
  {
    name: "kiro-review-qa-task",
    skill: "kiro-review",
    section: "## Outputs",
    parent: "review-qa",
    terms: [
      "VERDICT",
      "APPROVED",
      "REJECTED",
      "approved",
      "needs_fix",
      "Review Verdict",
      "selected task",
      "validation evidence",
      "kiro-ai-antipattern-review.md",
      "baseline_dirty_files",
      "changed_files",
      "git diff -- <changed_files>",
      "implementation_scope_mismatch",
      "Adversarial review posture: default VERDICT is REJECTED",
    ],
  },
  {
    name: "kiro-review-testing-task",
    skill: "kiro-review",
    section: "## Outputs",
    parent: "review-test",
    terms: [
      "VERDICT",
      "APPROVED",
      "REJECTED",
      "approved",
      "needs_fix",
      "Review Verdict",
      "selected task",
      "RED_PHASE_OUTPUT",
      "kiro-ai-antipattern-review.md",
      "baseline_dirty_files",
      "changed_files",
      "git diff -- <changed_files>",
      "implementation_scope_mismatch",
      "Adversarial review posture: default VERDICT is REJECTED",
    ],
  },
  {
    name: "kiro-debug-task",
    skill: "kiro-debug",
    section: "## Outputs",
    parent: "fix",
    terms: [
      "NEXT_ACTION",
      "RETRY_TASK",
      "BLOCK_TASK",
      "STOP_FOR_HUMAN",
      "retry_eligible",
      "ROOT_CAUSE",
      "FIX_PLAN",
      "kiro-task-implementation-result.md",
      "kiro-task-coding-review.md",
      "kiro-task-architecture-review.md",
      "kiro-task-qa-review.md",
      "kiro-task-testing-review.md",
      "any(\"needs_fix\")",
      "need_replan",
      "Implementation Notes",
    ],
  },
  {
    name: "kiro-verify-task-completion",
    skill: "kiro-verify-completion",
    section: "## Outputs",
    parent: "supervise",
    terms: [
      "STATUS",
      "VERIFIED",
      "NOT_VERIFIED",
      "MANUAL_VERIFY_REQUIRED",
      "safe_to_update_progress",
      "kiro-task-coding-review.md",
      "kiro-task-architecture-review.md",
      "kiro-task-qa-review.md",
      "kiro-task-testing-review.md",
      "approved",
      "needs_fix",
    ],
  },
  {
    name: "kiro-validate-impl-final",
    skill: "kiro-validate-impl",
    section: "### 4. Generate Report",
    parent: "supervise",
    terms: ["DECISION", "GO", "NO-GO", "MANUAL_VERIFY_REQUIRED", "FEATURE_GO"],
  },
];

const gateInstructionSpecs = [
  {
    name: "ai-review",
    terms: [
      "Kiro implementation selected-task mode",
      "selected_task",
      "baseline_dirty_files",
      "changed_files",
      "git diff -- <changed_files>",
      "selected_task_diff",
      "implementation_scope_mismatch",
      "review_target: git_diff",
    ],
  },
  {
    name: "kiro-ai-antipattern-fix-implementation",
    terms: [
      "kiro-task-implementation-result.md",
      "kiro-ai-antipattern-review.md",
      "kiro-ai-antipattern-fix.md",
      "selected task",
      "tasks.md",
      "Implementation Notes",
      "FIXED",
      "NO_FIX_NEEDED",
      "NEED_REPLAN",
      "BLOCKED",
      "finding-level evidence",
      "WebSearch",
      "WebFetch",
      "implementation_scope_mismatch",
      "baseline_dirty_files",
      "NEED_REPLAN",
    ],
  },
];

const outputContractSpecs = [
  {
    name: "kiro-implementation-result",
    parent: "validation",
    terms: [
      "STATUS",
      "READY_FOR_REVIEW",
      "BLOCKED",
      "NEEDS_CONTEXT",
      "ready_for_implementation",
      "selected_task",
      "blocker_note_required",
      "implementation_plan",
      "task_set_status",
      "executable leaf task",
      "group header",
      "baseline_dirty_files",
      "changed_files",
      "validation_evidence",
      "missing_context",
      "RED_PHASE_OUTPUT",
      "summary",
    ],
  },
];

const gateOutputContractSpecs = [
  {
    name: "kiro-ai-antipattern-fix-result",
    parent: "validation",
    terms: [
      "STATUS",
      "FIXED",
      "NO_FIX_NEEDED",
      "NEED_REPLAN",
      "BLOCKED",
      "finding_decisions",
      "changed_files",
      "scope_guard",
      "validation_evidence",
      "no_fix_rationale",
      "missing_context",
      "kiro-ai-antipattern-fix.md",
    ],
  },
];

const policySpecs = [
  {
    name: "kiro-impl-task-progress",
    parent: "existing-system-respect",
    terms: [
      "selected task",
      "STATUS",
      "VERIFIED",
      "safe_to_update_progress",
      "checkbox",
      "blocker",
      "Implementation Notes",
      "re-read",
    ],
  },
];

const workflowInstructionNames = instructionSpecs.map((spec) => spec.name);
const workflowReportFormats = [
  "kiro-implementation-result",
  "kiro-review-verdict",
  "kiro-debug-decision",
  "kiro-completion-verification",
  "kiro-ai-antipattern-fix-result",
  "kiro-validation-result",
];
const workflowPolicyNames = [
  "kiro-artifact-operations",
  "kiro-spec-lifecycle",
  "kiro-spec-task-annotations",
  "kiro-impl-task-progress",
];
const expectedSteps = [
  "plan-one-task",
  "execute-task",
  "ai-quality-gate",
  "reviewers",
  "debug-task",
  "verify-task-completion",
  "update-progress",
  "validate-impl-final",
];
const forbiddenStandaloneWorkflows = ["kiro-review", "kiro-debug", "kiro-verify-completion"];
const forbiddenBoundaryTerms = [
  "kiro-spec-batch",
  "kiro-discovery",
  "PR monitoring",
  "GitHub review",
  "OpenSpec completion",
  "major-version migration",
];
const customLoopSourcePattern =
  /\b(retryCount|maxAttempts|max-attempt|max attempts|attempt budget|retry budget|独自 retry|独自 max|独自 loop-health|loop-health source of truth)\b/i;

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

function scalarLines(content, key) {
  return content
    .split("\n")
    .map((line) => line.match(new RegExp(`^\\s+${key}:\\s*(.+)\\s*$`))?.[1])
    .filter(Boolean);
}

function ruleBlocks(block) {
  const lines = block.join("\n").split("\n");
  const rules = [];
  let current = null;
  for (const line of lines) {
    if (/^\s+- condition:\s+/.test(line)) {
      if (current) {
        rules.push(current);
      }
      current = [line];
    } else if (current) {
      if (/^    [A-Za-z_]/.test(line) || /^  - name:\s+/.test(line)) {
        rules.push(current);
        current = null;
      } else {
        current.push(line);
      }
    }
  }
  if (current) {
    rules.push(current);
  }
  return rules.map((rule) => rule.join("\n"));
}

function hasRuleWithTerms(block, terms) {
  return ruleBlocks(block).some((rule) => terms.every((term) => rule.includes(term)));
}

function parallelChildBlocks(block) {
  const lines = block.join("\n").split("\n");
  const blocks = [];
  let current = null;
  for (const line of lines) {
    if (/^      - name:\s+/.test(line)) {
      if (current) {
        blocks.push(current);
      }
      current = [line];
    } else if (current) {
      if (/^    [A-Za-z_]/.test(line) || /^  - name:\s+/.test(line)) {
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

function childScalar(block, key) {
  if (key === "name") {
    const match = block.join("\n").match(/^      - name:\s*(.+)\s*$/m);
    return match?.[1] ?? "";
  }
  const match = block.join("\n").match(new RegExp(`^        ${key}:\\s*(.+)\\s*$`, "m"));
  return match?.[1] ?? "";
}

function builtInFacetPath(repoRoot, lang, kind, name) {
  return join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", kind, `${name}.md`);
}

function localFacetPath(repoRoot, lang, kind, name) {
  return join(repoRoot, ".takt", lang, "facets", kind, `${name}.md`);
}

function facetReferenceExists(repoRoot, lang, kind, name) {
  return existsSync(localFacetPath(repoRoot, lang, kind, name)) || existsSync(builtInFacetPath(repoRoot, lang, kind, name));
}

function extendsParent(content) {
  return content.match(/^\s*\{extends:\s*([^}]+?)\s*}\s*$/m)?.[1]?.trim();
}

function validatePackageScripts(repoRoot) {
  const failures = [];
  const packageJsonPath = join(repoRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { ok: false, failures: [`PACKAGE_SCRIPT_DRIFT: ${rel(repoRoot, packageJsonPath)} missing`] };
  }
  const pkg = JSON.parse(readText(packageJsonPath));
  const expected = {
    "validate:kiro-iterative-implementation-workflow":
      "node scripts/validate-kiro-iterative-implementation-workflow.mjs",
    "test:kiro-iterative-implementation-workflow":
      "node --test tests/kiro-iterative-implementation-workflow.test.mjs",
    "test:kiro-ai-quality-gate-runtime-smoke": "node --test tests/kiro-ai-quality-gate-runtime-smoke.test.mjs",
  };
  for (const [name, command] of Object.entries(expected)) {
    if (pkg.scripts?.[name] !== command) {
      failures.push(`PACKAGE_SCRIPT_DRIFT: package.json scripts.${name} must be ${command}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateWorkflowFiles(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const workflowPath = join(repoRoot, ".takt", lang, "workflows", "kiro-impl.yaml");
    if (!existsSync(workflowPath)) {
      failures.push(`WORKFLOW_MISSING: ${rel(repoRoot, workflowPath)} missing`);
      continue;
    }
    const content = readText(workflowPath);
    containsAll(
      content,
      [
        "name: kiro-impl",
        "initial_step: plan-one-task",
        "max_steps: 200",
        "loop_monitors:",
        "threshold:",
        "STATUS",
        "VERDICT",
        "NEXT_ACTION",
        "DECISION",
      ],
      workflowPath,
      failures,
      repoRoot,
      "WORKFLOW_DRIFT",
    );
    for (const name of workflowInstructionNames) {
      containsAll(content, [`${name}: ../facets/instructions/${name}.md`], workflowPath, failures, repoRoot, "WORKFLOW_DRIFT");
    }
    for (const name of workflowPolicyNames) {
      containsAll(content, [`${name}: ../facets/policies/${name}.md`], workflowPath, failures, repoRoot, "WORKFLOW_DRIFT");
    }
    for (const name of workflowReportFormats) {
      containsAll(content, [`${name}: ../facets/output-contracts/${name}.md`], workflowPath, failures, repoRoot, "WORKFLOW_DRIFT");
    }
    const stepNames = stepBlocks(content).map((block) => stepScalar(block, "name"));
    if (JSON.stringify(stepNames) !== JSON.stringify(expectedSteps)) {
      failures.push(`GATE_ORDER_DRIFT: ${rel(repoRoot, workflowPath)} step order must be ${expectedSteps.join(" -> ")}`);
    }
    const blocks = new Map(stepBlocks(content).map((block) => [stepScalar(block, "name"), block]));
    for (const persona of scalarLines(content, "persona")) {
      if (!facetReferenceExists(repoRoot, lang, "personas", persona)) {
        failures.push(`RESOURCE_REFERENCE_DRIFT: ${rel(repoRoot, workflowPath)} persona references missing resource ${persona}`);
      }
    }
    const planBlock = blocks.get("plan-one-task") ?? [];
    if (stepScalar(planBlock, "session") !== "refresh") {
      failures.push(`SESSION_DRIFT: ${rel(repoRoot, workflowPath)} plan-one-task must refresh session on each task-selection pass`);
    }
    if (stepScalar(planBlock, "pass_previous_response") !== "false") {
      failures.push(`SESSION_DRIFT: ${rel(repoRoot, workflowPath)} plan-one-task must not inherit update-progress responses when selecting the next task`);
    }
    if (!hasRuleWithTerms(planBlock, ["ready_for_implementation", "next: execute-task"])) {
      failures.push(`GATE_ORDER_DRIFT: ${rel(repoRoot, workflowPath)} plan-one-task must check readiness before edit`);
    }
    if (!hasRuleWithTerms(planBlock, ["selected task exists", "blocker_note_required true", "next: update-progress"])) {
      failures.push(`GATE_ORDER_DRIFT: ${rel(repoRoot, workflowPath)} plan-one-task must route selected-task blockers to update-progress`);
    }
    if (!hasRuleWithTerms(planBlock, ["no selected task", "readiness gate failed", "next: ABORT"])) {
      failures.push(`GATE_ORDER_DRIFT: ${rel(repoRoot, workflowPath)} plan-one-task must stop readiness-level blockers without writing tasks.md`);
    }
    const executeBlock = blocks.get("execute-task") ?? [];
    if (!hasRuleWithTerms(executeBlock, ["STATUS READY_FOR_REVIEW", "next: ai-quality-gate"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} execute-task must branch READY_FOR_REVIEW to ai-quality-gate`);
    }
    if (!hasRuleWithTerms(executeBlock, ["STATUS BLOCKED", "next: debug-task"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} execute-task must branch BLOCKED to debug-task`);
    }
    if (!hasRuleWithTerms(executeBlock, ["STATUS NEEDS_CONTEXT", "next: debug-task"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} execute-task must branch NEEDS_CONTEXT to debug-task`);
    }
    const executeGate = (blocks.get("execute-task") ?? []).join("\n");
    if (executeGate.includes("quality_gates:") || executeGate.includes("type: command")) {
      failures.push(`COMMAND_GATE_DRIFT: ${rel(repoRoot, workflowPath)} execute-task must not use unconditional command quality_gates; READY_FOR_REVIEW-only verification belongs in reported evidence / skill-mode parent hook`);
    }
    const gateBlock = blocks.get("ai-quality-gate") ?? [];
    if (stepScalar(gateBlock, "kind") !== "workflow_call" || stepScalar(gateBlock, "call") !== "./kiro-ai-quality-gate.yaml") {
      failures.push(`AI_QUALITY_GATE_DRIFT: ${rel(repoRoot, workflowPath)} ai-quality-gate must call ./kiro-ai-quality-gate.yaml via workflow_call`);
    }
    containsAll(
      gateBlock.join("\n"),
      ["fix_instruction: kiro-ai-antipattern-fix-implementation", "domain_knowledge:", "architecture"],
      workflowPath,
      failures,
      repoRoot,
      "AI_QUALITY_GATE_DRIFT",
    );
    if (!hasRuleWithTerms(gateBlock, ["COMPLETE", "next: reviewers"])) {
      failures.push(`AI_QUALITY_GATE_DRIFT: ${rel(repoRoot, workflowPath)} ai-quality-gate must route COMPLETE to reviewers`);
    }
    if (!hasRuleWithTerms(gateBlock, ["need_replan", "next: debug-task"])) {
      failures.push(`AI_QUALITY_GATE_DRIFT: ${rel(repoRoot, workflowPath)} ai-quality-gate must route need_replan to debug-task`);
    }
    if (!hasRuleWithTerms(gateBlock, ["ABORT", "next: ABORT"])) {
      failures.push(`AI_QUALITY_GATE_DRIFT: ${rel(repoRoot, workflowPath)} ai-quality-gate must route ABORT to ABORT`);
    }
    const reviewersBlock = blocks.get("reviewers") ?? [];
    if (!reviewersBlock.join("\n").includes("parallel:")) {
      failures.push(`REVIEWER_GROUP_DRIFT: ${rel(repoRoot, workflowPath)} reviewers must be a parallel group`);
    }
    const reviewerChildren = new Map(parallelChildBlocks(reviewersBlock).map((block) => [childScalar(block, "name"), block]));
    const expectedReviewers = [
      {
        name: "coding-review",
        persona: "coding-reviewer",
        instruction: "kiro-review-task",
        report: "kiro-task-coding-review.md",
        format: "kiro-review-verdict",
      },
      {
        name: "arch-review",
        persona: "architecture-reviewer",
        instruction: "kiro-review-architecture-task",
        report: "kiro-task-architecture-review.md",
        format: "kiro-review-verdict",
      },
      {
        name: "qa-review",
        persona: "qa-reviewer",
        instruction: "kiro-review-qa-task",
        report: "kiro-task-qa-review.md",
        format: "kiro-review-verdict",
      },
      {
        name: "testing-review",
        persona: "testing-reviewer",
        instruction: "kiro-review-testing-task",
        report: "kiro-task-testing-review.md",
        format: "kiro-review-verdict",
      },
    ];
    const childNames = [...reviewerChildren.keys()];
    if (JSON.stringify(childNames) !== JSON.stringify(expectedReviewers.map((reviewer) => reviewer.name))) {
      failures.push(
        `REVIEWER_GROUP_DRIFT: ${rel(repoRoot, workflowPath)} reviewer group order must be ${expectedReviewers
          .map((reviewer) => reviewer.name)
          .join(" -> ")}`,
      );
    }
    for (const reviewer of expectedReviewers) {
      const childBlock = reviewerChildren.get(reviewer.name) ?? [];
      containsAll(
        childBlock.join("\n"),
        [
          `persona: ${reviewer.persona}`,
          `instruction: ${reviewer.instruction}`,
          `name: ${reviewer.report}`,
          `format: ${reviewer.format}`,
          "condition: approved",
          "condition: needs_fix",
        ],
        workflowPath,
        failures,
        repoRoot,
        "REVIEWER_GROUP_DRIFT",
      );
      if (!facetReferenceExists(repoRoot, lang, "output-contracts", reviewer.format)) {
        failures.push(`RESOURCE_REFERENCE_DRIFT: ${rel(repoRoot, workflowPath)} reviewer ${reviewer.name} references missing output contract ${reviewer.format}`);
      }
      if (childBlock.join("\n").includes("edit: true")) {
        failures.push(`REVIEWER_GROUP_DRIFT: ${rel(repoRoot, workflowPath)} ${reviewer.name} must be read-only`);
      }
    }
    if (!hasRuleWithTerms(reviewersBlock, ['all("approved")', "next: verify-task-completion"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} reviewers must route all approved reports to verify-task-completion`);
    }
    if (!hasRuleWithTerms(reviewersBlock, ['any("needs_fix")', "next: debug-task"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} reviewers must route any needs_fix report to debug-task`);
    }
    const debugBlock = blocks.get("debug-task") ?? [];
    if (!hasRuleWithTerms(debugBlock, ["NEXT_ACTION RETRY_TASK", "retry_eligible true", "next: execute-task"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} debug-task must branch retry-eligible RETRY_TASK to execute-task`);
    }
    if (!hasRuleWithTerms(debugBlock, ["NEXT_ACTION RETRY_TASK", "retry_eligible false", "next: update-progress"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} debug-task must route non-retryable RETRY_TASK to update-progress`);
    }
    if (!hasRuleWithTerms(debugBlock, ["NEXT_ACTION BLOCK_TASK", "next: update-progress"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} debug-task must branch BLOCK_TASK to update-progress`);
    }
    if (!hasRuleWithTerms(debugBlock, ["NEXT_ACTION STOP_FOR_HUMAN", "next: update-progress"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} debug-task must branch STOP_FOR_HUMAN to update-progress`);
    }
    const verifyBlock = blocks.get("verify-task-completion") ?? [];
    if (!hasRuleWithTerms(verifyBlock, ["STATUS VERIFIED", "safe_to_update_progress true", "next: update-progress"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} verify-task-completion must gate progress on VERIFIED and safe_to_update_progress true`);
    }
    const updateBlock = blocks.get("update-progress") ?? [];
    if (!hasRuleWithTerms(updateBlock, ["STATUS READY_FOR_REVIEW", "selected task checkbox updated", "task_set_status ALL_TASKS_COMPLETE", "next: validate-impl-final"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} update-progress must route successful final checkbox updates to validate-impl-final`);
    }
    if (!hasRuleWithTerms(updateBlock, ["STATUS READY_FOR_REVIEW", "selected task checkbox updated", "task_set_status REMAINING_TASKS_EXIST", "next: plan-one-task"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} update-progress must route non-final checkbox updates back to plan-one-task`);
    }
    if (hasRuleWithTerms(updateBlock, ["task_set_status REMAINING_TASKS_EXIST", "next: COMPLETE"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} update-progress must not complete while remaining tasks exist`);
    }
    if (!hasRuleWithTerms(updateBlock, ["STATUS BLOCKED", "selected task blocker note written", "next: ABORT"])) {
      failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, workflowPath)} update-progress must route written blocker notes to ABORT`);
    }
    if (!(blocks.get("update-progress") ?? []).join("\n").includes("allow_git_commit: true")) {
      failures.push(`COMMIT_GATE_DRIFT: ${rel(repoRoot, workflowPath)} update-progress must set allow_git_commit: true for per-task commits`);
    }
    if (!canonicalBlock(content, "loop_monitors").join("\n").includes("execute-task")) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} loop_monitors must cover execute-task`);
    }
    if (!canonicalBlock(content, "loop_monitors").join("\n").includes("debug-task")) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} loop_monitors must cover debug-task`);
    }
    if (
      !content.includes(
        "cycle:\n      - execute-task\n      - ai-quality-gate\n      - reviewers\n      - debug-task\n    threshold: 2",
      )
    ) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} review/debug loop monitor must include ai-quality-gate between execute-task and reviewers`);
    }
    if (!content.includes('reviewer child conditions are converging toward all("approved") and needs_fix findings are shrinking')) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} review/debug loop monitor must use parallel reviewer condition vocabulary`);
    }
    if (content.includes("review findings are converging toward VERDICT APPROVED")) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} review/debug loop monitor must not use stale single-review VERDICT APPROVED wording`);
    }
    const workflowCallBlocks = stepBlocks(content).filter((block) => block.join("\n").includes("kind: workflow_call"));
    for (const block of workflowCallBlocks) {
      if (stepScalar(block, "name") !== "ai-quality-gate" || stepScalar(block, "call") !== "./kiro-ai-quality-gate.yaml") {
        failures.push(`BOUNDARY_DRIFT: ${rel(repoRoot, workflowPath)} only ai-quality-gate may use workflow_call`);
      }
    }
    if (/\btakt\b[^\n]*(?:-w\s+|--workflow(?:\s+|=))kiro-/.test(content)) {
      failures.push(`BOUNDARY_DRIFT: ${rel(repoRoot, workflowPath)} must not shell out to nested Kiro workflows`);
    }
    for (const term of forbiddenBoundaryTerms) {
      if (content.includes(term)) {
        failures.push(`BOUNDARY_DRIFT: ${rel(repoRoot, workflowPath)} must not reference out-of-scope term: ${term}`);
      }
    }
    if (customLoopSourcePattern.test(content)) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} must not define custom retry or loop-health source of truth`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateGateWorkflowFiles(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const workflowPath = join(repoRoot, ".takt", lang, "workflows", "kiro-ai-quality-gate.yaml");
    if (!existsSync(workflowPath)) {
      failures.push(`GATE_WORKFLOW_MISSING: ${rel(repoRoot, workflowPath)} missing`);
      continue;
    }
    const content = readText(workflowPath);
    containsAll(
      content,
      [
        "name: kiro-ai-quality-gate",
        "callable: true",
        "visibility: internal",
        "returns:",
        "need_replan",
        "fix_instruction:",
        "type: facet_ref",
        "facet_kind: instruction",
        "domain_knowledge:",
        "type: facet_ref[]",
        "facet_kind: knowledge",
        "initial_step: ai-antipattern-review-1st",
        "loop-monitor-ai-antipattern-fix",
        "threshold: 3",
        "next: request-replan",
        "kiro-ai-antipattern-review.md",
        "kiro-ai-antipattern-fix.md",
        "kiro-ai-antipattern-fix-result",
        "ai-antipattern-review: ../facets/instructions/ai-review.md",
      ],
      workflowPath,
      failures,
      repoRoot,
      "GATE_WORKFLOW_DRIFT",
    );
    const stepNames = stepBlocks(content).map((block) => stepScalar(block, "name"));
    const expectedGateSteps = ["ai-antipattern-review-1st", "ai-antipattern-fix", "request-replan"];
    if (JSON.stringify(stepNames) !== JSON.stringify(expectedGateSteps)) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} step order must be ${expectedGateSteps.join(" -> ")}`);
    }
    if (
      !content.includes(
        "condition: Unproductive (loop_monitors.threshold reached for ai-antipattern-review-1st and ai-antipattern-fix)\n          next: request-replan",
      )
    ) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} loop exhaustion must route to request-replan`);
    }
    const blocks = new Map(stepBlocks(content).map((block) => [stepScalar(block, "name"), block]));
    const reviewBlock = blocks.get("ai-antipattern-review-1st") ?? [];
    containsAll(
      reviewBlock.join("\n"),
      ["persona: ai-antipattern-reviewer", "ai-antipattern", "$param: domain_knowledge", "instruction: ai-antipattern-review"],
      workflowPath,
      failures,
      repoRoot,
      "GATE_WORKFLOW_DRIFT",
    );
    if (!content.includes("ai-antipattern-review: ../facets/instructions/ai-review.md")) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} must wire ai-antipattern-review to the local ai-review instruction`);
    }
    if (reviewBlock.join("\n").includes("WebSearch") || reviewBlock.join("\n").includes("WebFetch")) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} AI antipattern review step must not use web tools`);
    }
    if (!hasRuleWithTerms(reviewBlock, ["No AI-specific issues", "next: COMPLETE"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} AI antipattern review must complete when no AI-specific issues are found`);
    }
    if (!hasRuleWithTerms(reviewBlock, ["AI-specific issues found", "next: ai-antipattern-fix"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} AI antipattern review must route AI-specific issues to fix`);
    }
    if (!hasRuleWithTerms(reviewBlock, ['when: "true"', "next: request-replan"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} AI antipattern review must route ambiguous outcomes to request-replan`);
    }
    const fixBlock = blocks.get("ai-antipattern-fix") ?? [];
    containsAll(
      fixBlock.join("\n"),
      ["persona: coder", "ai-antipattern", "$param: domain_knowledge", "$param: fix_instruction", "format: kiro-ai-antipattern-fix-result"],
      workflowPath,
      failures,
      repoRoot,
      "GATE_WORKFLOW_DRIFT",
    );
    if (fixBlock.join("\n").includes("WebSearch") || fixBlock.join("\n").includes("WebFetch")) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} AI antipattern fix step must not use web tools`);
    }
    if (!hasRuleWithTerms(fixBlock, ["STATUS FIXED", "next: ai-antipattern-review-1st"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} fix must re-review after FIXED`);
    }
    if (!hasRuleWithTerms(fixBlock, ["STATUS NO_FIX_NEEDED", "finding-level evidence", "next: COMPLETE"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} NO_FIX_NEEDED must require finding-level evidence`);
    }
    if (!hasRuleWithTerms(fixBlock, ["STATUS NEED_REPLAN", "return: need_replan"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} NEED_REPLAN must return need_replan`);
    }
    if (!hasRuleWithTerms(fixBlock, ["STATUS BLOCKED", "next: ABORT"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} BLOCKED must abort`);
    }
    const replanBlock = blocks.get("request-replan") ?? [];
    containsAll(
      replanBlock.join("\n"),
      ["persona: supervisor", "required_permission_mode: readonly", "need_replan"],
      workflowPath,
      failures,
      repoRoot,
      "GATE_WORKFLOW_DRIFT",
    );
    if (!hasRuleWithTerms(replanBlock, ["ambiguous AI antipattern review outcome", "unproductive AI antipattern fix loop", "return: need_replan"])) {
      failures.push(`GATE_WORKFLOW_DRIFT: ${rel(repoRoot, workflowPath)} request-replan must return need_replan for ambiguous review outcomes and loop exhaustion`);
    }
    if (customLoopSourcePattern.test(content)) {
      failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, workflowPath)} must rely on TAKT loop_monitors, not custom retry state`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateFacetFiles(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const specs = [
      ...instructionSpecs.map((spec) => ({ ...spec, kind: "instructions" })),
      ...gateInstructionSpecs.map((spec) => ({ ...spec, kind: "instructions" })),
      ...outputContractSpecs.map((spec) => ({ ...spec, kind: "output-contracts" })),
      ...gateOutputContractSpecs.map((spec) => ({ ...spec, kind: "output-contracts" })),
      ...policySpecs.map((spec) => ({ ...spec, kind: "policies" })),
    ];
    for (const spec of specs) {
      const path = join(repoRoot, ".takt", lang, "facets", spec.kind, `${spec.name}.md`);
      if (!existsSync(path)) {
        failures.push(`FACET_MISSING: ${rel(repoRoot, path)} missing`);
        continue;
      }
      const content = readText(path);
      containsAll(content, spec.terms, path, failures, repoRoot, "FACET_DRIFT");
      if (
        [
          "kiro-review-task",
          "kiro-review-architecture-task",
          "kiro-review-qa-task",
          "kiro-review-testing-task",
        ].includes(spec.name)
      ) {
        containsAll(
          content,
          [
            "kiro-ai-antipattern-review.md",
            "kiro-ai-antipattern-fix.md",
            "optional",
            "current AI quality gate subworkflow run",
            "stale",
            "cross-run",
            "NO_FIX_NEEDED",
            "NEED_REPLAN",
            "BLOCKED",
          ],
          path,
          failures,
          repoRoot,
          "AI_QUALITY_GATE_DRIFT",
        );
      }
      if (spec.name === "kiro-review-task") {
        for (const stalePhrase of ["Workflow rules branch on `VERDICT`", "workflow rulesは `VERDICT` で分岐"]) {
          if (content.includes(stalePhrase)) {
            failures.push(`FIELD_CONTRACT_DRIFT: ${rel(repoRoot, path)} must separate VERDICT output source from approved/needs_fix TAKT routing`);
          }
        }
      }
      if (spec.name === "kiro-verify-task-completion") {
        containsAll(
          content,
          [
            "kiro-ai-antipattern-review.md",
            "kiro-ai-antipattern-fix.md",
            "optional",
            "current AI quality gate subworkflow run",
            "stale",
            "cross-run",
            "STATUS NEED_REPLAN",
            "STATUS BLOCKED",
            "STATUS NO_FIX_NEEDED",
            "finding-level evidence",
            "safe_to_update_progress",
          ],
          path,
          failures,
          repoRoot,
          "AI_QUALITY_GATE_DRIFT",
        );
      }
      if (spec.name === "kiro-impl-update-progress") {
        for (const forbiddenReport of ["kiro-ai-antipattern-review.md", "kiro-ai-antipattern-fix.md"]) {
          if (content.includes(forbiddenReport)) {
            failures.push(`AI_QUALITY_GATE_DRIFT: ${rel(repoRoot, path)} update-progress must not read ${forbiddenReport} directly`);
          }
        }
      }
      const parent = extendsParent(content);
      if (spec.parent) {
        if (parent !== spec.parent) {
          failures.push(`BUILTIN_FACET_INHERITANCE_DRIFT: ${rel(repoRoot, path)} must use {extends: ${spec.parent}}`);
        }
        const parentPath = join(repoRoot, "node_modules", "takt", "builtins", lang, "facets", spec.kind, `${spec.parent}.md`);
        if (!existsSync(parentPath)) {
          failures.push(`BUILTIN_FACET_NOT_FOUND: ${rel(repoRoot, path)} extends missing built-in facet ${rel(repoRoot, parentPath)}`);
        }
      }
      if (customLoopSourcePattern.test(content)) {
        failures.push(`LOOP_MONITOR_DRIFT: ${rel(repoRoot, path)} must not define custom retry or loop-health source of truth`);
      }
      if (spec.kind === "instructions" && spec.skill) {
        const skillSource = extractKiroSkillSourceInstruction(content);
        if (skillSource.skill !== spec.skill) {
          failures.push(`KIRO_SKILL_INHERITANCE_DRIFT: ${rel(repoRoot, path)} must instruct agents to read skill ${spec.skill}`);
        }
        if (skillSource.section !== spec.section) {
          failures.push(`KIRO_SKILL_INHERITANCE_DRIFT: ${rel(repoRoot, path)} must apply skill section ${spec.section}`);
        }
        const skillPath = join(repoRoot, ".agents", "skills", spec.skill, "SKILL.md");
        if (!existsSync(skillPath)) {
          failures.push(`SKILL_SOURCE_MISSING: ${rel(repoRoot, path)} extends missing skill ${spec.skill}`);
        } else if (!readText(skillPath).includes(spec.section)) {
          failures.push(`SKILL_SECTION_NOT_FOUND: ${rel(repoRoot, path)} references missing section ${spec.section}`);
        }
        for (const copiedSection of ["<background_information>", "<instructions>", "Safety & Fallback", "Critical Constraints"]) {
          if (content.includes(copiedSection)) {
            failures.push(`KIRO_SKILL_COPY_DRIFT: ${rel(repoRoot, path)} must not copy Kiro skill section ${copiedSection}`);
          }
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateNoStandaloneAdapterWorkflows(repoRoot) {
  const failures = [];
  for (const lang of languages) {
    const workflowDir = join(repoRoot, ".takt", lang, "workflows");
    for (const name of forbiddenStandaloneWorkflows) {
      const path = join(workflowDir, `${name}.yaml`);
      if (existsSync(path)) {
        failures.push(`STANDALONE_ADAPTER_DRIFT: ${rel(repoRoot, path)} must be folded into kiro-impl.yaml adapter steps`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateLanguageParity(repoRoot) {
  const failures = [];
  const relativeFiles = [
    "workflows/kiro-impl.yaml",
    "workflows/kiro-ai-quality-gate.yaml",
    ...instructionSpecs.map((spec) => `facets/instructions/${spec.name}.md`),
    ...gateInstructionSpecs.map((spec) => `facets/instructions/${spec.name}.md`),
    ...outputContractSpecs.map((spec) => `facets/output-contracts/${spec.name}.md`),
    ...gateOutputContractSpecs.map((spec) => `facets/output-contracts/${spec.name}.md`),
    ...policySpecs.map((spec) => `facets/policies/${spec.name}.md`),
  ];
  for (const file of relativeFiles) {
    const enPath = join(repoRoot, ".takt", "en", file);
    const jaPath = join(repoRoot, ".takt", "ja", file);
    if (existsSync(enPath) !== existsSync(jaPath)) {
      failures.push(`LANGUAGE_PARITY_DRIFT: ${file} must exist in both en and ja`);
      continue;
    }
    if (!existsSync(enPath)) {
      continue;
    }
    if (file.endsWith(".yaml")) {
      const enSteps = stepBlocks(readText(enPath)).map((block) => stepScalar(block, "name"));
      const jaSteps = stepBlocks(readText(jaPath)).map((block) => stepScalar(block, "name"));
      if (JSON.stringify(enSteps) !== JSON.stringify(jaSteps)) {
        failures.push(`LANGUAGE_PARITY_DRIFT: ${file} step names must match`);
      }
      for (const key of ["initial_step", "max_steps"]) {
        if (topLevelScalar(readText(enPath), key) !== topLevelScalar(readText(jaPath), key)) {
          failures.push(`LANGUAGE_PARITY_DRIFT: ${file} ${key} must match`);
        }
      }
    }
    const enMachineTerms = workflowReportFormats
      .concat([
        "STATUS",
        "VERDICT",
        "NEXT_ACTION",
        "DECISION",
        "READY_FOR_REVIEW",
        "BLOCKED",
        "NEEDS_CONTEXT",
        "APPROVED",
        "REJECTED",
        "approved",
        "needs_fix",
        "reviewers",
        "RETRY_TASK",
        "STOP_FOR_HUMAN",
        "VERIFIED",
        "FIXED",
        "NO_FIX_NEEDED",
        "NEED_REPLAN",
        "need_replan",
        "kiro-ai-antipattern-review.md",
        "kiro-ai-antipattern-fix.md",
      ])
      .filter((term) => readText(enPath).includes(term));
    for (const term of enMachineTerms) {
      if (!readText(jaPath).includes(term)) {
        failures.push(`LANGUAGE_PARITY_DRIFT: ${file} missing machine term in ja: ${term}`);
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

function validatePackageScope(repoRoot) {
  const failures = [];
  const packageJsonPath = join(repoRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { ok: true, failures };
  }
  const pkg = JSON.parse(readText(packageJsonPath));
  for (const name of Object.keys(pkg.scripts ?? {})) {
    if (/^kiro:(review|debug|verify-completion)$/.test(name)) {
      failures.push(`PUBLIC_SURFACE_DRIFT: package.json must not add standalone public adapter script ${name}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function validateSpecTasks(repoRoot) {
  const failures = [];
  const tasksPath = join(repoRoot, ".kiro", "specs", "kiro-iterative-implementation-workflow", "tasks.md");
  if (!existsSync(tasksPath)) {
    return { ok: true, failures };
  }
  const content = readText(tasksPath);
  containsAll(
    content,
    [
      "kiro-implementation-result",
      "STATUS: READY_FOR_REVIEW | BLOCKED | NEEDS_CONTEXT",
      "adapter step",
      "validate:kiro-iterative-implementation-workflow",
      "test:kiro-iterative-implementation-workflow",
    ],
    tasksPath,
    failures,
    repoRoot,
    "SPEC_TASK_DRIFT",
  );
  return { ok: failures.length === 0, failures };
}

function validateTaskFixtureCoverage(repoRoot) {
  const failures = [];
  const testPath = join(repoRoot, "tests", "kiro-iterative-implementation-workflow.test.mjs");
  if (!existsSync(testPath)) {
    return { ok: false, failures: [`TASK_FIXTURE_COVERAGE_MISSING: ${rel(repoRoot, testPath)} missing`] };
  }
  const content = readText(testPath);
  containsAll(
    content,
    [
      "validator rejects completion-before-checkbox gate drift",
      "validator rejects readiness routing that skips ready-for-implementation",
      "validator rejects blocked execution routing to reviewers",
      "validator rejects direct review routing that bypasses AI quality gate",
      "validator rejects missing parallel reviewer group",
      "validator rejects reviewer group without all mandatory reviewers",
      "validator rejects reviewer group routing without all approved aggregation",
      "validator rejects reviewer group routing without needs-fix aggregation",
      "validator rejects wrong reviewer report filenames",
      "validator rejects mandatory security reviewer mixed into Kiro implementation reviewers",
      "validator rejects missing AI quality gate workflow",
      "validator rejects unapproved nested Kiro workflow call",
      "validator rejects parent loop monitor that skips AI quality gate",
      "validator rejects AI quality gate loop threshold drift",
      "validator rejects AI quality gate review routing gaps",
      "validator rejects AI quality gate review vocabulary drift",
      "validator rejects request-replan rules that only handle loop exhaustion",
      "validator rejects AI quality gate loop exhaustion that aborts instead of replanning",
      "validator rejects missing AI gate evidence hooks in review adapter",
      "validator rejects adapters that require AI antipattern fix reports unconditionally",
      "validator rejects verify adapters that ignore AI antipattern fix statuses",
      "validator rejects debug adapters that ignore reviewer child reports",
      "validator rejects completion verification that ignores reviewer evidence",
      "validator rejects progress adapter reading AI gate reports directly",
      "validator rejects plan blockers that bypass progress blocker notes",
      "validator rejects progress updates that omit routing status outputs",
      "validator rejects progress policy drift that loses selected task guard",
      "validator rejects execute-task with unconditional command quality gate",
      "validator rejects update-progress without allow_git_commit",
      "validator rejects review facet missing adversarial posture marker",
      "validator rejects execute-task facet missing implementation notes intake",
      "validator rejects debug facet missing implementation notes reference",
    ],
    testPath,
    failures,
    repoRoot,
    "TASK_FIXTURE_COVERAGE_DRIFT",
  );
  const smokePath = join(repoRoot, "tests", "kiro-ai-quality-gate-runtime-smoke.test.mjs");
  if (!existsSync(smokePath)) {
    failures.push(`TASK_FIXTURE_COVERAGE_MISSING: ${rel(repoRoot, smokePath)} missing`);
  } else {
    containsAll(
      readText(smokePath),
      [
        "kiro impl runtime wiring calls AI quality gate subworkflow and returns to parallel reviewers",
        "kiro-task-coding-review.md",
        "kiro-task-architecture-review.md",
        "kiro-task-qa-review.md",
        "kiro-task-testing-review.md",
      ],
      smokePath,
      failures,
      repoRoot,
      "TASK_FIXTURE_COVERAGE_DRIFT",
    );
  }
  return { ok: failures.length === 0, failures };
}

export function validateKiroIterativeImplementationWorkflow(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const sections = {
    workflowFiles: validateWorkflowFiles(repoRoot),
    gateWorkflowFiles: validateGateWorkflowFiles(repoRoot),
    facetFiles: validateFacetFiles(repoRoot),
    standaloneAdapterWorkflows: validateNoStandaloneAdapterWorkflows(repoRoot),
    languageParity: validateLanguageParity(repoRoot),
    packageScripts: validatePackageScripts(repoRoot),
    packageScope: validatePackageScope(repoRoot),
    specTasks: validateSpecTasks(repoRoot),
    taskFixtureCoverage: validateTaskFixtureCoverage(repoRoot),
  };
  const failures = Object.entries(sections).flatMap(([name, result]) =>
    result.failures.map((failure) => `${name}: ${failure}`),
  );
  return { ok: failures.length === 0, failures, sections };
}

if (process.argv[1] && __filename === resolve(process.argv[1])) {
  const result = validateKiroIterativeImplementationWorkflow();
  if (result.ok) {
    console.log("Kiro iterative implementation workflow validation passed");
  } else {
    console.error("Kiro iterative implementation workflow validation failed");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}
