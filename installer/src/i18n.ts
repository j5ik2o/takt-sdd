export type Lang = "en" | "ja";

interface Messages {
  downloading: string;
  downloadingVersion: (tag: string) => string;
  installing: string;
  updating: string;
  existsError: (cmd: string) => string;
  complete: string;
  updateComplete: string;
  dryRunHeader: string;
  dryRunItem: (path: string) => string;
  dryRunSkipped: string;
  tarNotFound: string;
  archiveError: string;
  requiredFileMissing: (path: string) => string;
  helpText: string;
  usageExamples: string;
  scriptsAdded: (count: number) => string;
  scriptsSkipped: (keys: string[]) => string;
  scriptsCreated: string;
  depsAdded: (keys: string[]) => string;
  depsUpdated: (keys: string[]) => string;
  recoveringPartialInstall: string;
  layoutDetected: (layout: string) => string;
  fileAdded: (path: string) => string;
  fileUpdated: (path: string) => string;
  fileRemoved: (path: string) => string;
  fileSkippedCustomized: (path: string) => string;
  manifestCreated: string;
  openspecInitializing: (version: string) => string;
  openspecInitialized: (path: string) => string;
  openspecInitFailed: (details: string) => string;
}

const en: Messages = {
  downloading: "Downloading takt-sdd...",
  downloadingVersion: (tag) => `Downloading takt-sdd ${tag}...`,
  installing: "Installing pieces and facets to .takt/...",
  updating: "Updating takt-sdd...",
  existsError: (cmd) =>
    `.takt/ already exists. To overwrite, run:\n  ${cmd} --force`,
  complete: "Installation complete!",
  updateComplete: "Update complete!",
  dryRunHeader: "[dry-run] The following files would be installed:",
  dryRunItem: (path) => `  ${path}`,
  dryRunSkipped: "[dry-run] No files were written.",
  tarNotFound: "Error: tar command is required.",
  archiveError: "Error: .takt/ not found in the downloaded archive.",
  requiredFileMissing: (path) => `Error: required file not found in the downloaded archive: ${path}`,
  scriptsAdded: (count) =>
    `Added ${count} npm scripts to package.json`,
  scriptsSkipped: (keys) =>
    `Skipped existing scripts: ${keys.join(", ")}`,
  scriptsCreated: "Created package.json with npm scripts and devDependencies",
  depsAdded: (keys) => `Added devDependencies: ${keys.join(", ")}`,
  depsUpdated: (keys) => `Updated devDependencies: ${keys.join(", ")}`,
  recoveringPartialInstall: "Detected a partial install without an OpenSpec config. Continuing recovery install.",
  layoutDetected: (layout) => `Using ${layout} layout`,
  fileAdded: (path) => `Added: ${path}`,
  fileUpdated: (path) => `Updated: ${path}`,
  fileRemoved: (path) => `Removed: ${path}`,
  fileSkippedCustomized: (path) => `Skipped (customized): ${path}`,
  manifestCreated: "Created install manifest",
  openspecInitializing: (version) => `Initializing OpenSpec ${version}...`,
  openspecInitialized: (path) => `OpenSpec initialized: ${path}`,
  openspecInitFailed: (details) => `Error: failed to initialize OpenSpec.\n${details}`,
  helpText: `Usage: npx create-takt-sdd [options]

Options:
  --tag <version>    Version to install ("latest", "0.2.0", default: installer version)
  --lang <en|ja>     Message language (default: en)
  --force            Overwrite existing .takt/ directory (ignored if manifest exists)
  --dry-run          Preview without writing files
  --layout <mode>    Directory layout: auto, modern, legacy (default: auto)
  -h, --help         Show this help
  -v, --version      Show version`,
  usageExamples: `
  Installed to: .takt/

  Usage (Kiro-compatible SDD):
    npm run kiro:spec:quick -- "description of requirements"
    npm run kiro:impl -- "feature={feature}"

  Run individual Kiro phases:
    npm run kiro:spec:requirements -- "description of requirements"
    npm run kiro:spec:design -- "feature={feature}"
    npm run kiro:validate:design -- "feature={feature}"
    npm run kiro:spec:tasks -- "feature={feature}"
    npm run kiro:validate:impl -- "feature={feature}"

  Legacy CC-SDD scripts remain available during migration:
    npm run cc-sdd:full -- "description of requirements"

  Usage (OpenSpec):
    npm run opsx:full -- "description of change"
    npm run opsx:propose -- "change-name"
    npm run opsx:apply -- "change-name"
    npm run opsx:archive -- "change-name"
    npm run opsx:explore`,
};

const ja: Messages = {
  downloading: "takt-sdd をダウンロード中...",
  downloadingVersion: (tag) => `takt-sdd ${tag} をダウンロード中...`,
  installing: ".takt/ にピースとファセットをインストール中...",
  updating: "takt-sdd をアップデート中...",
  existsError: (cmd) =>
    `.takt/ が既に存在します。上書きするには以下を実行してください:\n  ${cmd} --force`,
  complete: "インストール完了!",
  updateComplete: "アップデート完了!",
  dryRunHeader: "[dry-run] 以下のファイルがインストールされます:",
  dryRunItem: (path) => `  ${path}`,
  dryRunSkipped: "[dry-run] ファイルは書き込まれませんでした。",
  tarNotFound: "エラー: tar コマンドが必要です。",
  archiveError:
    "エラー: ダウンロードしたアーカイブに .takt/ が見つかりません。",
  requiredFileMissing: (path) =>
    `エラー: ダウンロードしたアーカイブに必須ファイルが見つかりません: ${path}`,
  scriptsAdded: (count) =>
    `package.json に ${count} 個の npm scripts を追加しました`,
  scriptsSkipped: (keys) =>
    `既存のスクリプトをスキップしました: ${keys.join(", ")}`,
  scriptsCreated: "npm scripts と devDependencies 付きの package.json を作成しました",
  depsAdded: (keys) => `devDependencies を追加しました: ${keys.join(", ")}`,
  depsUpdated: (keys) => `devDependencies を更新しました: ${keys.join(", ")}`,
  recoveringPartialInstall: "OpenSpec 設定のない中途半端なインストールを検出しました。復旧インストールを続行します。",
  layoutDetected: (layout) => `${layout} レイアウトを使用します`,
  fileAdded: (path) => `追加: ${path}`,
  fileUpdated: (path) => `更新: ${path}`,
  fileRemoved: (path) => `削除: ${path}`,
  fileSkippedCustomized: (path) => `スキップ（カスタマイズ済み）: ${path}`,
  manifestCreated: "インストールマニフェストを作成しました",
  openspecInitializing: (version) => `OpenSpec ${version} を初期化中...`,
  openspecInitialized: (path) => `OpenSpec を初期化しました: ${path}`,
  openspecInitFailed: (details) => `エラー: OpenSpec の初期化に失敗しました。\n${details}`,
  helpText: `使い方: npx create-takt-sdd [オプション]

オプション:
  --tag <version>    インストールするバージョン ("latest", "0.2.0", デフォルト: インストーラのバージョン)
  --lang <en|ja>     メッセージ言語 (デフォルト: en)
  --force            既存の .takt/ を上書き（マニフェストがある場合は無視）
  --dry-run          プレビューのみ（ファイル書き込みなし）
  --layout <mode>    ディレクトリレイアウト: auto, modern, legacy（デフォルト: auto）
  -h, --help         ヘルプを表示
  -v, --version      バージョンを表示`,
  usageExamples: `
  インストール先: .takt/

  使い方 (Kiro-compatible SDD):
    npm run kiro:spec:quick -- "要件の説明"
    npm run kiro:impl -- "feature={feature}"

  Kiro 各フェーズの個別実行:
    npm run kiro:spec:requirements -- "要件の説明"
    npm run kiro:spec:design -- "feature={feature}"
    npm run kiro:validate:design -- "feature={feature}"
    npm run kiro:spec:tasks -- "feature={feature}"
    npm run kiro:validate:impl -- "feature={feature}"

  旧 CC-SDD scripts は移行期間中も利用できます:
    npm run cc-sdd:full -- "要件の説明"

  使い方 (OpenSpec):
    npm run opsx:full -- "変更の説明"
    npm run opsx:propose -- "change-name"
    npm run opsx:apply -- "change-name"
    npm run opsx:archive -- "change-name"
    npm run opsx:explore`,
};

const messages: Record<Lang, Messages> = { en, ja };

export function getMessages(lang: Lang): Messages {
  return messages[lang];
}

export function isLang(value: string): value is Lang {
  return value === "en" || value === "ja";
}
