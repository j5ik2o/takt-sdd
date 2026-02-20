export type Lang = "en" | "ja";

interface Messages {
  downloading: string;
  downloadingVersion: (tag: string) => string;
  installing: string;
  existsError: (cmd: string) => string;
  complete: string;
  dryRunHeader: string;
  dryRunItem: (path: string) => string;
  dryRunSkipped: string;
  taktNotFound: string;
  tarNotFound: string;
  archiveError: string;
  helpText: string;
  usageExamples: string;
  scriptsAdded: (count: number) => string;
  scriptsSkipped: (keys: string[]) => string;
  scriptsCreated: string;
  installingSkills: string;
  skillInstalled: (name: string) => string;
  skillSymlinked: (name: string, target: string) => string;
  downloadingTaktRefs: string;
  taktRefsInstalled: string;
  taktRefsSkipped: string;
  taktRefsError: string;
}

const en: Messages = {
  downloading: "Downloading takt-sdd...",
  downloadingVersion: (tag) => `Downloading takt-sdd ${tag}...`,
  installing: "Installing pieces and facets to .takt/...",
  existsError: (cmd) =>
    `.takt/ already exists. To overwrite, run:\n  ${cmd} --force`,
  complete: "Installation complete!",
  dryRunHeader: "[dry-run] The following files would be installed:",
  dryRunItem: (path) => `  ${path}`,
  dryRunSkipped: "[dry-run] No files were written.",
  taktNotFound:
    "Warning: takt is not installed. Install it first: https://github.com/nrslib/takt",
  tarNotFound: "Error: tar command is required.",
  archiveError: "Error: .takt/ not found in the downloaded archive.",
  scriptsAdded: (count) =>
    `Added ${count} npm scripts to package.json`,
  scriptsSkipped: (keys) =>
    `Skipped existing scripts: ${keys.join(", ")}`,
  scriptsCreated: "Created package.json with npm scripts",
  installingSkills: "Installing takt skills to .agent/skills/...",
  skillInstalled: (name) => `Installed skill: ${name}`,
  skillSymlinked: (name, target) => `Symlinked ${target}/${name} -> .agent/skills/${name}`,
  downloadingTaktRefs: "Downloading takt builtins to references/takt/...",
  taktRefsInstalled: "Installed takt references (builtins, docs)",
  taktRefsSkipped: "Takt references already exist, skipping",
  taktRefsError: "Warning: Failed to download takt references. Skills may not find style guides.",
  helpText: `Usage: npx create-takt-sdd [options]

Options:
  --tag <version>    Version to install ("latest", "0.2.0", default: installer version)
  --lang <en|ja>     Message language (default: en)
  --force            Overwrite existing .takt/ directory
  --dry-run          Preview without writing files
  --without-skills   Skip installing takt skills to .agent/skills/
  -h, --help         Show this help
  -v, --version      Show version`,
  usageExamples: `
  Installed to: .takt/

  Usage:
    npm run sdd -- "description of requirements"

  Run individual phases:
    npm run sdd:requirements -- "description of requirements"
    npm run sdd:design -- "feature={feature}"
    npm run sdd:validate-design -- "feature={feature}"
    npm run sdd:tasks -- "feature={feature}"
    npm run sdd:impl -- "feature={feature}"
    npm run sdd:validate-impl -- "feature={feature}"`,
};

const ja: Messages = {
  downloading: "takt-sdd をダウンロード中...",
  downloadingVersion: (tag) => `takt-sdd ${tag} をダウンロード中...`,
  installing: ".takt/ にピースとファセットをインストール中...",
  existsError: (cmd) =>
    `.takt/ が既に存在します。上書きするには以下を実行してください:\n  ${cmd} --force`,
  complete: "インストール完了!",
  dryRunHeader: "[dry-run] 以下のファイルがインストールされます:",
  dryRunItem: (path) => `  ${path}`,
  dryRunSkipped: "[dry-run] ファイルは書き込まれませんでした。",
  taktNotFound:
    "警告: takt がインストールされていません。先にインストールしてください: https://github.com/nrslib/takt",
  tarNotFound: "エラー: tar コマンドが必要です。",
  archiveError:
    "エラー: ダウンロードしたアーカイブに .takt/ が見つかりません。",
  scriptsAdded: (count) =>
    `package.json に ${count} 個の npm scripts を追加しました`,
  scriptsSkipped: (keys) =>
    `既存のスクリプトをスキップしました: ${keys.join(", ")}`,
  scriptsCreated: "npm scripts 付きの package.json を作成しました",
  installingSkills: ".agent/skills/ に takt スキルをインストール中...",
  skillInstalled: (name) => `スキルをインストールしました: ${name}`,
  skillSymlinked: (name, target) => `シンボリックリンク作成: ${target}/${name} -> .agent/skills/${name}`,
  downloadingTaktRefs: "references/takt/ に takt ビルトインをダウンロード中...",
  taktRefsInstalled: "takt リファレンスをインストールしました（builtins, docs）",
  taktRefsSkipped: "takt リファレンスは既に存在するためスキップしました",
  taktRefsError: "警告: takt リファレンスのダウンロードに失敗しました。スキルがスタイルガイドを参照できない可能性があります。",
  helpText: `使い方: npx create-takt-sdd [オプション]

オプション:
  --tag <version>    インストールするバージョン ("latest", "0.2.0", デフォルト: インストーラのバージョン)
  --lang <en|ja>     メッセージ言語 (デフォルト: en)
  --force            既存の .takt/ を上書き
  --dry-run          プレビューのみ（ファイル書き込みなし）
  --without-skills   takt スキルのインストールをスキップ
  -h, --help         ヘルプを表示
  -v, --version      バージョンを表示`,
  usageExamples: `
  インストール先: .takt/

  使い方:
    npm run sdd -- "要件の説明"

  各フェーズの個別実行:
    npm run sdd:requirements -- "要件の説明"
    npm run sdd:design -- "feature={feature}"
    npm run sdd:validate-design -- "feature={feature}"
    npm run sdd:tasks -- "feature={feature}"
    npm run sdd:impl -- "feature={feature}"
    npm run sdd:validate-impl -- "feature={feature}"`,
};

const messages: Record<Lang, Messages> = { en, ja };

export function getMessages(lang: Lang): Messages {
  return messages[lang];
}

export function isLang(value: string): value is Lang {
  return value === "en" || value === "ja";
}
