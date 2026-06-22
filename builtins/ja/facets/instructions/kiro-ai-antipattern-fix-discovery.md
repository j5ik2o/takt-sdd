---
id: kiro-ai-antipattern-fix-discovery
kind: instruction
name: Kiro AI Antipattern Fix Discovery
version: 1.0.0
Full custom skill reason: TAKT-side reusable AI antipattern gate instruction for Kiro discovery artifacts.
---

{extends: fix}

# Kiro AI Antipattern Fix Discovery

current Kiro discovery artifact boundary に対する AI antipattern finding を修正または裁定する。

## Inputs

- `kiro-discovery-ai-antipattern-review.md` を読み、その report のすべての finding を扱う。
- current `kiro-discovery` run が作成または更新した `.kiro/specs/<feature>/brief.md` と `.kiro/steering/roadmap.md` entries を authoritative boundary とする。
- caller workflow の actionPath を、discovery artifact が必要かどうかの正本として扱う。

## Scope

- 修正対象は current discovery artifacts のみ: newly discovered specs の `brief.md` と対応する `.kiro/steering/roadmap.md` decomposition entries。
- requirements.md、design.md、tasks.md、spec.json approval state、implementation files、upstream skills、existing spec-owned artifacts は編集しない。
- roadmap checkbox markers を implementation progress として更新しない。
- implementation work を開始しない。

## Fix Rules

- finding が妥当で current discovery artifact boundary 内で修正可能なら修正し、`STATUS: FIXED` を報告する。
- すべての finding が不適用または concrete evidence により既に解消済みなら、`STATUS: NO_FIX_NEEDED` を報告する。
- finding が requirements/design/tasks artifacts、existing spec ownership、implementation files、upstream Kiro skill behavior の変更を必要とする場合は、`STATUS: NEED_REPLAN` を報告する。
- 必要な context、files、permissions が利用できない場合は、`STATUS: BLOCKED` を報告する。
- すべての decision に finding-level evidence を残す。

## Output

`kiro-discovery-ai-antipattern-fix-result` contract に従って `kiro-discovery-ai-antipattern-fix.md` を書く。
