{extends: architect}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-design` または `/kiro-spec-design` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-design` または `/kiro-spec-design` の `## Execution Steps` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Design Instruction

## Kiro 固有差分

approved Kiro requirements から `.kiro/specs/<feature>/design.md` と `.kiro/specs/<feature>/research.md` を生成する。成功状態は `design-generated` であり、`spec.json` は `approvals.requirements.approved` と `approvals.design.generated` を true にする。この phase は DesignGenerationWorkflow の責務に限定する。

## Inputs

- `requirements-generated` phase または互換性のある後続 phase の `.kiro/specs/<feature>/spec.json`。
- `.kiro/specs/<feature>/requirements.md`。
- merge mode 用の optional existing `design.md` と `research.md`。
- 関連する `.kiro/steering/*.md` の steering context と codebase patterns。
- discovery/research、design synthesis、design review gate の design rules。

## Design generation procedure

1. canonical feature directory を `.kiro/specs/<feature>/` として解決する。
2. design output を生成する前に requirements approval gate を実行する。requirements が approved でない場合、明示的な `-y` または `auto-approve` mode がない限り `validation.verdict: "BLOCKED"` を返す。
3. `-y` または `auto-approve` mode が有効な場合は、成功する design phase の finalize step で `approvals.requirements.approved: true` を明示的に更新する。暗黙の approval として扱わない。
4. design synthesis の前に `requirements.md`、`spec.json`、関連する steering context、existing `design.md`、optional `research.md`、code patterns から discovery/research を行う。
5. discovery findings、synthesis decisions、検討した alternatives、design に影響した risks を `research.md` に書く、または更新する。
6. discovery/research 後に design synthesis を適用する。build-vs-adopt、simplification、boundary decisions を `research.md` に記録し、実装判断の結論を `design.md` にも反映する。
7. `design.md` draft には required sections として以下を含める。
   - `境界コミットメント`
   - `ファイル構造計画`
   - `要件トレーサビリティ`
8. `境界コミットメント` には owned behavior、out-of-boundary behavior、allowed dependencies、revalidation triggers を書く。
9. `ファイル構造計画` には具体的な repository paths と各 path の責務を書く。未決定 placeholder、placeholder-only entries、曖昧な ownership を残さない。
10. `要件トレーサビリティ` では `requirements.md` のすべての numeric requirement IDs を具体的な components、files、interfaces、workflow decisions に対応づける。
11. generate/repair step では final design review gate を実行しない。draft を review 可能にして dedicated read-only review step へ進める。その review step が coverage、architecture readiness、boundary readiness、ファイル構造計画の具体性、要件トレーサビリティを確認する。
    - `design.md` / `research.md` をまだ書かない場合でも、step report には review step が自己完結して読める full draft を含める。
    - report には `draft_artifacts.design` と `draft_artifacts.research`、または `## design.md draft` / `## research.md draft` の明示 section で draft 本文を残す。
12. real requirements/design gap が残る場合は findings を添えて `validation.verdict: "BLOCKED"` または `validation.verdict: "NEEDS_FIX"` を返し、`design-generated` success state を書かない。
13. finalize step でのみ、design review gate 通過後に `.kiro/specs/<feature>/design.md` と `.kiro/specs/<feature>/research.md` を accepted design artifacts として扱う。
14. finalize step でのみ、同じ成功 result で `.kiro/specs/<feature>/spec.json` を更新する。
   - `phase`: `design-generated`。
   - `approvals.requirements.approved`: true。
   - `approvals.design.generated`: true。
   - `approvals.design.approved`: 明示的な auto-approve または human approval がない限り変更しない。
   - `ready_for_implementation`: false。

## Result mapping

- draft generation または repair step では read-only review step が読む draft design content と research content を step report に返す。`design.md` と `research.md` は書かず、`spec.json` も `design-generated` へ promotion してはならない。draft が review に進める場合は `phase: "design"`、`validation.verdict: "PASS"`、`draft_status: "READY_FOR_REVIEW"`、`review_gate: "PENDING"`、`featureName`、空の `updatedFiles` array、`draft_artifacts.design`、`draft_artifacts.research` を返す。
- repair step では、review finding が `missing_draft_artifact`、`ai_gate_scope_mismatch`、`review_target_scope_mismatch`、または unrelated git diff / current dirty worktree に対する指摘の場合、design draft の局所修復として扱ってはならない。`validation.verdict: "BLOCKED"` とし、誤った review target を報告して workflow を停止させる。
- design review gate 通過後の finalize step では、`phase: "design"`、`validation.verdict: "PASS"`、`draft_status: "WRITTEN"`、`review_gate: "PASSED"`、`featureName`、`updatedFiles` に `design.md`、`research.md`、`spec.json` を含めて返す。
- missing requirements、lifecycle inconsistency、requirements approval gate failure、design review gate failure、requirements/design gap がある場合は `BLOCKED` または `NEEDS_FIX` を返し、`spec.json` を `design-generated` success state にしない。
- evidence には requirements approval gate handling、`-y` または auto-approve handling、discovery/research sources、design synthesis、design review gate result、required sections、`spec.json` を `design-generated` に更新したかを記録する。
