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
          "kiro:impl": "node scripts/kiro-staged.mjs kiro-impl --pipeline --skip-git -t",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    ".takt/config.yaml",
    "provider: mock\nlanguage: ja\nmodel: claude-opus-4-8\nconcurrency: 1\nbase_branch: main\nsubmodules: all\n",
  );
  return root;
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
      content: "## Review Verdict\n\nVERDICT: APPROVED\nFINDINGS: none\nMECHANICAL_RESULTS: mock smoke evidence accepted\nSUMMARY: approved",
    },
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
        "## Status Report\n\nSTATUS: READY_FOR_REVIEW\nselected_task: 1.1 Create mock-only smoke evidence\ntask_set_status: REMAINING_TASKS_EXIST\nsummary: smoke progress update simulated",
    },
    { persona: "conductor", content: '{"step":2}', structured_output: { step: 2 } },
  ];
  const scenarioPath = join(root, ".takt", "runs", "kiro-ai-quality-gate-runtime-smoke-scenario.json");
  writeFixtureFile(root, ".takt/runs/kiro-ai-quality-gate-runtime-smoke-scenario.json", `${JSON.stringify(entries, null, 2)}\n`);
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

test("kiro impl runtime wiring calls AI quality gate subworkflow and returns to review", () => {
  const root = makeRuntimeFixture();
  try {
    writeSmokeSpec(root);
    const scenarioPath = writeMockScenario(root);

    const result = spawnSync("npm", ["run", "kiro:impl", "--", "feature=kiro-ai-quality-gate-smoke"], {
      cwd: root,
      env: {
        ...process.env,
        TAKT_MOCK_SCENARIO: scenarioPath,
      },
      encoding: "utf8",
    });
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 0, output);
    assert.match(output, /\[3\/30\] ai-quality-gate/);
    assert.match(output, /\[4\/30\] ai-antipattern-review-1st/);
    assert.match(output, /Status: COMPLETE/);
    assert.match(output, /\[5\/30\] review-task/);
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
    assert.match(readFileSync(join(reportsDir, "kiro-task-review-verdict.md"), "utf8"), /VERDICT: APPROVED/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
