export type Lang = "en" | "ja";

interface Messages {
  downloading: string;
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
}

const en: Messages = {
  downloading: "Downloading takt-sdd...",
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
  helpText: `Usage: npx create-takt-sdd [options]

Options:
  --lang <en|ja>  Message language (default: en)
  --force         Overwrite existing .takt/ directory
  --dry-run       Preview without writing files
  -h, --help      Show this help
  -v, --version   Show version`,
  usageExamples: `
  Installed to: .takt/

  Usage:
    takt -w sdd -t "description of requirements"

  Run individual phases:
    takt -w sdd-requirements -t "description of requirements"
    takt -w sdd-design
    takt -w sdd-tasks
    takt -w sdd-impl
    takt -w sdd-validate-impl`,
};

const ja: Messages = {
  downloading: "takt-sdd をダウンロード中...",
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
  helpText: `使い方: npx create-takt-sdd [オプション]

オプション:
  --lang <en|ja>  メッセージ言語 (デフォルト: en)
  --force         既存の .takt/ を上書き
  --dry-run       プレビューのみ（ファイル書き込みなし）
  -h, --help      ヘルプを表示
  -v, --version   バージョンを表示`,
  usageExamples: `
  インストール先: .takt/

  使い方:
    takt -w sdd -t "要件の説明"

  各フェーズの個別実行:
    takt -w sdd-requirements -t "要件の説明"
    takt -w sdd-design
    takt -w sdd-tasks
    takt -w sdd-impl
    takt -w sdd-validate-impl`,
};

const messages: Record<Lang, Messages> = { en, ja };

export function getMessages(lang: Lang): Messages {
  return messages[lang];
}

export function isLang(value: string): value is Lang {
  return value === "en" || value === "ja";
}
