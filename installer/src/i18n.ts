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
  helpText: string;
  usageExamples: string;
  scriptsAdded: (count: number) => string;
  scriptsSkipped: (keys: string[]) => string;
  scriptsCreated: string;
  depsAdded: (keys: string[]) => string;
  depsUpdated: (keys: string[]) => string;
  installingSkills: string;
  skillInstalled: (name: string) => string;
  skillSymlinked: (name: string, target: string) => string;
  downloadingTaktRefs: (refsPath: string) => string;
  taktRefsInstalled: string;
  taktRefsSkipped: string;
  taktRefsError: string;
  layoutDetected: (layout: string) => string;
  fileAdded: (path: string) => string;
  fileUpdated: (path: string) => string;
  fileSkippedCustomized: (path: string) => string;
  manifestCreated: string;
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
  scriptsAdded: (count) =>
    `Added ${count} npm scripts to package.json`,
  scriptsSkipped: (keys) =>
    `Skipped existing scripts: ${keys.join(", ")}`,
  scriptsCreated: "Created package.json with npm scripts and devDependencies",
  depsAdded: (keys) => `Added devDependencies: ${keys.join(", ")}`,
  depsUpdated: (keys) => `Updated devDependencies: ${keys.join(", ")}`,
  installingSkills: "Installing takt skills to .agent/skills/...",
  skillInstalled: (name) => `Installed skill: ${name}`,
  skillSymlinked: (name, target) => `Symlinked ${target}/${name} -> .agent/skills/${name}`,
  downloadingTaktRefs: (refsPath) => `Downloading takt builtins to ${refsPath}/...`,
  taktRefsInstalled: "Installed takt references (builtins, docs)",
  taktRefsSkipped: "Takt references already exist, skipping",
  taktRefsError: "Warning: Failed to download takt references. Skills may not find style guides.",
  layoutDetected: (layout) => `Using ${layout} layout`,
  fileAdded: (path) => `Added: ${path}`,
  fileUpdated: (path) => `Updated: ${path}`,
  fileSkippedCustomized: (path) => `Skipped (customized): ${path}`,
  manifestCreated: "Created install manifest",
  helpText: `Usage: npx create-takt-sdd [options]

Options:
  --tag <version>    Version to install ("latest", "0.2.0", default: installer version)
  --lang <en|ja>     Message language (default: en)
  --force            Overwrite existing .takt/ directory (ignored if manifest exists)
  --dry-run          Preview without writing files
  --without-skills   Skip installing takt skills to .agent/skills/
  --layout <mode>    Directory layout: auto, modern, legacy (default: auto)
  --refs-path <path> Path for takt references (default: references/takt)
  -h, --help         Show this help
  -v, --version      Show version`,
  usageExamples: `
  Installed to: .takt/

  Usage (CC-SDD):
    npm run cc-sdd:full -- "description of requirements"

  Run individual CC-SDD phases:
    npm run cc-sdd:requirements -- "description of requirements"
    npm run cc-sdd:design -- "feature={feature}"
    npm run cc-sdd:validate-design -- "feature={feature}"
    npm run cc-sdd:tasks -- "feature={feature}"
    npm run cc-sdd:impl -- "feature={feature}"
    npm run cc-sdd:validate-impl -- "feature={feature}"

  Usage (OpenSpec):
    npm run opsx:full -- "description of change"
    npm run opsx:propose -- "change-name"
    npm run opsx:apply -- "change-name"
    npm run opsx:archive -- "change-name"
    npm run opsx:explore -- "topic to explore"`,
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
  scriptsAdded: (count) =>
    `package.json に ${count} 個の npm scripts を追加しました`,
  scriptsSkipped: (keys) =>
    `既存のスクリプトをスキップしました: ${keys.join(", ")}`,
  scriptsCreated: "npm scripts と devDependencies 付きの package.json を作成しました",
  depsAdded: (keys) => `devDependencies を追加しました: ${keys.join(", ")}`,
  depsUpdated: (keys) => `devDependencies を更新しました: ${keys.join(", ")}`,
  installingSkills: ".agent/skills/ に takt スキルをインストール中...",
  skillInstalled: (name) => `スキルをインストールしました: ${name}`,
  skillSymlinked: (name, target) => `シンボリックリンク作成: ${target}/${name} -> .agent/skills/${name}`,
  downloadingTaktRefs: (refsPath) => `${refsPath}/ に takt ビルトインをダウンロード中...`,
  taktRefsInstalled: "takt リファレンスをインストールしました（builtins, docs）",
  taktRefsSkipped: "takt リファレンスは既に存在するためスキップしました",
  taktRefsError: "警告: takt リファレンスのダウンロードに失敗しました。スキルがスタイルガイドを参照できない可能性があります。",
  layoutDetected: (layout) => `${layout} レイアウトを使用します`,
  fileAdded: (path) => `追加: ${path}`,
  fileUpdated: (path) => `更新: ${path}`,
  fileSkippedCustomized: (path) => `スキップ（カスタマイズ済み）: ${path}`,
  manifestCreated: "インストールマニフェストを作成しました",
  helpText: `使い方: npx create-takt-sdd [オプション]

オプション:
  --tag <version>    インストールするバージョン ("latest", "0.2.0", デフォルト: インストーラのバージョン)
  --lang <en|ja>     メッセージ言語 (デフォルト: en)
  --force            既存の .takt/ を上書き（マニフェストがある場合は無視）
  --dry-run          プレビューのみ（ファイル書き込みなし）
  --without-skills   takt スキルのインストールをスキップ
  --layout <mode>    ディレクトリレイアウト: auto, modern, legacy（デフォルト: auto）
  --refs-path <path> takt リファレンスのパス（デフォルト: references/takt）
  -h, --help         ヘルプを表示
  -v, --version      バージョンを表示`,
  usageExamples: `
  インストール先: .takt/

  使い方 (CC-SDD):
    npm run cc-sdd:full -- "要件の説明"

  CC-SDD 各フェーズの個別実行:
    npm run cc-sdd:requirements -- "要件の説明"
    npm run cc-sdd:design -- "feature={feature}"
    npm run cc-sdd:validate-design -- "feature={feature}"
    npm run cc-sdd:tasks -- "feature={feature}"
    npm run cc-sdd:impl -- "feature={feature}"
    npm run cc-sdd:validate-impl -- "feature={feature}"

  使い方 (OpenSpec):
    npm run opsx:full -- "変更の説明"
    npm run opsx:propose -- "change-name"
    npm run opsx:apply -- "change-name"
    npm run opsx:archive -- "change-name"
    npm run opsx:explore -- "探索したいトピック"`,
};

const messages: Record<Lang, Messages> = { en, ja };

export function getMessages(lang: Lang): Messages {
  return messages[lang];
}

export function isLang(value: string): value is Lang {
  return value === "en" || value === "ja";
}
