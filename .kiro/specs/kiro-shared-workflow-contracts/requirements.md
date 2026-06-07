# Requirements Document

## Introduction

`kiro-shared-workflow-contracts` は、TAKT ネイティブな Kiro workflow が共通して使う output contract、skill identity の正規化、`.kiro/*` artifact 操作規約、validation checks を定義する spec です。`kiro-workflow-surface` が公開した `kiro:*` namespace を前提に、後続 workflow が自由文の推測ではなく parseable な結果と明確な artifact contract で分岐できる状態にします。

この spec は共通契約と検証対象を扱います。`kiro-spec-status`、`kiro-spec-*`、`kiro-discovery`、`kiro-spec-batch`、`kiro-impl` など個別 workflow の full implementation は下流 spec が扱います。

## Boundary Context

- **In scope**: Kiro status、validation result、review verdict、debug decision、completion verification の output contract、skill identity normalization、host-specific source root lookup、`.kiro/steering/` 読み込み規約、feature name 解決、`spec.json` phase/approval 更新規約、built-in facet inheritance policy、Kiro workflow/facet validation checks
- **Out of scope**: 個別 workflow YAML の full implementation、個別 spec 生成ロジック、implementation task selection、README migration table、旧 `cc-sdd:*` shim
- **Adjacent expectations**: `kiro-workflow-surface` が定める `kiro:*` namespace を前提にし、`kiro-status-validation-workflows`、`kiro-spec-generation-workflows`、`kiro-discovery-batch-workflows`、`kiro-iterative-implementation-workflow` は本 spec の共通契約を参照して分岐と検証を実装する

## Requirements

### Requirement 1: Kiro workflow の parseable output contract を定義する

**Objective:** workflow 実装者として、status、validation、review、debug、completion の結果を安定して分岐条件に使いたい。そうすることで、TAKT rule が広い自然言語推論に頼らず後続 step を選べる。

#### Acceptance Criteria

1. Kiro workflow が status 結果を出力する場合、Kiro contract set は feature の存在、phase、approval、ready-for-implementation の判定を parseable な構造で表現できる。
2. Kiro workflow が validation result を出力する場合、Kiro contract set は `PASS`、`FAIL`、`NEEDS_FIX`、`BLOCKED` のような分岐可能な verdict と主要理由を表現できる。
3. Kiro workflow が review verdict を出力する場合、Kiro contract set は `VERDICT: APPROVED | REJECTED`、actionable findings、対象 requirement/task を分けて表現できる。
4. Kiro workflow が debug decision を出力する場合、Kiro contract set は root cause、selected action、retry eligibility、abort reason を分岐可能な形で表現できる。
5. Kiro workflow が completion verification を出力する場合、Kiro contract set は 完了可否、未完了項目、検証証跡を parseable な形で表現できる。
6. Kiro contract set は 人間向け要約と機械判定用フィールドを混在させず、workflow rule が参照する値を明示する。

### Requirement 2: skill identity を正規化し source root を解決できる

**Objective:** coding agent と workflow 実装者として、`kiro-impl`、`$kiro-impl`、`/kiro-impl` などの呼び出し表現を同じ skill として扱いたい。そうすることで、host ごとの skill 配置差異に引きずられず同じ workflow contract を参照できる。

#### Acceptance Criteria

1. workflow が skill 名を受け取る場合、Kiro contract set は `$` prefix、`/` prefix、npm script context を除去して canonical skill identity に正規化する規約を示す。
2. workflow が host-specific source asset を探す場合、Kiro contract set は `.agents/skills/kiro-*` と `.claude/skills/kiro-*` の lookup order と fallback を示す。
3. canonical skill identity に対応する source root が見つからない場合、Kiro contract set は downstream workflow が `BLOCKED` として扱える error shape を定義する。
4. Kiro contract set は source asset root を runtime control plane として扱わず、workflow 実行の判断材料として扱う。
5. downstream workflow が skill identity を参照する場合、Kiro contract set は 同じ入力表現が同じ canonical identity へ解決されることを検証できる。

### Requirement 3: `.kiro/*` artifact 操作規約を共有する

**Objective:** workflow 実装者として、steering と spec artifact の読み書き規約を共通化したい。そうすることで、各 workflow が `.kiro/*` 操作を重複実装せず、同じ boundary で artifact を扱える。

#### Acceptance Criteria

1. workflow が project context を読む場合、Kiro contract set は `.kiro/steering/roadmap.md` と存在する steering files の読み込み規約を示す。
2. workflow が feature を解決する場合、Kiro contract set は `.kiro/specs/<feature>/` の存在確認、`brief.md` の扱い、missing feature の error shape を示す。
3. workflow が spec artifact を読む場合、Kiro contract set は `requirements.md`、`design.md`、`tasks.md`、`spec.json` の phase ごとの必須性を示す。
4. artifact が存在しない、または phase と矛盾する場合、Kiro contract set は downstream workflow が修復、停止、または次 phase へ進む判断をできる error category を示す。
5. Kiro contract set は OpenSpec artifacts を `.kiro/*` artifact contract に取り込まない。

### Requirement 4: `spec.json` phase と approval 更新規約を定義する

**Objective:** workflow 実装者として、spec lifecycle の状態更新を workflow 間でそろえたい。そうすることで、後続 workflow が phase と approvals を同じ意味で解釈できる。

#### Acceptance Criteria

1. requirements phase が完了する場合、Kiro contract set は `phase`、`approvals.requirements.generated`、`updated_at` の期待状態を定義する。
2. design phase が完了する場合、Kiro contract set は requirements approval と design generated/approved の期待状態を定義する。
3. tasks phase が完了する場合、Kiro contract set は requirements/design/tasks approvals と `ready_for_implementation` の期待状態を定義する。
4. auto-approve mode が使われる場合、Kiro contract set は generated と approved の更新差分を明示する。
5. Kiro contract set は 個別 workflow が `spec.json` に未知の lifecycle value を追加する前に再検証を要求する。

### Requirement 5: Kiro workflow/facet validation checks を定義する

**Objective:** maintainer として、Kiro 共通契約の drift を release 前に検出したい。そうすることで、下流 workflow が参照する contract 名、enum、facet path のずれを早期に止められる。

#### Acceptance Criteria

1. validation checks を実行する場合、Kiro contract validation は Kiro output contract facets が必要な verdict enum と機械判定フィールドを持つことを検出する。
2. validation checks を実行する場合、Kiro contract validation は skill identity normalization の代表入力が同じ canonical identity へ解決されることを検出する。
3. validation checks を実行する場合、Kiro contract validation は `.kiro/*` artifact 操作規約が phase/approval rules と矛盾しないことを検出する。
4. validation checks を実行する場合、Kiro contract validation は workflow YAML が存在する場合に Kiro-specific output contract 名と facet reference を解決できることを検出する。
5. Kiro contract validation は 個別 workflow の full behavior をこの spec の成功条件に含めない。

### Requirement 6: 下流 workflow が共通契約を安全に参照できる

**Objective:** 下流 spec の実装者として、共通契約の責務と参照方法を明確に知りたい。そうすることで、status/validation/spec generation/discovery/implementation workflow が同じ contract を使いながら重複実装を避けられる。

#### Acceptance Criteria

1. downstream workflow spec が設計される場合、Kiro contract set は どの output contract、skill identity rule、artifact operation rule を参照すべきか判断できる名前と境界を提供する。
2. downstream workflow が本 spec の契約を使う場合、Kiro contract set は downstream-specific な task selection、generation prompt、review loop の詳細を要求しない。
3. shared contract の enum、tag、field name が変更される場合、Kiro contract set は downstream workflow の再検証が必要であることを示す。
4. Kiro contract set は `kiro-workflow-surface` の `kiro:*` namespace と矛盾する command identity を導入しない。

### Requirement 7: built-in facet を継承して差分だけを記述できる

**Objective:** workflow/facet 実装者として、TAKT の既定 facet を活かしながら Kiro 固有の差分だけを記述したい。そうすることで、既定の persona、policy、instruction、output contract の改善を取り込みやすくし、Kiro-specific facet のコピー肥大化を避けられる。

#### Acceptance Criteria

1. Kiro-specific facet が TAKT 既定 facet と同じ責務を持つ場合、Kiro contract set は `extends` による親 facet 参照を優先する方針を示す。
2. facet が `extends` を使う場合、Kiro contract set は TAKT runtime が解決できる `{extends: parent}` の bare facet name を基本形として定義し、type-qualified facet id は runtime が対応した後の再検証対象として扱う。
3. 親 facet が `node_modules/takt/builtins/{lang}/facets` に存在しない場合、Kiro contract validation は `BUILTIN_FACET_NOT_FOUND` として fail-fast できる。
4. TAKT runtime が Markdown facet inheritance を解決できない場合、Kiro contract validation は `FACET_EXTENDS_UNSUPPORTED` として前提不足を示し、親 facet の暗黙コピーとして扱わない。
5. Kiro-specific facet が built-in facet を継承しない場合、design または validation finding は full custom にする理由を示す。

### Requirement 8: Kiro skill を source of truth とする thin adapter facet を定義する

**Objective:** workflow/facet 実装者として、Kiro skill 本体を TAKT facet にコピーせず、Kiro skill の特定 section を継承した adapter として扱いたい。そうすることで、`.agents/skills/kiro-*` が更新されたときに TAKT workflow 側の追従範囲を input/output/rule mapping の差分へ限定できる。

#### Acceptance Criteria

1. Kiro-specific instruction facet が Kiro skill の手順を実行する場合、Kiro contract set は frontmatter の `extends_skill` と `extends_skill_section` で参照元 skill と section heading を明示できる。
2. `extends_skill_section` が記述される場合、Kiro contract set は翻訳後の見出しではなく、参照元 `SKILL.md` に存在する section heading 文字列をそのまま使うことを要求する。
3. thin adapter facet の本文は Kiro skill 本文のコピーではなく、TAKT の入力 artifact、参照 facet、出力 contract、rule condition への写像だけを記述する。
4. en/ja の thin adapter facet が同じ Kiro skill section を参照する場合、Kiro contract validation は `extends_skill`、`extends_skill_section`、machine field、enum の drift を検出する。
5. Kiro skill source root または section heading が存在しない場合、Kiro contract validation は `SKILL_SOURCE_MISSING` または `SKILL_SECTION_NOT_FOUND` として fail-fast できる。
6. Kiro skill 本文に由来する長い手順コピーが thin adapter facet に含まれる場合、Kiro contract validation は `SKILL_BODY_COPY_DETECTED` として差し戻せる。

### Requirement 9: Kiro workflow の形と loop monitor の共通契約を定義する

**Objective:** workflow 実装者として、`kiro-*` workflow を単発 prompt step ではなく、Kiro skill が要求する確認、修正、debug、validation の閉じた loop として実装したい。そうすることで、agent が途中成果だけを返して止まる事故を避けられる。

#### Acceptance Criteria

1. Kiro workflow が generation または implementation を行う場合、Kiro contract set は単一 prompt step wrapper を不正な shape として扱い、phase step、review/validation step、必要な repair/debug step、finalization step の接続を要求する。
2. Kiro workflow が read-only status/validation を行う場合、Kiro contract set は collect evidence、classify/validate、report のような複数 step の workflow shape を要求し、artifact 更新や repair loop を含めない。
3. Kiro workflow が再実行上限を持つ場合、Kiro contract set は上限を workflow YAML の `loop_monitors.threshold` にだけ置き、facet frontmatter、validator、独自 counter に重複して持たせない。
4. Kiro workflow が phase workflow を再利用する場合、Kiro contract set は `workflow_call`、shell 経由の `takt -w`、workflow-to-workflow の再起動ではなく、同じ thin adapter facet、output contract、validation helper の再利用を要求する。
5. Kiro workflow validation は、Kiro-specific workflow が未使用 facet を保持している場合、または workflow から参照されない Kiro-specific facet が残っている場合に failure として検出できる。
6. Kiro workflow validation は、既存の unreleased `.takt/{en,ja}/workflows/kiro-*.yaml` と Kiro instruction facets を互換維持対象にせず、必要に応じて削除・再作成できる前提を downstream spec に提供する。

### Requirement 10: Kiro skill の構造化フィールドをそのまま machine contract として扱う

**Objective:** workflow 実装者として、Kiro skill が定義する `STATUS`、`VERDICT`、`NEXT_ACTION`、`DECISION` などを TAKT rule から直接参照したい。そうすることで、Kiro skill の更新と TAKT output contract の間に独自翻訳層を増やさずに済む。

#### Acceptance Criteria

1. Kiro implementation adapter が implementer output を読む場合、Kiro contract set は `STATUS: READY_FOR_REVIEW | BLOCKED | NEEDS_CONTEXT` を source of truth として扱う。
2. Kiro review adapter が reviewer output を読む場合、Kiro contract set は `VERDICT: APPROVED | REJECTED` を source of truth として扱う。
3. Kiro debug adapter が debugger output を読む場合、Kiro contract set は `NEXT_ACTION: RETRY_TASK | BLOCK_TASK | STOP_FOR_HUMAN` を source of truth として扱う。
4. Kiro implementation validation adapter が feature validation output を読む場合、Kiro contract set は `DECISION: GO | NO-GO | MANUAL_VERIFY_REQUIRED` を source of truth として扱う。
5. spec generation review adapter が Kiro spec skill の review step を読む場合、Kiro contract set は該当 skill section が定義する review result を source of truth とし、独自の `validation.verdict` や `review.verdict` へ翻訳しない。
6. 既存 `kiro-validation-result`、`kiro-review-verdict`、`kiro-debug-decision` などの shared output contract は、人間向け補助形式として残す場合でも Kiro skill field を上書きせず、workflow rule の primary field は Kiro skill field に一致させる。
