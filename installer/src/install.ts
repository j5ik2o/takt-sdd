import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { createWriteStream } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { type Lang, getMessages } from "./i18n.js";

const REPO = "j5ik2o/takt-sdd";
const BRANCH = "main";
const TARGET_DIR = ".takt";
const FACET_DIRS = [
  "pieces",
  "personas",
  "policies",
  "instructions",
  "knowledge",
  "output-contracts",
];

const SDD_SCRIPTS: Record<string, string> = {
  "sdd": "takt --pipeline --skip-git --create-worktree no -w sdd -t",
  "sdd:requirements": "takt --pipeline --skip-git --create-worktree no -w sdd-requirements -t",
  "sdd:validate-gap": "takt --pipeline --skip-git --create-worktree no -w sdd-validate-gap -t",
  "sdd:design": "takt --pipeline --skip-git --create-worktree no -w sdd-design -t",
  "sdd:validate-design": "takt --pipeline --skip-git --create-worktree no -w sdd-validate-design -t",
  "sdd:tasks": "takt --pipeline --skip-git --create-worktree no -w sdd-tasks -t",
  "sdd:impl": "takt --pipeline --skip-git --create-worktree no -w sdd-impl -t",
  "sdd:validate-impl": "takt --pipeline --skip-git --create-worktree no -w sdd-validate-impl -t",
  "steering": "takt --pipeline --skip-git --create-worktree no -w steering -t",
  "steering:custom": "takt --pipeline --skip-git --create-worktree no -w steering-custom -t",
};

export interface InstallOptions {
  lang: Lang;
  force: boolean;
  dryRun: boolean;
  cwd: string;
}

function info(msg: string): void {
  console.log(`\x1b[1;34m==>\x1b[0m ${msg}`);
}

function warn(msg: string): void {
  console.log(`\x1b[1;33m==>\x1b[0m ${msg}`);
}

function errorExit(msg: string): never {
  console.error(`\x1b[1;31m==>\x1b[0m ${msg}`);
  return process.exit(1);
}

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const request = (targetUrl: string): void => {
      https
        .get(targetUrl, (res: IncomingMessage) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const location = res.headers.location;
            if (location) {
              request(location);
              return;
            }
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
        })
        .on("error", reject);
    };
    request(url);
  });
}

function collectFiles(dir: string, base: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, base));
    } else {
      results.push(relative(base, full));
    }
  }
  return results;
}

export async function install(options: InstallOptions): Promise<void> {
  const msg = getMessages(options.lang);
  const targetPath = join(options.cwd, TARGET_DIR);

  // takt の存在チェック
  try {
    execSync("which takt", { stdio: "ignore" });
  } catch {
    warn(msg.taktNotFound);
  }

  // tar の存在チェック
  try {
    execSync("which tar", { stdio: "ignore" });
  } catch {
    errorExit(msg.tarNotFound);
  }

  // 既存ディレクトリチェック
  if (existsSync(join(targetPath, "pieces")) && !options.force) {
    errorExit(msg.existsError("npx create-takt-sdd"));
  }

  // ダウンロード
  info(msg.downloading);

  const tmpDir = mkdtempSync(join(tmpdir(), "takt-sdd-"));
  const archivePath = join(tmpDir, "archive.tar.gz");

  try {
    const tarballUrl = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz`;
    await download(tarballUrl, archivePath);

    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: "ignore" });

    const extractedDir = join(tmpDir, `takt-sdd-${BRANCH}`);
    const extractedTakt = join(extractedDir, ".takt");

    if (!existsSync(extractedTakt)) {
      errorExit(msg.archiveError);
    }

    // dry-run: ファイル一覧のみ表示
    if (options.dryRun) {
      info(msg.dryRunHeader);
      for (const dir of FACET_DIRS) {
        const srcDir = join(extractedTakt, dir);
        if (existsSync(srcDir)) {
          for (const file of collectFiles(srcDir, extractedTakt)) {
            console.log(msg.dryRunItem(join(TARGET_DIR, file)));
          }
        }
      }
      const gitignoreSrc = join(extractedTakt, ".gitignore");
      if (existsSync(gitignoreSrc)) {
        console.log(msg.dryRunItem(join(TARGET_DIR, ".gitignore")));
      }
      console.log("");
      info(msg.dryRunSkipped);
      return;
    }

    // インストール
    info(msg.installing);
    mkdirSync(targetPath, { recursive: true });

    for (const dir of FACET_DIRS) {
      const srcDir = join(extractedTakt, dir);
      if (existsSync(srcDir)) {
        const destDir = join(targetPath, dir);
        if (existsSync(destDir)) {
          rmSync(destDir, { recursive: true });
        }
        cpSync(srcDir, destDir, { recursive: true });
      }
    }

    // .gitignore
    const gitignoreSrc = join(extractedTakt, ".gitignore");
    if (existsSync(gitignoreSrc)) {
      cpSync(gitignoreSrc, join(targetPath, ".gitignore"));
    }

    // package.json に npm scripts を追加
    const pkgPath = join(options.cwd, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const scripts = pkg.scripts ?? {};
      const added: string[] = [];
      const skipped: string[] = [];
      for (const [key, value] of Object.entries(SDD_SCRIPTS)) {
        if (scripts[key] !== undefined) {
          skipped.push(key);
        } else {
          scripts[key] = value;
          added.push(key);
        }
      }
      pkg.scripts = scripts;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      if (added.length > 0) {
        info(msg.scriptsAdded(added.length));
      }
      if (skipped.length > 0) {
        warn(msg.scriptsSkipped(skipped));
      }
    } else {
      const pkg = {
        private: true,
        scripts: { ...SDD_SCRIPTS },
      };
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      info(msg.scriptsCreated);
    }

    info(msg.complete);
    console.log(msg.usageExamples);
    console.log("");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
