# Brief: create-takt-sdd-fixed-cc-sdd

## Problem

create-takt-sdd は TAKT 資産と OpenSpec 初期化をまとめて導入できますが、cc-sdd 側の Kiro-compatible 初期化を固定バージョンで内部起動していません。そのため、利用者が create-takt-sdd を実行しただけでは cc-sdd CLI 由来の期待セットアップが確実に揃わず、別途 `npx cc-sdd@...` を実行する手順やバージョン差分に依存しやすくなります。

## Current State

`installer/src/install.ts` には `OPENSPEC_PACKAGE` / `OPENSPEC_VERSION` があり、OpenSpec 初期化は `initializeOpenSpecProject()` で固定バージョンまたは installer 同梱 CLI を `process.execPath` 経由で起動しています。失敗時は `formatExecError()` で stderr/stdout/message を整形し、`i18n.ts` の OpenSpec error message を通じて明示的な error として扱っています。

TAKT asset install は `.takt/.manifest.json` に file hash を記録し、update 時は manifest で追跡済みかつ未カスタマイズのファイルだけを上書きします。現在の install 順序は、アーカイブ取得、asset 同期、package script/devDependency マージ、OpenSpec 初期化、legacy opsx script cleanup、manifest 書き込みです。

## Desired Outcome

create-takt-sdd 実行時に、installer source 内で固定した `CC_SDD_VERSION` の cc-sdd CLI が `npx cc-sdd@<CC_SDD_VERSION> --lang <lang>` 相当で内部起動されます。`--lang` は create-takt-sdd の `options.lang` と同じ値を渡し、dry-run では実行せず実行予定だけを表示します。

cc-sdd 内部起動に失敗した場合は、OpenSpec 初期化失敗と同等に明示的な installer error として停止します。既存の TAKT asset manifest、customized file skip、update 上書き判定、OpenSpec 初期化条件は維持されます。

## Approach

OpenSpec 初期化と同じ installer-local CLI 起動パターンを採用します。`installer/src/install.ts` に `CC_SDD_PACKAGE` / `CC_SDD_VERSION` を追加し、cc-sdd 用の内部起動関数を `process.execPath` + npm CLI 経由で実装します。失敗時は `formatExecError()` を再利用し、`installer/src/i18n.ts` に en/ja の cc-sdd 初期化メッセージと失敗メッセージを追加します。

実行順序は、TAKT asset 同期と package.json 更新を壊さないように、既存 OpenSpec 初期化と同じ install completion path に置きます。dry-run では OpenSpec の preview と同じ粒度で cc-sdd CLI 実行予定を表示し、実際のプロセス起動は行いません。

## Scope

- **In**: `installer/src/install.ts` の固定 cc-sdd package/version 定数、cc-sdd 内部起動、`--lang` 伝播、失敗時 error handling、dry-run preview、`installer/src/i18n.ts` の en/ja メッセージ、installer build/test で確認できる deterministic test または smoke、必要最小限の README/README.ja/COMMON 更新
- **Out**: cc-sdd 側のコードや package 変更、TAKT asset manifest/update policy の設計変更、OpenSpec package/version policy の変更、`.coderabbit.yml` / `.coderabbit.yaml` の変更、既存 TAKT workflow/facet の不要な改修

## Boundary Candidates

- installer の external CLI bootstrap 境界: OpenSpec と cc-sdd の固定バージョン内部起動
- language propagation 境界: create-takt-sdd の `options.lang` を内部 cc-sdd 呼び出しへ渡す契約
- dry-run 境界: ファイル書き込みと外部 CLI 起動を行わず、予定だけを表示する契約
- manifest/update 境界: `.takt/.manifest.json` の hash tracking、customized file skip、update overwrite 判定

## Out of Boundary

- cc-sdd CLI 自体の仕様変更、バグ修正、依存更新
- TAKT asset install の manifest schema 変更
- `OPENSPEC_PACKAGE` / `OPENSPEC_VERSION` の変更
- `kiro:*` workflow surface や `.kiro/specs/*` lifecycle の再設計

## Upstream / Downstream

- **Upstream**: 既存 create-takt-sdd installer、`initializeOpenSpecProject()` の固定 CLI 起動パターン、`formatExecError()`、installer i18n、TAKT asset sync/manifest logic
- **Downstream**: create-takt-sdd 利用者、installer smoke tests、README/README.ja の install behavior 説明

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**: `kiro-workflow-surface` は Kiro-compatible script surface を扱いますが、この spec は create-takt-sdd installer が cc-sdd CLI を固定バージョンで内部起動する導入フローに集中します。`kiro-spec-generation-workflows` は `.kiro/specs` artifact lifecycle を扱い、本 spec はその生成 workflow を変更しません。

## Constraints

cc-sdd 側のコードや package は変更しません。cc-sdd version は `latest` ではなく installer source 内で固定します。`--lang` は create-takt-sdd と内部 cc-sdd 呼び出しで同一値を使います。テストでは少なくとも固定 version 使用、`--lang ja` 伝播、失敗時 error、dry-run 非実行、既存 manifest/update policy の非回帰を確認します。検証では関連する installer build/test、`git diff --check`、可能なら isolated tmp dir での `--lang ja` dry-run または smoke を実行します。
