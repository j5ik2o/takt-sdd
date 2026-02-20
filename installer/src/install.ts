import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, statSync, writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { createWriteStream } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Lang, getMessages } from "./i18n.js";
import { TAKT_REF_HASH } from "./generated/takt-ref.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getInstallerVersion(): string {
  const pkgPath = resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version as string;
}

const REPO = "j5ik2o/takt-sdd";
const TAKT_REPO = "nrslib/takt";
const TARGET_DIR = ".takt";
const DEFAULT_REFS_PATH = "references/takt";
const FACET_DIRS = [
  "pieces",
  "personas",
  "policies",
  "instructions",
  "knowledge",
  "output-contracts",
];

const TAKT_SKILLS = [
  "takt-analyze",
  "takt-facet",
  "takt-optimize",
  "takt-piece",
];

const SKILL_SYMLINK_TARGETS = [
  ".claude/skills",
  ".codex/skills",
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
  tag: string | undefined;
  withoutSkills: boolean;
  refsPath: string;
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

function fetchJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = (targetUrl: string): void => {
      https
        .get(targetUrl, { headers: { "User-Agent": "create-takt-sdd" } }, (res: IncomingMessage) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            const location = res.headers.location;
            if (location) {
              request(location);
              return;
            }
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Fetch failed: HTTP ${res.statusCode}`));
            return;
          }
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => resolve(data));
        })
        .on("error", reject);
    };
    request(url);
  });
}

async function fetchLatestTag(): Promise<string> {
  const data = await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`);
  const release = JSON.parse(data);
  const tagName = release.tag_name as string;
  if (!tagName) {
    throw new Error("No releases found");
  }
  return tagName;
}

function resolveTag(tagOption: string | undefined, installerVersion: string): string | Promise<string> {
  if (tagOption === undefined) {
    return `v${installerVersion}`;
  }
  if (tagOption === "latest") {
    return fetchLatestTag();
  }
  // Accept both "v0.1.0" and "0.1.0"
  return tagOption.startsWith("v") ? tagOption : `v${tagOption}`;
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
    const installerVersion = getInstallerVersion();
    const tag = await resolveTag(options.tag, installerVersion);
    const version = tag.startsWith("v") ? tag.slice(1) : tag;
    info(msg.downloadingVersion(tag));
    const tarballUrl = `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`;
    await download(tarballUrl, archivePath);

    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: "ignore" });

    const extractedDir = join(tmpDir, `takt-sdd-${version}`);
    const extractedTakt = join(extractedDir, ".takt");

    if (!existsSync(extractedTakt)) {
      errorExit(msg.archiveError);
    }

    // dry-run: ファイル一覧のみ表示
    if (options.dryRun) {
      info(msg.dryRunHeader);
      for (const dir of FACET_DIRS) {
        const srcDir = join(extractedTakt, options.lang, dir);
        if (existsSync(srcDir)) {
          for (const file of collectFiles(srcDir, join(extractedTakt, options.lang))) {
            console.log(msg.dryRunItem(join(TARGET_DIR, file)));
          }
        }
      }
      if (!options.withoutSkills) {
        for (const skill of TAKT_SKILLS) {
          const skillSrc = join(extractedDir, ".agent", "skills", skill);
          if (existsSync(skillSrc)) {
            for (const file of collectFiles(skillSrc, join(extractedDir, ".agent", "skills"))) {
              console.log(msg.dryRunItem(join(".agent", "skills", file)));
            }
            for (const target of SKILL_SYMLINK_TARGETS) {
              console.log(msg.dryRunItem(`${target}/${skill} -> ../../.agent/skills/${skill}`));
            }
          }
        }
        console.log(msg.dryRunItem(`${options.refsPath}/builtins/`));
        console.log(msg.dryRunItem(`${options.refsPath}/docs/`));
      }
      console.log("");
      info(msg.dryRunSkipped);
      return;
    }

    // インストール
    info(msg.installing);
    mkdirSync(targetPath, { recursive: true });

    for (const dir of FACET_DIRS) {
      const srcDir = join(extractedTakt, options.lang, dir);
      if (existsSync(srcDir)) {
        const destDir = join(targetPath, dir);
        if (existsSync(destDir)) {
          rmSync(destDir, { recursive: true });
        }
        cpSync(srcDir, destDir, { recursive: true });
      }
    }

    // .gitignore は takt が初回実行時に自動配置するため、インストーラでは生成しない

    // takt スキルのインストール
    const agentSkillsDir = join(options.cwd, ".agent", "skills");
    const extractedSkillsDir = join(extractedDir, ".agent", "skills");
    if (!options.withoutSkills && existsSync(extractedSkillsDir)) {
      info(msg.installingSkills);
      mkdirSync(agentSkillsDir, { recursive: true });
      for (const skill of TAKT_SKILLS) {
        const skillSrc = join(extractedSkillsDir, skill);
        if (!existsSync(skillSrc)) continue;
        const skillDest = join(agentSkillsDir, skill);
        if (existsSync(skillDest)) {
          rmSync(skillDest, { recursive: true });
        }
        cpSync(skillSrc, skillDest, { recursive: true });
        // SKILL.md 内の references/takt パスを置換
        if (options.refsPath !== DEFAULT_REFS_PATH) {
          const skillMd = join(skillDest, "SKILL.md");
          if (existsSync(skillMd)) {
            const content = readFileSync(skillMd, "utf-8");
            const updated = content.replaceAll(DEFAULT_REFS_PATH, options.refsPath);
            writeFileSync(skillMd, updated, "utf-8");
          }
        }
        info(msg.skillInstalled(skill));
      }
      // .claude/skills/ と .codex/skills/ にシンボリックリンクを作成
      for (const target of SKILL_SYMLINK_TARGETS) {
        const targetDir = join(options.cwd, target);
        mkdirSync(targetDir, { recursive: true });
        for (const skill of TAKT_SKILLS) {
          if (!existsSync(join(agentSkillsDir, skill))) continue;
          const linkPath = join(targetDir, skill);
          if (existsSync(linkPath)) {
            rmSync(linkPath, { recursive: true });
          }
          symlinkSync(`../../.agent/skills/${skill}`, linkPath);
          info(msg.skillSymlinked(skill, target));
        }
      }
    }

    // takt リファレンスのダウンロード（スキルが参照するbuiltins等）
    if (!options.withoutSkills) {
      const refsDir = join(options.cwd, options.refsPath);
      if (!existsSync(join(refsDir, "builtins"))) {
        info(msg.downloadingTaktRefs(options.refsPath));
        const taktTmpDir = mkdtempSync(join(tmpdir(), "takt-refs-"));
        try {
          const taktArchive = join(taktTmpDir, "takt.tar.gz");
          const taktTarball = `https://github.com/${TAKT_REPO}/archive/${TAKT_REF_HASH}.tar.gz`;
          await download(taktTarball, taktArchive);
          execSync(`tar -xzf "${taktArchive}" -C "${taktTmpDir}"`, { stdio: "ignore" });

          // takt-{hash}/ ディレクトリを探す
          const taktExtracted = readdirSync(taktTmpDir).find(
            (d) => d.startsWith("takt-") && statSync(join(taktTmpDir, d)).isDirectory()
          );
          if (taktExtracted) {
            const taktRoot = join(taktTmpDir, taktExtracted);
            mkdirSync(refsDir, { recursive: true });

            // builtins/ をコピー
            const builtinsSrc = join(taktRoot, "builtins");
            if (existsSync(builtinsSrc)) {
              cpSync(builtinsSrc, join(refsDir, "builtins"), { recursive: true });
            }

            // docs/faceted-prompting.ja.md をコピー
            const fpSrc = join(taktRoot, "docs", "faceted-prompting.ja.md");
            if (existsSync(fpSrc)) {
              mkdirSync(join(refsDir, "docs"), { recursive: true });
              cpSync(fpSrc, join(refsDir, "docs", "faceted-prompting.ja.md"));
            }

            info(msg.taktRefsInstalled);
          } else {
            warn(msg.taktRefsError);
          }
        } catch {
          warn(msg.taktRefsError);
        } finally {
          rmSync(taktTmpDir, { recursive: true, force: true });
        }
      } else {
        info(msg.taktRefsSkipped);
      }
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
