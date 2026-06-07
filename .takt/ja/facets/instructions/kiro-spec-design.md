---
extends_skill: kiro-spec-design
extends_skill_section: "## Execution Steps"
---

{extends: architect}

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
3. `-y` または `auto-approve` mode が有効な場合は、成功する design phase の一部として `approvals.requirements.approved: true` を明示的に更新する。暗黙の approval として扱わない。
4. design synthesis の前に `requirements.md`、`spec.json`、関連する steering context、existing `design.md`、optional `research.md`、code patterns から discovery/research を行う。
5. discovery findings、synthesis decisions、検討した alternatives、design に影響した risks を `research.md` に書く、または更新する。
6. discovery/research 後に design synthesis を適用する。build-vs-adopt、simplification、boundary decisions を `research.md` に記録し、実装判断の結論を `design.md` にも反映する。
7. `design.md` draft には required sections として以下を含める。
   - `Boundary Commitments`
   - `File Structure Plan`
   - `Requirements Traceability`
8. `Boundary Commitments` には owned behavior、out-of-boundary behavior、allowed dependencies、revalidation triggers を書く。
9. `File Structure Plan` には具体的な repository paths と各 path の責務を書く。未決定 placeholder、placeholder-only entries、曖昧な ownership を残さない。
10. `Requirements Traceability` では `requirements.md` のすべての numeric requirement IDs を具体的な components、files、interfaces、workflow decisions に対応づける。
11. success metadata を書く前に design review gate を実行する。gate は coverage、architecture readiness、boundary readiness、File Structure Plan の具体性、Requirements Traceability を確認する。
12. real requirements/design gap が残る場合は findings を添えて `validation.verdict: "BLOCKED"` または `validation.verdict: "NEEDS_FIX"` を返し、`design-generated` success state を書かない。
13. design review gate が通過した場合だけ `.kiro/specs/<feature>/design.md` と `.kiro/specs/<feature>/research.md` を書く。
14. 同じ成功 result で `.kiro/specs/<feature>/spec.json` を更新する。
   - `phase`: `design-generated`。
   - `approvals.requirements.approved`: true。
   - `approvals.design.generated`: true。
   - `approvals.design.approved`: 明示的な auto-approve または human approval がない限り変更しない。
   - `ready_for_implementation`: false。

## Result mapping

- draft generation または repair step では `design.md`、`research.md` の書き込みや `spec.json` の promotion をしない。draft が read-only review step に進める場合は `draft_status: "READY_FOR_REVIEW"` と `review_gate: "PENDING"` を返す。
- 成功時は `phase: "design"`、`validation.verdict: "PASS"`、`featureName`、`updatedFiles` に `design.md`、`research.md`、`spec.json` を含める。
- design review gate 通過後の finalize step では、artifact update とともに `draft_status: "WRITTEN"` と `review_gate: "PASSED"` を返す。
- missing requirements、lifecycle inconsistency、requirements approval gate failure、design review gate failure、requirements/design gap がある場合は `BLOCKED` または `NEEDS_FIX` を返し、`spec.json` を `design-generated` success state にしない。
- evidence には requirements approval gate handling、`-y` または auto-approve handling、discovery/research sources、design synthesis、design review gate result、required sections、`spec.json` を `design-generated` に更新したかを記録する。
