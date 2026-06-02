## Context

takt-sdd は現在、`cc-sdd-*` を中心にした TAKT workflow と、`.claude/skills/kiro-*` や `.agents/skills/kiro-*` のような host-specific Kiro skill を持っています。cc-sdd v3 は Agent Skills を主要な workflow surface に変え、discovery、batch specification、自律 implementation のような entrypoint を追加しました。

ただし、これらの skill を CLI エージェント内で直接実行すると、重要な制御面が prose に残ります。どのファイルを読むか、`spec.json` をどう更新するか、reviewer/debugger の出力をどう parse するか、いつ task を完了にするか、失敗時にどこへ遷移するかを、エージェントが都度判断することになります。これは余計な作業や結線漏れの原因になります。

この破壊的変更リリースでは、Kiro-compatible な TAKT workflow を主要な surface にします。`.kiro/steering/` と `.kiro/specs/` は artifact contract として維持し、host-specific な `kiro-*` skill は TAKT facet と workflow behavior へ移植するための source asset として扱います。

## Goals / Non-Goals

**Goals:**

- `kiro:*` script と TAKT workflow を canonical SDD entrypoint にします。
- Kiro source asset を固定パスではなく skill identity で解決します。
- phase routing、validation、review/debug loop、completion check を TAKT workflow YAML にエンコードします。
- Kiro skill の手順を、parseable output contract を持つ reusable TAKT facet に変換します。
- `.kiro/steering/` と `.kiro/specs/` の読み書きを続け、Kiro project artifact の portability を維持します。
- `kiro-impl` は長い prompt ではなく、1 task per iteration、review、debug、verify、mark-complete gate を持つ workflow として安全にします。
- package を次のメジャーバージョンへ上げ、script、workflow、behavior の非互換変更を明示します。

**Non-Goals:**

- 旧 `cc-sdd:*` script を canonical API として維持すること。
- legacy cc-sdd command install との prompt-level compatibility を保つこと。
- OpenSpec と Kiro artifact を 1 つの directory model に統合すること。
- 最初の slice で全 Kiro workflow を実装し切ること。
- TAKT facet でより安全に表現できる場合に、upstream `SKILL.md` の prose を厳密に残すこと。

## Decisions

### Decision 1: `kiro:*` を新しい canonical script namespace にする

メジャーリリースでは、Kiro-compatible workflow surface として `kiro:*` npm script を公開します。旧 `cc-sdd:*` script は削除するか、migration guidance を出す明示的な compatibility alias に変更します。

代替案として、`cc-sdd:*` を canonical namespace のまま残し、`kiro:*` を alias として追加する案がありました。しかしそれでは破壊的変更の境界が弱くなり、利用者が旧 model に留まりやすくなります。

### Decision 2: `.kiro/*` artifact を維持し、prompt-driven control を置き換える

`.kiro/steering/` と `.kiro/specs/` は project steering と feature spec の source として維持します。TAKT workflow は execution order と validation を所有しますが、生成 artifact は Kiro-compatible のままにします。

代替案として、Kiro spec を OpenSpec change に変換する案がありました。しかし artifact portability を下げ、別々の workflow system を混同します。

### Decision 3: skill identity で解決し、facet と sub-workflow に分解する

Kiro skill は skill 名または invocation form で識別してから、TAKT workflow piece に対応付けます。たとえば `$kiro-impl`、`/kiro-impl`、`kiro-impl` はすべて `kiro-impl` skill identity に正規化してから source material を探します。

Source lookup は host-aware にします。

| Execution host | Preferred source root |
| --- | --- |
| Claude | `.claude/skills/<skill-name>/SKILL.md` |
| Shared/Codex fallback | `.agents/skills/<skill-name>/SKILL.md` |

解決された source path は migration/audit の入力であり、runtime control plane そのものではありません。Runtime behavior は TAKT workflow YAML、facet、output contract で表します。

Kiro skill identity は以下の TAKT workflow piece に対応付けます。

| Kiro asset | TAKT representation |
| --- | --- |
| `kiro-spec-status` | read-only status workflow |
| `kiro-validate-*` | parseable GO/NO-GO contract を持つ validation workflow |
| `kiro-spec-*` | `spec.json` の phase と approval field を更新する generation workflow |
| `kiro-discovery` | brief/roadmap artifact を書く routing workflow |
| `kiro-spec-batch` | dependency wave を実行する controller workflow |
| `kiro-impl` | review/debug/verify gate を持つ iterative implementation workflow |
| `kiro-review`、`kiro-debug`、`kiro-verify-completion` | implementation 内で使う internal sub-workflow |

代替案として、`.agents/skills/kiro-*` だけを source path として hard-code する案がありました。しかし Claude installation では `.claude/skills/kiro-*` が relevant source です。もう 1 つの代替案は、`SKILL.md` を読む generic な "execute skill" step を追加し、エージェントに従わせることでした。これは今回解消したい失敗モードを残します。

### Decision 4: staged slice で実装する

Migration は autonomous implementation より前に、低リスク workflow から始めます。

1. Status と validation workflow。
2. Specification generation workflow。
3. Discovery と batch specification workflow。
4. Autonomous implementation workflow。

この順序により、task-level code edit を導入する前に artifact contract を検証できます。

代替案として、すべての skill を一括で port する案がありました。しかし review risk が高くなり、control-plane regression の切り分けが難しくなります。

### Decision 5: output contract を prose より厳密にする

Review verdict、debug decision、validation result、status summary、completion gate は、明示的な tag または structured section を使います。TAKT rule は broad natural-language inference ではなく、それらの contract から route します。

代替案として、既存の free-form report と AI fallback routing を維持する案がありました。しかしそれでは結線漏れの原因になった曖昧さが残ります。

## Risks / Trade-offs

- Breaking script により既存利用者が混乱する -> release note、README migration table、必要なら guidance を出して fail する compatibility alias で緩和します。
- Upstream cc-sdd skill changes と TAKT facet が drift する -> host-specific root をまたいで skill identity を解決し、将来更新用の sync/audit task を追加して緩和します。
- `kiro-spec-batch` の dependency wave が static workflow YAML に素直に写らない -> roadmap state を読み、bounded wave execution instruction を出す controller step で緩和します。
- `kiro-impl` は task scope が曖昧だと過剰編集しうる -> one-task iteration、`_Boundary:_`、`_Depends:_`、明示的 reviewer verdict、checkbox 更新前の completion verification で緩和します。
- English と Japanese facet を両方維持すると migration work が増える -> 必要に応じて Japanese first で実装し、release scope 内で同じ file map に沿って English を backfill します。

## Migration Plan

1. Kiro workflow capability spec と task plan を作成します。
2. `kiro:*` script を追加し、`package.json` を次のメジャーバージョンへ上げます。
3. Status と validation 用の TAKT workflow/facet を追加します。
4. Spec generation 用の TAKT workflow/facet を追加します。
5. Discovery と batch workflow を追加します。
6. Iterative implementation workflow と internal review/debug/verify sub-workflow を追加します。
7. Documentation を更新し、`kiro:*` が canonical であることと破壊的変更を説明します。
8. Workflow YAML validation、代表的な `.kiro` lifecycle smoke test、artifact check を実行します。

Rollback は version rollback で行います。これは major release であるため、旧 `cc-sdd:*` behavior は primary surface として維持しません。

## Open Questions

- 旧 `cc-sdd:*` script は完全に削除するか、1 major release だけ fail-fast migration shim として残すか。
- 最初の release で `ja` と `en` の Kiro workflow を両方含めるか、明示した scope の中で片方を先に ship するか。
- `kiro-spec-batch` は TAKT task management を使って dependency wave を実行するか、1 workflow run 内の controller として維持するか。
