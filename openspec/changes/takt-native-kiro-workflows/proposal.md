## Why

cc-sdd v3 は Agent Skills を主要なワークフロー面にしたため、従来の互換契約とは切れています。takt-sdd もこのメジャーバージョン更新のタイミングで、旧来の prompt-driven な cc-sdd workflow 形状を維持するのではなく、Kiro 由来の資産を TAKT 制御下へ移します。

現状の「スキルを手順書として CLI エージェントに読ませる」方式では、順序制御、分岐、完了判定、レビュー/デバッグの引き継ぎがプロンプト依存になります。その結果、余計な作業や結線漏れが起きるため、TAKT の workflow YAML、facet、output contract、明示的な遷移で制御します。

## What Changes

- **BREAKING**: takt-sdd を次のメジャーバージョンへ上げ、TAKT ネイティブな Kiro workflow を主要な SDD 入口にします。
- **BREAKING**: 旧 `cc-sdd:*` workflow script を canonical entrypoint から外し、cc-sdd v3 skill に揃えた `kiro:*` script と workflow name に置き換えます。
- **BREAKING**: Claude の `.claude/skills/kiro-*` や共通/Codex 用の `.agents/skills/kiro-*` のような host-specific Kiro skill は、CLI エージェントへ長い手順として直接実行させるものではなく、TAKT facet と sub-workflow へ分解する source asset として扱います。
- `kiro-impl`、`$kiro-impl`、`/kiro-impl` のような参照は、固定パスではなく skill 名として解決します。
- Kiro-style の status、validation、spec generation、discovery、batch specification、implementation を TAKT workflow として追加します。
- phase status、review verdict、debug decision、completion gate を prose inference ではなく parseable output contract で扱います。
- `.kiro/steering/` と `.kiro/specs/` は user-facing な spec workspace として維持し、既存の Kiro-compatible project の artifact portability を保ちます。
- OpenSpec workflow は分離したままにします。OpenSpec は引き続き利用可能ですが、Kiro/cc-sdd v3 compatibility は `.kiro/*` artifact と `kiro:*` TAKT workflow で表します。

## Capabilities

### New Capabilities

- `kiro-workflow-integration`: cc-sdd v3 Kiro workflow を TAKT ネイティブに実行する capability。deterministic routing、validation gate、implementation sub-workflow を含みます。

### Modified Capabilities

- None.

## Impact

- `package.json` の version と npm scripts。
- `.takt/{ja,en}/workflows` と、`personas`、`policies`、`instructions`、`knowledge`、`output-contracts` 配下の関連 facet。
- `.claude/skills/kiro-*` と `.agents/skills/kiro-*` を含む host-specific `kiro-*` skill の利用モデルとドキュメント。
- `README.md`、`README.ja.md`、`CC-SDD-CODEX.md`、`CC-SDD-CLAUDE.md`、`CLAUDE.md`、`AGENTS.md` のガイダンス。
- workflow YAML と、生成される `.kiro/specs/*` lifecycle update の validation strategy。
