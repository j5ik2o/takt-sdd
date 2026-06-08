export const kiroWorkflowCoverageCategories = Object.freeze([
  "existing_gate_coverage",
  "generation_scoped_gate_required",
  "orchestration_decision_required",
  "orchestration_delegated",
  "read_only_out_of_scope",
  "intentionally_not_applicable",
  "maintainer_decision_required",
]);

const coverageEntries = Object.freeze([
  {
    workflowName: "kiro-ai-quality-gate",
    category: "existing_gate_coverage",
    reason: "Callable implementation AI quality gate already owns AI antipattern review and fix behavior.",
  },
  {
    workflowName: "kiro-spec-ai-quality-gate",
    category: "existing_gate_coverage",
    reason: "Callable spec generation AI quality gate owns AI antipattern review and fix behavior for generated drafts.",
  },
  {
    workflowName: "kiro-impl",
    category: "existing_gate_coverage",
    reason: "Implementation workflow already calls the implementation AI quality gate before task review.",
    allowedGateCall: "./kiro-ai-quality-gate.yaml",
  },
  {
    workflowName: "kiro-spec-requirements",
    category: "generation_scoped_gate_required",
    reason: "Requirements drafts are generated or repaired before domain review and lifecycle promotion.",
    allowedGateCall: "./kiro-spec-ai-quality-gate.yaml",
  },
  {
    workflowName: "kiro-spec-design",
    category: "generation_scoped_gate_required",
    reason: "Design and research drafts are generated or repaired before readiness review and lifecycle promotion.",
    allowedGateCall: "./kiro-spec-ai-quality-gate.yaml",
  },
  {
    workflowName: "kiro-spec-tasks",
    category: "generation_scoped_gate_required",
    reason: "Task plan drafts are generated or repaired before task review and implementation readiness.",
    allowedGateCall: "./kiro-spec-ai-quality-gate.yaml",
  },
  {
    workflowName: "kiro-spec-quick",
    category: "generation_scoped_gate_required",
    reason: "Quick requirements, design, and tasks phases generate drafts inside one workflow before phase reviews.",
    allowedGateCall: "./kiro-spec-ai-quality-gate.yaml",
  },
  {
    workflowName: "kiro-spec-init",
    category: "intentionally_not_applicable",
    reason: "Init creates the spec shell from brief and template inputs without a stable generated draft review boundary.",
    adjacentOwner: "kiro-spec-requirements",
  },
  {
    workflowName: "kiro-discovery",
    category: "orchestration_delegated",
    reason: "Discovery writes planning inputs, while downstream spec generation workflows own artifact-level AI review.",
    adjacentOwner: "kiro-spec-init, kiro-spec-requirements",
  },
  {
    workflowName: "kiro-spec-batch",
    category: "orchestration_delegated",
    reason: "Batch dispatches worker generation workflows, and those worker workflows own artifact-level AI review.",
    adjacentOwner: "kiro-spec-requirements, kiro-spec-design, kiro-spec-tasks",
  },
  {
    workflowName: "kiro-spec-status",
    category: "read_only_out_of_scope",
    reason: "Status only reads spec state and reports readiness without artifact generation or repair.",
  },
  {
    workflowName: "kiro-validate-design",
    category: "read_only_out_of_scope",
    reason: "Design validation reviews existing artifacts and must not gain edit-capable AI fix behavior.",
  },
  {
    workflowName: "kiro-validate-gap",
    category: "read_only_out_of_scope",
    reason: "Gap validation reads requirements and design evidence without writing artifacts.",
  },
  {
    workflowName: "kiro-validate-impl",
    category: "read_only_out_of_scope",
    reason: "Implementation validation reads implementation evidence and reports readiness without repair steps.",
  },
]);

const allowedGateCallSites = Object.freeze([
  {
    workflowName: "kiro-impl",
    stepName: "ai-quality-gate",
    callPath: "./kiro-ai-quality-gate.yaml",
    gateKind: "implementation",
  },
  {
    workflowName: "kiro-spec-requirements",
    stepName: "ai-quality-gate-requirements",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
  {
    workflowName: "kiro-spec-design",
    stepName: "ai-quality-gate-design",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
  {
    workflowName: "kiro-spec-tasks",
    stepName: "ai-quality-gate-tasks",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
  {
    workflowName: "kiro-spec-quick",
    stepName: "quick-ai-quality-gate-requirements",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
  {
    workflowName: "kiro-spec-quick",
    stepName: "quick-ai-quality-gate-design",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
  {
    workflowName: "kiro-spec-quick",
    stepName: "quick-ai-quality-gate-tasks",
    callPath: "./kiro-spec-ai-quality-gate.yaml",
    gateKind: "spec_generation",
  },
]);

const gateContractTerms = Object.freeze({
  implementation: Object.freeze({
    reviewReports: Object.freeze(["kiro-ai-antipattern-review.md"]),
    optionalFixReports: Object.freeze(["kiro-ai-antipattern-fix.md"]),
  }),
  specGeneration: Object.freeze({
    reviewReports: Object.freeze(["kiro-spec-ai-antipattern-review.md"]),
    optionalFixReports: Object.freeze(["kiro-spec-ai-antipattern-fix.md"]),
  }),
  shared: Object.freeze({
    routingTerms: Object.freeze(["No AI-specific issues", "AI-specific issues found"]),
    catchAllTerms: Object.freeze(["ambiguous", "blocked", "internally inconsistent"]),
    loopOutcomeTerms: Object.freeze(["need_replan", "repair", "replan"]),
  }),
});

export function getKiroWorkflowCoverageEntries() {
  return coverageEntries.map((entry) => Object.freeze({ ...entry }));
}

export function getKiroWorkflowCoverageByName() {
  return new Map(coverageEntries.map((entry) => [entry.workflowName, Object.freeze({ ...entry })]));
}

export function getKiroWorkflowNamesByCoverageCategory(category) {
  if (!kiroWorkflowCoverageCategories.includes(category)) {
    throw new Error(`Unknown Kiro workflow coverage category: ${category}`);
  }
  return coverageEntries.filter((entry) => entry.category === category).map((entry) => entry.workflowName);
}

export function getAllowedKiroAiQualityGateCallSites() {
  return allowedGateCallSites.map((site) => Object.freeze({ ...site }));
}

export function getKiroAiQualityGateContractTerms() {
  return {
    implementation: {
      reviewReports: [...gateContractTerms.implementation.reviewReports],
      optionalFixReports: [...gateContractTerms.implementation.optionalFixReports],
    },
    specGeneration: {
      reviewReports: [...gateContractTerms.specGeneration.reviewReports],
      optionalFixReports: [...gateContractTerms.specGeneration.optionalFixReports],
    },
    shared: {
      routingTerms: [...gateContractTerms.shared.routingTerms],
      catchAllTerms: [...gateContractTerms.shared.catchAllTerms],
      loopOutcomeTerms: [...gateContractTerms.shared.loopOutcomeTerms],
    },
  };
}
