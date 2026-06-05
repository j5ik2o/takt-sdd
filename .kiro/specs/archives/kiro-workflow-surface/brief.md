# Brief: kiro-workflow-surface

## Problem

takt-sdd は、cc-sdd v3 の Kiro-style workflow へ移行したい一方で、利用者に見える入口が旧 `cc-sdd:*` surface のままだと、どの workflow が正規なのかが曖昧になります。旧 surface と新 surface が並ぶだけでは、破壊的変更の意図が伝わらず、利用者も agent も古い prompt-driven model に残りやすくなります。

## Current State

OpenSpec change では、次のメジャーバージョンで `kiro:*` script と TAKT-native Kiro workflow を正規入口にする方針が決まっています。ただし `.kiro/specs` にはまだ、この公開面だけを独立して扱う Kiro spec はありません。

## Desired Outcome

`kiro:*` が新しい正規 SDD entrypoint であることが、package metadata、npm scripts、README、agent guidance から一貫して分かる状態にします。旧 `cc-sdd:*` は削除するか、利用者を移行へ誘導する明示的な compatibility shim として扱います。

## Approach

公開 API と移行ドキュメントを、workflow 実装本体から分けて先に固めます。これにより、後続 spec は `kiro:*` namespace と major-version policy を前提にできます。

## Scope

- **In**: `package.json` の major version 更新、`kiro:*` script の正規化、旧 `cc-sdd:*` script の扱い決定、README/README.ja/agent guidance の migration 説明
- **Out**: 個別 Kiro workflow の YAML/facet 実装、output contract の詳細設計、`.kiro/specs/*` lifecycle 操作の実装

## Boundary Candidates

- npm script と package metadata の公開 surface
- 利用者向け README と agent 向け guidance の移行説明
- 旧 `cc-sdd:*` 入口の削除または fail-fast migration shim

## Out of Boundary

- `kiro-spec-status` など個別 workflow の振る舞い
- `kiro-impl` の review/debug/verify gate
- `.claude/skills` や `.agents/skills` からの source asset resolution の実装詳細

## Upstream / Downstream

- **Upstream**: OpenSpec change `takt-native-kiro-workflows`
- **Downstream**: `kiro-shared-workflow-contracts` とすべての Kiro workflow spec

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: OpenSpec workflow は別 system として維持し、Kiro workflow surface と混同しません。

## Constraints

この spec の文書と実装時のユーザー向け説明は、日本人が自然に読める日本語を標準にします。破壊的変更であることを曖昧にせず、移行先を明確に示します。
