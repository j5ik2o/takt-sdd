# Brief: kiro-shared-workflow-contracts

## Problem

Kiro workflow を TAKT に移すには、status、validation、review、debug、completion などの結果を、自由文の推測ではなく parseable な契約として扱う必要があります。共通契約がないまま各 workflow を実装すると、同じ `.kiro/*` 操作や skill identity resolution が重複し、分岐条件も壊れやすくなります。

## Current State

OpenSpec change では、review verdict、debug decision、validation result、completion gate を output contract で扱う方針が示されています。また `.claude/skills/kiro-*` と `.agents/skills/kiro-*` の両方を source asset として見て、`kiro-impl`、`$kiro-impl`、`/kiro-impl` を同じ skill identity に正規化する必要があります。

## Desired Outcome

すべての Kiro workflow が共有できる output contract、skill identity resolver、`.kiro/steering/` と `.kiro/specs/<feature>/spec.json` の読み書き規約が揃います。後続 workflow は、この共通契約を参照して一貫した routing と validation を実装できます。

## Approach

個別 workflow より先に、共通 facet と validation 対象を定義します。特に output contract は、TAKT rule が広い自然言語推論に頼らずに分岐できる形へ寄せます。

## Scope

- **In**: Kiro status、validation result、review verdict、debug decision、completion verification の output contract、skill identity normalization、host-specific source root lookup、`.kiro/steering/` 読み込み規約、feature name 解決、`spec.json` phase/approval 更新規約、workflow/facet validation checks
- **Out**: 個別 workflow の full implementation、README migration table、task execution の具体的な code edit policy

## Boundary Candidates

- parseable output contract と TAKT routing condition
- skill identity と host-specific source root lookup
- `.kiro/*` artifact 操作の共通 instruction/policy
- workflow YAML と facet reference の validation

## Out of Boundary

- `kiro-spec-status` の表示内容そのもの
- `kiro-spec-design` や `kiro-spec-tasks` の生成ロジック
- `kiro-impl` の task selection や checkbox 更新タイミング

## Upstream / Downstream

- **Upstream**: `kiro-workflow-surface`
- **Downstream**: `kiro-status-validation-workflows`、`kiro-spec-generation-workflows`、`kiro-discovery-batch-workflows`、`kiro-iterative-implementation-workflow`

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: TAKT built-in workflow/facet validation と重複しないよう、Kiro-specific contract に閉じます。

## Constraints

output contract は agent が読みやすいだけでなく、workflow rule が安定して参照できる構造にします。文書は日本語で書きますが、タグ名や機械的な enum は必要に応じて ASCII のまま扱います。
