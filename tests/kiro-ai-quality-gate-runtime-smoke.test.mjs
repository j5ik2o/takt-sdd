import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function mockWorkflowEnv(scenarioPath) {
  const env = { ...process.env, TAKT_MOCK_SCENARIO: scenarioPath };
  delete env.FORCE_COLOR;
  delete env.CLICOLOR_FORCE;
  delete env.NO_COLOR;
  return env;
}

function workflowOutput(result) {
  return stripAnsi(`${result.stdout}\n${result.stderr}`);
}

function makeRuntimeFixture() {
  const root = mkdtempSync(join(tmpdir(), "kiro-ai-quality-gate-runtime-"));
  const repoRoot = join(import.meta.dirname, "..");
  cpSync(join(repoRoot, ".takt"), join(root, ".takt"), { recursive: true });
  rmSync(join(root, ".takt", "runs"), { recursive: true, force: true });
  symlinkSync(join(repoRoot, ".agents"), join(root, ".agents"), "dir");
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"), "dir");
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(join(repoRoot, "scripts", "kiro-staged.mjs"), join(root, "scripts", "kiro-staged.mjs"));
  cpSync(join(repoRoot, "scripts", "takt.sh"), join(root, "scripts", "takt.sh"));
  writeFixtureFile(
    root,
    "package.json",
    `${JSON.stringify(
      {
        scripts: {
          "kiro:discovery": "node scripts/kiro-staged.mjs kiro-discovery --pipeline --skip-git -t",
          "kiro:impl": "node scripts/kiro-staged.mjs kiro-impl --pipeline --skip-git -t",
          "kiro:spec:init": "node scripts/kiro-staged.mjs kiro-spec-init --pipeline --skip-git -t",
          "kiro:spec:requirements": "node scripts/kiro-staged.mjs kiro-spec-requirements --pipeline --skip-git -t",
          "kiro:spec:design": "node scripts/kiro-staged.mjs kiro-spec-design --pipeline --skip-git -t",
          "kiro:spec:tasks": "node scripts/kiro-staged.mjs kiro-spec-tasks --pipeline --skip-git -t",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    ".takt/config.yaml",
    "provider: mock\nlanguage: ja\nmodel: claude-opus-4-8\nconcurrency: 1\nbase_branch: main\nsubmodules: all\nworkflow_command_gates:\n  custom_scripts: true\n",
  );
  return root;
}

function writeDiscoverySmokeContext(root) {
  writeFixtureFile(root, ".kiro/steering/product.md", "# Product\n\nRuntime smoke fixture.\n");
  writeFixtureFile(root, ".kiro/steering/roadmap.md", "# Roadmap\n\n## Specs (dependency order)\n");
}

function writeDiscoveryMockScenario(root) {
  const entries = [
    {
      persona: "planner",
      content:
        "## Discovery Classification\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: []\nblockingReason: none\nsummary: classify as single spec",
    },
    {
      persona: "planner",
      content:
        "## Kiro Discovery Result\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: []\nnextAction: write discovery artifact\nblockingReason: none\nawarenessOnlyItems: []\nsummary: classify as single spec",
    },
    { persona: "conductor", content: '{"step":3}', structured_output: { step: 3 } },
    {
      persona: "planner",
      content:
        "## Discovery Plan\n\nactionPath: SINGLE_SPEC\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\nblockingReason: none\nsummary: plan brief artifact",
    },
    {
      persona: "planner",
      content:
        "## Kiro Discovery Result\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: []\nnextAction: write discovery artifact\nblockingReason: none\nawarenessOnlyItems: []\nsummary: plan brief artifact",
    },
    { persona: "conductor", content: '{"step":2}', structured_output: { step: 2 } },
    {
      persona: "planner",
      content:
        "## Discovery Write\n\nactionPath: SINGLE_SPEC\ncreatedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\nblockingReason: none\nsummary: discovery artifact written",
    },
    {
      persona: "planner",
      content:
        "## Kiro Discovery Result\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\nnextAction: run discovery AI quality gate\nblockingReason: none\nawarenessOnlyItems: []\nsummary: discovery artifact written",
    },
    { persona: "conductor", content: '{"step":2}', structured_output: { step: 2 } },
    { persona: "ai-antipattern-reviewer", content: "Discovery AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content:
        "# Discovery AI Antipattern Review\n\n## Result: APPROVE\n\nNo AI-specific issues.\n\nNo fix report is required for this successful smoke path.",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    {
      persona: "supervisor",
      content:
        "## Discovery Final Report\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\nnextAction: run kiro-spec-init\nblockingReason: none\nawarenessOnlyItems: []\ndiscovery AI quality gate passed\nsummary: report discovery after gate",
    },
    {
      persona: "supervisor",
      content:
        "## Kiro Discovery Result\n\nactionPath: SINGLE_SPEC\nreason: deterministic discovery runtime smoke\nplannedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\ncreatedFiles: [.kiro/specs/kiro-discovery-ai-quality-gate-smoke/brief.md]\nnextAction: run kiro-spec-init\nblockingReason: none\nawarenessOnlyItems: []\ndiscovery AI quality gate passed\nsummary: report discovery after gate",
    },
    { persona: "conductor", content: '{"step":3}', structured_output: { step: 3 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-discovery-ai-quality-gate-runtime-smoke-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-discovery-ai-quality-gate-runtime-smoke-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function writeRequirementsSmokeSpec(root) {
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-spec-ai-quality-gate-smoke/spec.json",
    `${JSON.stringify(
      {
        feature_name: "kiro-spec-ai-quality-gate-smoke",
        created_at: "2026-06-08T00:00:00Z",
        updated_at: "2026-06-08T00:00:00Z",
        language: "ja",
        phase: "initialized",
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-spec-ai-quality-gate-smoke/brief.md",
    `# Brief

Generate a minimal requirements draft for deterministic runtime smoke.
`,
  );
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-spec-ai-quality-gate-smoke/requirements.md",
    `# Requirements Document

## Requirements

### Requirement 1:

**User Story:** As a smoke tester, I want a generated requirements draft, so that spec gate wiring can be observed.

#### Acceptance Criteria

1. When the spec requirements workflow runs, it shall pass through the spec AI quality gate before requirements review.
`,
  );
}

function writeSmokeSpec(root) {
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-ai-quality-gate-smoke/spec.json",
    `${JSON.stringify(
      {
        feature_name: "kiro-ai-quality-gate-smoke",
        created_at: "2026-06-08T00:00:00Z",
        updated_at: "2026-06-08T00:00:00Z",
        language: "ja",
        phase: "tasks-generated",
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
        ready_for_implementation: true,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-ai-quality-gate-smoke/requirements.md",
    `# Requirements Document

## Requirements

### Requirement 1:

**User Story:** As a smoke tester, I want one tiny Kiro implementation task, so that runtime wiring can be exercised.

#### Acceptance Criteria

1. When the smoke workflow runs, it shall have exactly one eligible unchecked task.
`,
  );
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-ai-quality-gate-smoke/design.md",
    `# Design Document

## Overview

Temporary runtime smoke fixture for exercising kiro-impl wiring with the mock provider.

## Boundary Commitments

### This Spec Owns

- A single fixture task.

### Out of Boundary

- Production behavior.

### Allowed Dependencies

- Existing kiro-impl workflow.

### Revalidation Triggers

- kiro-impl routing changes.

## File Structure Plan

No production files are owned by this fixture.
`,
  );
  writeFixtureFile(
    root,
    ".kiro/specs/kiro-ai-quality-gate-smoke/tasks.md",
    `# Implementation Plan

- [ ] 1. Run smoke task through Kiro implementation workflow
- [ ] 1.1 Create mock-only smoke evidence
  - Use mock provider output only.
  - Do not change production files.
  - _Requirements: 1.1_
  - _Boundary:_ smoke fixture
  - _Depends:_ none
`,
  );
}

function writeMockScenario(root) {
  const entries = [
    { persona: "planner", content: "Plan smoke task. STATUS: READY_FOR_REVIEW." },
    {
      persona: "planner",
      content:
        "## Status Report\n\nSTATUS: READY_FOR_REVIEW\nready_for_implementation: true\nselected_task: 1.1 Create mock-only smoke evidence\nblocker_note_required: false\nimplementation_plan: mock provider only\nsummary: smoke plan ready",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "coder", content: "Mock implementation completed. STATUS: READY_FOR_REVIEW." },
    {
      persona: "coder",
      content:
        "## Status Report\n\nSTATUS: READY_FOR_REVIEW\nselected_task: 1.1 Create mock-only smoke evidence\nchanged_files: none\nvalidation_evidence: mock provider smoke\nRED_PHASE_OUTPUT: N/A\nsummary: smoke implementation ready for AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "ai-antipattern-reviewer", content: "AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content:
        "# AI生成コードレビュー\n\n## 結果: APPROVE\n\n## サマリー\nmock smoke has no AI-specific findings.\n\n## 今回の指摘（new）\nnone\n\n## 継続指摘（persists）\nnone\n\n## 解消済み（resolved）\nnone",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "coding-reviewer", content: "Kiro task review smoke approved. VERDICT: APPROVED." },
    {
      persona: "coding-reviewer",
      content: "## Review Verdict\n\nVERDICT: APPROVED\nFINDINGS: none\nMECHANICAL_RESULTS: mock smoke evidence accepted\nSUMMARY: approved\ncondition: approved",
    },
    { persona: "architecture-reviewer", content: "Kiro architecture review smoke approved. VERDICT: APPROVED." },
    {
      persona: "architecture-reviewer",
      content:
        "# アーキテクチャレビュー\n\n## 結果: APPROVE\n\n## サマリー\nmock smoke architecture evidence accepted.\n\nVERDICT: APPROVED\ncondition: approved",
    },
    { persona: "qa-reviewer", content: "Kiro QA review smoke approved. VERDICT: APPROVED." },
    {
      persona: "qa-reviewer",
      content: "# QAレビュー\n\n## 結果: APPROVE\n\n## サマリー\nmock smoke QA evidence accepted.\n\nVERDICT: APPROVED\ncondition: approved",
    },
    { persona: "testing-reviewer", content: "Kiro testing review smoke approved. VERDICT: APPROVED." },
    {
      persona: "testing-reviewer",
      content: "# テストレビュー\n\n## 結果: APPROVE\n\n## サマリー\nmock smoke testing evidence accepted.\n\nVERDICT: APPROVED\ncondition: approved",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "supervisor", content: "Completion verification smoke passed. STATUS: VERIFIED." },
    {
      persona: "supervisor",
      content:
        "## Verification\n\nSTATUS: VERIFIED\nCLAIM_TYPE: TASK\nCLAIM: smoke task completed\nEVIDENCE: mock smoke route reached verify step\nGAPS: none\nsafe_to_update_progress: true",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "coder", content: "Progress update smoke completed. STATUS: READY_FOR_REVIEW." },
    {
      persona: "coder",
      content:
        "## Status Report\n\nSTATUS: READY_FOR_REVIEW\nselected_task: 1.1 Create mock-only smoke evidence\ntask_set_status: ALL_TASKS_COMPLETE\nsummary: smoke progress update simulated",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "supervisor", content: "Final implementation validation smoke passed. DECISION: GO." },
    {
      persona: "supervisor",
      content:
        "## Final Implementation Validation\n\nDECISION: GO\nverdict: PASS\nscope: mock smoke feature\nchecked_items: mock scenario\nfindings: []\nevidence: mock smoke route reached final validation\nsummary: final validation passed",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-ai-quality-gate-runtime-smoke-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-ai-quality-gate-runtime-smoke-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function writeSpecGenerationMockScenario(root) {
  const entries = [
    {
      persona: "supervisor",
      content:
        "## Requirements Generation\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nfeatureName: kiro-spec-ai-quality-gate-smoke\nupdatedFiles: []\nsummary: draft ready for spec AI gate",
    },
    {
      persona: "supervisor",
      content:
        "## Requirements Generation Report\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nfeatureName: kiro-spec-ai-quality-gate-smoke\nupdatedFiles: []\nsummary: draft ready for spec AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "ai-antipattern-reviewer", content: "Spec AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content:
        "# Spec AI Antipattern Review\n\n## Result: APPROVE\n\nNo AI-specific issues.\n\nNo fix report is required for this successful smoke path.",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    {
      persona: "reviewer",
      content:
        "## Requirements Review\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nrequirements review gate passed\nsummary: requirements review passed after spec AI gate",
    },
    {
      persona: "reviewer",
      content:
        "## Requirements Review Report\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nrequirements review gate passed\nsummary: requirements review passed after spec AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    {
      persona: "supervisor",
      content:
        "## Requirements Finalize\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: WRITTEN\nreview_gate: PASSED\nrequirements.md written\nrequirements-generated\napprovals.requirements.generated true\nfeatureName: kiro-spec-ai-quality-gate-smoke\nupdatedFiles: [\"requirements.md\", \"spec.json\"]\nsummary: requirements finalized",
    },
    {
      persona: "supervisor",
      content:
        "## Requirements Finalize Report\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: WRITTEN\nreview_gate: PASSED\nrequirements.md written\nrequirements-generated\napprovals.requirements.generated true\nfeatureName: kiro-spec-ai-quality-gate-smoke\nupdatedFiles: [\"requirements.md\", \"spec.json\"]\nsummary: requirements finalized",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-spec-ai-quality-gate-runtime-smoke-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-spec-ai-quality-gate-runtime-smoke-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

const fullChainFeature = "kiro-full-chain-smoke";

function writeFullChainBrief(root) {
  writeFixtureFile(root, ".kiro/steering/product.md", "# Product\n\nKiro full chain smoke fixture.\n");
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/brief.md`,
    `# Brief

Create one deterministic smoke artifact through the Kiro lifecycle.
`,
  );
}

function writeFullChainRequirements(root, { approved = false } = {}) {
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/spec.json`,
    `${JSON.stringify(
      {
        feature_name: fullChainFeature,
        created_at: "2026-06-09T00:00:00Z",
        updated_at: "2026-06-09T00:00:00Z",
        language: "ja",
        phase: "requirements-generated",
        approvals: {
          requirements: { generated: true, approved },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/requirements.md`,
    `# Requirements Document

## Requirements

### Requirement 1:

**User Story:** As a runtime smoke tester, I want a tiny deterministic task, so that Kiro workflow wiring can be checked without a real provider.

#### Acceptance Criteria

1. When the implementation workflow runs, it shall select exactly one unchecked executable task.
`,
  );
}

function writeFullChainInitializedSpec(root) {
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/spec.json`,
    `${JSON.stringify(
      {
        feature_name: fullChainFeature,
        created_at: "2026-06-09T00:00:00Z",
        updated_at: "2026-06-09T00:00:00Z",
        language: "ja",
        phase: "initialized",
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/requirements.md`,
    `# Requirements Document

## Introduction

Draft initialized by mock smoke.
`,
  );
}

function writeFullChainDesign(root, { approved = false } = {}) {
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/spec.json`,
    `${JSON.stringify(
      {
        feature_name: fullChainFeature,
        created_at: "2026-06-09T00:00:00Z",
        updated_at: "2026-06-09T00:00:00Z",
        language: "ja",
        phase: "design-generated",
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/design.md`,
    `# Design Document

## Overview

Mock-provider lifecycle smoke for Kiro workflow wiring.

## Boundary Commitments

### This Spec Owns

- One smoke fixture task.

### Out of Boundary

- Production behavior changes.

### Allowed Dependencies

- Existing Kiro workflow contracts.

### Revalidation Triggers

- Kiro workflow routing changes.

## File Structure Plan

No production files are owned by this fixture.

## Requirements Traceability

| Requirement | Design Element |
|-------------|----------------|
| 1.1 | Smoke fixture task |
`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/research.md`,
    "# Research\n\nNo external research required for mock smoke.\n",
  );
}

function writeFullChainTasks(root) {
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/spec.json`,
    `${JSON.stringify(
      {
        feature_name: fullChainFeature,
        created_at: "2026-06-09T00:00:00Z",
        updated_at: "2026-06-09T00:00:00Z",
        language: "ja",
        phase: "tasks-generated",
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: true },
        },
        ready_for_implementation: true,
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    `.kiro/specs/${fullChainFeature}/tasks.md`,
    `# Implementation Plan

- [ ] 1. Run mock provider full-chain implementation smoke
- [ ] 1.1 Create mock-only smoke evidence
  - Use mock provider output only.
  - Do not change production files.
  - _Requirements: 1.1_
  - _Boundary:_ smoke fixture
  - _Depends:_ none
`,
  );
}

function writeInitMockScenario(root) {
  const entries = [
    { persona: "supervisor", content: "Initialize full chain smoke spec. validation.verdict PASS." },
    {
      persona: "supervisor",
      content:
        `## Init Result\n\nphase: init\nvalidation.verdict: PASS\nfeatureName: ${fullChainFeature}\nspec.json written\nrequirements.md written\ninitialized\nsummary: initialized mock full chain spec`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-full-chain-init-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-full-chain-init-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function writeRequirementsFullChainScenario(root) {
  const entries = [
    { persona: "supervisor", content: "Generate requirements draft. validation.verdict PASS." },
    {
      persona: "supervisor",
      content:
        `## Requirements Generation Report\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nfeatureName: ${fullChainFeature}\nupdatedFiles: []\nsummary: requirements draft ready for spec AI gate`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "ai-antipattern-reviewer", content: "Spec AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content: "# Spec AI Antipattern Review\n\n## Result: APPROVE\n\nNo AI-specific issues.",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "reviewer", content: "Requirements review passed. validation.verdict PASS." },
    {
      persona: "reviewer",
      content:
        "## Requirements Review Report\n\nphase: requirements\nvalidation.verdict: PASS\nrequirements review gate passed\nsummary: requirements review passed after spec AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "supervisor", content: "Finalize requirements. validation.verdict PASS." },
    {
      persona: "supervisor",
      content:
        `## Requirements Finalize Report\n\nphase: requirements\nvalidation.verdict: PASS\ndraft_status: WRITTEN\nreview_gate: PASSED\nrequirements.md written\nrequirements-generated\napprovals.requirements.generated true\nfeatureName: ${fullChainFeature}\nupdatedFiles: ["requirements.md", "spec.json"]\nsummary: requirements finalized`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-full-chain-requirements-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-full-chain-requirements-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function writeDesignFullChainScenario(root) {
  const entries = [
    { persona: "planner", content: "Generate design draft. validation.verdict PASS." },
    {
      persona: "planner",
      content:
        `## Design Generation Report\n\nphase: design\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nfeatureName: ${fullChainFeature}\ndraft_artifacts.design: available\ndraft_artifacts.research: available\nsummary: design draft ready for spec AI gate`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "ai-antipattern-reviewer", content: "Design AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content: "# Spec AI Antipattern Review\n\n## Result: APPROVE\n\nNo AI-specific issues.",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "architecture-reviewer", content: "Design review passed. DECISION: GO." },
    {
      persona: "architecture-reviewer",
      content:
        "## Design Review\n\nDECISION: GO\ndesign review gate passed\nchecked_items: mock design draft\nfindings: []\nsummary: design review passed after spec AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "planner", content: "Finalize design. validation.verdict PASS." },
    {
      persona: "planner",
      content:
        `## Design Finalize Report\n\nphase: design\nvalidation.verdict: PASS\ndesign.md written\nresearch.md written\ndesign-generated\napprovals.requirements.approved true\napprovals.design.generated true\nfeatureName: ${fullChainFeature}\nupdatedFiles: ["design.md", "research.md", "spec.json"]\nsummary: design finalized`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-full-chain-design-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-full-chain-design-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function writeTasksFullChainScenario(root) {
  const entries = [
    { persona: "planner", content: "Generate tasks draft. validation.verdict PASS." },
    {
      persona: "planner",
      content:
        `## Tasks Generation Report\n\nphase: tasks\nvalidation.verdict: PASS\ndraft_status: READY_FOR_REVIEW\nreview_gate: PENDING\nfeatureName: ${fullChainFeature}\ndraft_artifacts.tasks: available\nsummary: task draft ready for spec AI gate`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "ai-antipattern-reviewer", content: "Tasks AI antipattern smoke review complete. No AI-specific issues." },
    {
      persona: "ai-antipattern-reviewer",
      content: "# Spec AI Antipattern Review\n\n## Result: APPROVE\n\nNo AI-specific issues.",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "reviewer", content: "Task plan review passed." },
    {
      persona: "reviewer",
      content:
        "## Task Plan Review\n\ntask_plan_review: PASS\ntask_graph_sanity_review: PASS\nsummary: task plan review passed after spec AI gate",
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
    { persona: "planner", content: "Finalize tasks. validation.verdict PASS." },
    {
      persona: "planner",
      content:
        `## Tasks Finalize Report\n\nphase: tasks\nvalidation.verdict: PASS\nauto-approve\ndraft_status: WRITTEN\nreview_gate: PASSED\ntasks.md written\ntasks-generated\napprovals.requirements.approved true\napprovals.design.approved true\napprovals.tasks.generated true\napprovals.tasks.approved true\nready_for_implementation true\nfeatureName: ${fullChainFeature}\nupdatedFiles: ["tasks.md", "spec.json"]\nsummary: tasks finalized`,
    },
    { persona: "conductor", content: '{"step":1}', structured_output: { step: 1 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-full-chain-tasks-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-full-chain-tasks-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
  return scenarioPath;
}

function findFile(root, fileName) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isFile() && entry.name === fileName) {
      return entryPath;
    }
    if (entry.isDirectory()) {
      const found = findFile(entryPath, fileName);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function runMockWorkflow(root, scriptName, args, scenarioPath) {
  const result = spawnSync("npm", ["run", scriptName, "--", ...args], {
    cwd: root,
    env: mockWorkflowEnv(scenarioPath),
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: workflowOutput(result),
  };
}

test("kiro full lifecycle smoke runs init, requirements, design, tasks, and impl with mock provider", () => {
  const root = makeRuntimeFixture();
  try {
    writeFullChainBrief(root);

    const init = runMockWorkflow(root, "kiro:spec:init", [fullChainFeature], writeInitMockScenario(root));
    assert.equal(init.status, 0, init.output);
    assert.match(init.output, /\[1\/5\] initialize-spec/);
    assert.match(init.output, /Result: Success/);
    writeFullChainInitializedSpec(root);

    const requirements = runMockWorkflow(
      root,
      "kiro:spec:requirements",
      [`feature=${fullChainFeature}`],
      writeRequirementsFullChainScenario(root),
    );
    assert.equal(requirements.status, 0, requirements.output);
    assert.match(requirements.output, /\[2\/14\] ai-quality-gate-requirements/);
    assert.match(requirements.output, /\[4\/14\] review-requirements/);
    assert.match(requirements.output, /\[5\/14\] finalize-requirements/);
    assert.match(requirements.output, /Result: Success/);
    writeFullChainRequirements(root, { approved: true });

    const design = runMockWorkflow(
      root,
      "kiro:spec:design",
      [`feature=${fullChainFeature}`],
      writeDesignFullChainScenario(root),
    );
    assert.equal(design.status, 0, design.output);
    assert.match(design.output, /\[2\/14\] ai-quality-gate-design/);
    assert.match(design.output, /\[4\/14\] review-design/);
    assert.match(design.output, /\[5\/14\] finalize-design/);
    assert.match(design.output, /Result: Success/);
    writeFullChainDesign(root, { approved: true });

    const tasks = runMockWorkflow(
      root,
      "kiro:spec:tasks",
      [`feature=${fullChainFeature}`],
      writeTasksFullChainScenario(root),
    );
    assert.equal(tasks.status, 0, tasks.output);
    assert.match(tasks.output, /\[2\/14\] ai-quality-gate-tasks/);
    assert.match(tasks.output, /\[4\/14\] review-tasks/);
    assert.match(tasks.output, /\[5\/14\] finalize-tasks/);
    assert.match(tasks.output, /Result: Success/);
    writeFullChainTasks(root);

    const implementation = runMockWorkflow(
      root,
      "kiro:impl",
      [`feature=${fullChainFeature}`],
      writeMockScenario(root),
    );
    assert.equal(implementation.status, 0, implementation.output);
    assert.match(implementation.output, /\[3\/200\] ai-quality-gate/);
    assert.match(implementation.output, /\[5\/200\] reviewers/);
    assert.match(implementation.output, /\[8\/200\] validate-impl-final/);
    assert.match(implementation.output, /Result: Success/);

    const reportRoot = join(root, ".takt", "runs");
    const runDirs = readdirSync(reportRoot)
      .filter((entry) => statSync(join(reportRoot, entry)).isDirectory())
      .sort();
    assert.ok(runDirs.length >= 5, `expected at least 5 workflow runs, got ${runDirs.length}`);
    const finalReportsDir = join(reportRoot, runDirs.at(-1), "reports");
    assert.match(readFileSync(join(finalReportsDir, "kiro-final-implementation-validation.md"), "utf8"), /DECISION: GO/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kiro impl runtime wiring calls AI quality gate subworkflow and returns to parallel reviewers", () => {
  const root = makeRuntimeFixture();
  try {
    writeSmokeSpec(root);
    const scenarioPath = writeMockScenario(root);

    const result = spawnSync("npm", ["run", "kiro:impl", "--", "feature=kiro-ai-quality-gate-smoke"], {
      cwd: root,
      env: mockWorkflowEnv(scenarioPath),
      encoding: "utf8",
    });
    const output = workflowOutput(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /\[3\/200\] ai-quality-gate/);
    assert.match(output, /\[4\/200\] ai-antipattern-review-1st/);
    assert.match(output, /Status: COMPLETE/);
    assert.match(output, /\[5\/200\] reviewers/);
    assert.match(output, /\[8\/200\] validate-impl-final/);
    assert.match(output, /Result: Success/);

    const reportRoot = join(root, ".takt", "runs");
    const latestRun = readdirSync(reportRoot)
      .filter((entry) => statSync(join(reportRoot, entry)).isDirectory())
      .sort()
      .at(-1);
    assert.ok(latestRun, output);
    const reportsDir = join(reportRoot, latestRun, "reports");
    const aiAntipatternReportPath = findFile(reportsDir, "kiro-ai-antipattern-review.md");
    assert.ok(aiAntipatternReportPath, "expected the AI antipattern review report to be emitted");
    assert.match(readFileSync(aiAntipatternReportPath, "utf8"), /APPROVE/);
    assert.match(readFileSync(join(reportsDir, "kiro-task-coding-review.md"), "utf8"), /VERDICT: APPROVED/);
    assert.match(readFileSync(join(reportsDir, "kiro-task-architecture-review.md"), "utf8"), /VERDICT: APPROVED/);
    assert.match(readFileSync(join(reportsDir, "kiro-task-qa-review.md"), "utf8"), /VERDICT: APPROVED/);
    assert.match(readFileSync(join(reportsDir, "kiro-task-testing-review.md"), "utf8"), /VERDICT: APPROVED/);
    assert.match(readFileSync(join(reportsDir, "kiro-final-implementation-validation.md"), "utf8"), /DECISION: GO/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kiro spec generation runtime wiring calls spec AI gate before requirements review", () => {
  const root = makeRuntimeFixture();
  try {
    writeRequirementsSmokeSpec(root);
    const scenarioPath = writeSpecGenerationMockScenario(root);

    const result = spawnSync(
      "npm",
      ["run", "kiro:spec:requirements", "--", "feature=kiro-spec-ai-quality-gate-smoke"],
      {
        cwd: root,
        env: mockWorkflowEnv(scenarioPath),
        encoding: "utf8",
      },
    );
    const output = workflowOutput(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /\[2\/14\] ai-quality-gate-requirements/);
    assert.match(output, /\[3\/14\] ai-antipattern-review-1st/);
    assert.match(output, /Status: COMPLETE/);
    assert.match(output, /\[4\/14\] review-requirements/);
    assert.match(output, /\[5\/14\] finalize-requirements/);
    assert.match(output, /Result: Success/);

    const reportRoot = join(root, ".takt", "runs");
    const latestRun = readdirSync(reportRoot)
      .filter((entry) => statSync(join(reportRoot, entry)).isDirectory())
      .sort()
      .at(-1);
    assert.ok(latestRun, output);
    const reportsDir = join(reportRoot, latestRun, "reports");
    const specAiReportPath = findFile(reportsDir, "kiro-spec-ai-antipattern-review.md");
    assert.ok(specAiReportPath, "expected the spec AI antipattern review report to be emitted");
    assert.match(readFileSync(specAiReportPath, "utf8"), /No AI-specific issues/);
    assert.equal(findFile(reportsDir, "kiro-spec-ai-antipattern-fix.md"), undefined);
    assert.match(readFileSync(join(reportsDir, "kiro-spec-requirements-review.md"), "utf8"), /requirements review gate passed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("kiro discovery runtime wiring calls discovery AI gate before report", () => {
  const root = makeRuntimeFixture();
  try {
    writeDiscoverySmokeContext(root);
    const scenarioPath = writeDiscoveryMockScenario(root);

    const result = spawnSync(
      "npm",
      ["run", "kiro:discovery", "--", "Create a smoke feature brief for kiro-discovery-ai-quality-gate-smoke"],
      {
        cwd: root,
        env: mockWorkflowEnv(scenarioPath),
        encoding: "utf8",
      },
    );
    const output = workflowOutput(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /\[3\/12\] write-discovery-artifacts/);
    assert.match(output, /\[4\/12\] ai-quality-gate-discovery/);
    assert.match(output, /\[5\/12\] ai-antipattern-review-1st/);
    assert.match(output, /Status: COMPLETE/);
    assert.match(output, /\[6\/12\] report-discovery/);
    assert.match(output, /Result: Success/);

    const reportRoot = join(root, ".takt", "runs");
    const latestRun = readdirSync(reportRoot)
      .filter((entry) => statSync(join(reportRoot, entry)).isDirectory())
      .sort()
      .at(-1);
    assert.ok(latestRun, output);
    const reportsDir = join(reportRoot, latestRun, "reports");
    const discoveryAiReportPath = findFile(reportsDir, "kiro-discovery-ai-antipattern-review.md");
    assert.ok(discoveryAiReportPath, "expected the discovery AI antipattern review report to be emitted");
    assert.match(readFileSync(discoveryAiReportPath, "utf8"), /No AI-specific issues/);
    assert.equal(findFile(reportsDir, "kiro-discovery-ai-antipattern-fix.md"), undefined);
    assert.match(readFileSync(join(reportsDir, "kiro-discovery-result.md"), "utf8"), /discovery AI quality gate passed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
