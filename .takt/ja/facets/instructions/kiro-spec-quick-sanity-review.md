{extends: review-qa}

## Kiro Skill Source

この instruction を実行する前に、`$kiro-spec-quick` または `/kiro-spec-quick` を呼び出し、解決された `SKILL.md` を読む。
`$kiro-spec-quick` または `/kiro-spec-quick` の `#### Final Sanity Review` section をこの step の source of truth として適用する。
この facet は TAKT workflow への adapter delta だけを定義する。

# Kiro Spec Quick Sanity Review Instruction

## Kiro 固有差分

完了済みの quick path だけを review する。この instruction は `quick-init`、`quick-requirements`、`quick-design`、`quick-tasks` が phase result を出した後の final `quick-sanity-review` step でだけ使う。過去 phase を再実行せず、artifact を書かず、別 workflow runner へ委譲しない。

## Inputs

- 完了済みの `quick-init`、`quick-requirements`、`quick-design`、`quick-tasks` phase result。
- `.kiro/specs/<feature>/spec.json`、`requirements.md`、`design.md`、`research.md`、`tasks.md`。
- selected `automatic mode` または `interactive mode`。
- interactive mode で使われた `phase approval` decision の記録。
- design/tasks で使われた明示的な `auto-approve` mode と standalone phase と同じ same auto-approve semantics。

## Final sanity review procedure

1. quick path が `quick-init`、`quick-requirements`、`quick-design`、`quick-tasks`、`quick-sanity-review` の順で進んだことを確認する。
2. 各 completed phase が standalone workflow / standalone phase contract と同じ workflow instruction、policy、output contract basename、lifecycle semantics、same auto-approve semantics を使ったことを確認する。
3. requirements、design、tasks の coherence を確認する。
   - requirements generation 後の requirements が EARS と numeric requirement IDs を保持している。
   - design が required boundary、file structure、traceability sections を記録している。
   - tasks が observable completion、numeric requirement coverage、`_Boundary:_`、`_Depends:_` annotations を含んでいる。
4. `quick-tasks` が standalone と同じ 2 つの success path を保持していることを確認する。
   - 明示的な `auto-approve` は `approvals.tasks.approved: true` と `ready_for_implementation: true` を設定できる。
   - `not auto-approve` は `tasks-generated`、task plan review PASS、task graph sanity review PASS 後に ready state を要求せず sanity review へ進める。
5. coherence、hidden prerequisite、task annotation、phase parity drift が残る場合は `NEEDS_FIX` を返す。
6. 必須 phase result または必須 artifact がない場合は `BLOCKED` を返す。

## Completion gate

- `verdict PASS` だけが quick-completion を許可する。
- `NEEDS_FIX` は `fix_targets` を含める。
- `BLOCKED` は `blockingReason` と `fix_targets` を含める。
- quick path は discovery、batch、implementation execution を呼ばない。

## Result mapping

- pass の場合、`kiro-spec-sanity-review` output contract で `verdict: "PASS"` と `quick-completion` の evidence を返す。
- needs-fix の場合、requirements、design、tasks の具体的な `fix_targets` とともに `verdict: "NEEDS_FIX"` を返す。
- blocked の場合、不足している phase result、artifact、または unsafe boundary を `blockingReason` とし、blocked correction target の `fix_targets` とともに `verdict: "BLOCKED"` を返す。

## AI quality gate evidence

- `verdict: "PASS"` を返す前に、各 quick phase の namespaced `kiro-spec-ai-antipattern-review.md` を確認する。
  - Requirements: `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-requirements--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  - Design: `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-design--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
  - Tasks: `reports/subworkflows/iteration-*--step-quick-ai-quality-gate-tasks--workflow-kiro-spec-ai-quality-gate/kiro-spec-ai-antipattern-review.md`
- unresolved AI antipattern findings が残る場合は `verdict: "NEEDS_FIX"` または `verdict: "BLOCKED"` を返す。
- phase の namespaced `kiro-spec-ai-antipattern-fix.md` が存在する場合、stale、cross-run、blocked、evidence-free no-fix outcomes を reject する。
- first review が blocking issue を見つけなかった場合だけ、`kiro-spec-ai-antipattern-fix.md` が存在しなくても valid と扱う。これは optional fix report であり、required success artifact ではない。
- rejected AI gate evidence は quick-completion accept ではなく affected `fix_targets` へ route する。
