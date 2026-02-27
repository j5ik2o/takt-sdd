import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const PIECE_DIR = "pieces";
const FACET_TYPES = [
  "personas",
  "policies",
  "instructions",
  "knowledge",
  "output-contracts",
];

function srcFacetPath(facetType: string): string {
  return `facets/${facetType}`;
}

function destFacetPath(facetType: string, layout: "modern" | "legacy"): string {
  return layout === "modern" ? `facets/${facetType}` : facetType;
}

function detectLayout(): "modern" | "legacy" {
  try {
    const output = execSync("takt --version", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    const match = output.match(/(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      const [, major, minor] = match.map(Number);
      if (major > 0 || (major === 0 && minor >= 22)) return "modern";
      return "legacy";
    }
  } catch { /* takt not installed */ }
  return "modern";
}

function rewritePiecePathsForLegacy(piecesDir: string): void {
  if (!existsSync(piecesDir)) return;
  for (const file of readdirSync(piecesDir).filter(f => f.endsWith(".yaml"))) {
    const filePath = join(piecesDir, file);
    let content = readFileSync(filePath, "utf-8");
    for (const type of FACET_TYPES) {
      content = content.replaceAll(`../facets/${type}/`, `../${type}/`);
    }
    writeFileSync(filePath, content, "utf-8");
  }
}

const TAKT_SKILLS = [
  "takt-analyze",
  "takt-facet",
  "takt-optimize",
  "takt-piece",
  "takt-task",
];

const SKILL_SYMLINK_TARGETS = [
  ".claude/skills",
  ".codex/skills",
];

const SDD_SCRIPTS: Record<string, string> = {
  "cc-sdd:full": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-full -t",
  "cc-sdd:requirements": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-requirements -t",
  "cc-sdd:validate-gap": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-gap -t",
  "cc-sdd:design": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-design -t",
  "cc-sdd:validate-design": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-design -t",
  "cc-sdd:tasks": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-tasks -t",
  "cc-sdd:impl": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-impl -t",
  "cc-sdd:validate-impl": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-validate-impl -t",
  "cc-sdd:steering": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-steering -t",
  "cc-sdd:steering-custom": "takt --pipeline --skip-git --create-worktree no -w cc-sdd-steering-custom -t",
  "opsx:full": "takt --pipeline --skip-git --create-worktree no -w opsx-full -t",
  "opsx:propose": "takt --pipeline --skip-git --create-worktree no -w opsx-propose -t",
  "opsx:apply": "takt --pipeline --skip-git --create-worktree no -w opsx-apply -t",
  "opsx:archive": "takt --pipeline --skip-git --create-worktree no -w opsx-archive -t",
  "opsx:explore": "takt --pipeline --skip-git --create-worktree no -w opsx-explore -t",
};

export interface InstallOptions {
  lang: Lang;
  force: boolean;
  dryRun: boolean;
  tag: string | undefined;
  withoutSkills: boolean;
  refsPath: string;
  layout: "auto" | "modern" | "legacy";
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

interface Manifest {
  readonly version: string;
  readonly installedAt: string;
  readonly lang: Lang;
  readonly taktRefHash: string;
  readonly files: Readonly<Record<string, string>>;
}

const MANIFEST_FILE = ".manifest.json";

function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function loadManifest(manifestPath: string): Manifest | null {
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as Manifest;
  } catch {
    return null;
  }
}

interface SyncResult {
  readonly files: Record<string, string>;
}

function syncDirectory(
  srcDir: string,
  destDir: string,
  srcBase: string,
  destBase: string,
  manifest: Manifest | null,
  msg: ReturnType<typeof getMessages>,
  cwd: string,
): SyncResult {
  const files: Record<string, string> = {};
  if (!existsSync(srcDir)) return { files };

  const srcFiles = collectFiles(srcDir, srcBase);
  for (const relFile of srcFiles) {
    const srcPath = join(srcBase, relFile);
    const destPath = join(destBase, relFile);
    const manifestKey = relative(cwd, destPath).split("\\").join("/");
    const srcHash = computeFileHash(srcPath);
    files[manifestKey] = srcHash;

    if (!existsSync(destPath)) {
      // New file — copy
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
      info(msg.fileAdded(manifestKey));
    } else if (manifest !== null) {
      const recordedHash = manifest.files[manifestKey];
      if (recordedHash === undefined) {
        // File exists but not in manifest (pre-manifest environment)
        warn(msg.fileSkippedCustomized(manifestKey));
      } else {
        const currentHash = computeFileHash(destPath);
        if (currentHash === recordedHash) {
          // User has not modified — safe to overwrite
          cpSync(srcPath, destPath);
          info(msg.fileUpdated(manifestKey));
        } else {
          // User has customized — skip
          warn(msg.fileSkippedCustomized(manifestKey));
        }
      }
    } else {
      // No manifest, fresh install or force — overwrite
      cpSync(srcPath, destPath);
    }
  }

  return { files };
}

export async function install(options: InstallOptions): Promise<void> {
  const msg = getMessages(options.lang);
  const targetPath = join(options.cwd, TARGET_DIR);
  const manifestPath = join(targetPath, MANIFEST_FILE);

  // tar の存在チェック
  try {
    execSync("which tar", { stdio: "ignore" });
  } catch {
    errorExit(msg.tarNotFound);
  }

  // マニフェスト読み込み＆モード判定
  const manifest = loadManifest(manifestPath);
  const isUpdate = manifest !== null;
  const piecesExist = existsSync(join(targetPath, "pieces"));

  if (!isUpdate && piecesExist && !options.force) {
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

    const resolvedLayout = options.layout === "auto" ? detectLayout() : options.layout;
    info(msg.layoutDetected(resolvedLayout));

    // dry-run: ファイル一覧のみ表示
    if (options.dryRun) {
      info(msg.dryRunHeader);
      // pieces
      const piecesSrcDry = join(extractedTakt, options.lang, PIECE_DIR);
      if (existsSync(piecesSrcDry)) {
        for (const file of collectFiles(piecesSrcDry, piecesSrcDry)) {
          console.log(msg.dryRunItem(join(TARGET_DIR, PIECE_DIR, file)));
        }
      }
      // facets
      for (const facetType of FACET_TYPES) {
        const srcDir = join(extractedTakt, options.lang, srcFacetPath(facetType));
        if (existsSync(srcDir)) {
          const destPrefix = destFacetPath(facetType, resolvedLayout);
          for (const file of collectFiles(srcDir, srcDir)) {
            console.log(msg.dryRunItem(join(TARGET_DIR, destPrefix, file)));
          }
        }
      }
      if (!options.withoutSkills) {
        for (const skill of TAKT_SKILLS) {
          const skillSrc = join(extractedDir, ".agent", "skills", skill);
          if (existsSync(skillSrc)) {
            for (const file of collectFiles(skillSrc, join(extractedDir, ".agent", "skills"))) {
              // Skip language-specific SKILL files (only SKILL.md is installed)
              if (file.endsWith("SKILL.ja.md") || file.endsWith("SKILL.en.md")) continue;
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

    // インストール / アップデート
    info(isUpdate ? msg.updating : msg.installing);
    mkdirSync(targetPath, { recursive: true });

    const allFiles: Record<string, string> = {};

    // pieces（legacy時はsync前にソースのパスを書き換え）
    const piecesSrc = join(extractedTakt, options.lang, PIECE_DIR);
    if (existsSync(piecesSrc)) {
      const piecesDest = join(targetPath, PIECE_DIR);
      if (!isUpdate && existsSync(piecesDest)) {
        rmSync(piecesDest, { recursive: true });
      }
      let effectiveSrc = piecesSrc;
      if (resolvedLayout === "legacy") {
        const legacyTmp = join(tmpDir, "legacy-pieces");
        cpSync(piecesSrc, legacyTmp, { recursive: true });
        rewritePiecePathsForLegacy(legacyTmp);
        effectiveSrc = legacyTmp;
      }
      const result = syncDirectory(
        effectiveSrc, piecesDest,
        effectiveSrc, piecesDest,
        isUpdate ? manifest : null, msg, options.cwd,
      );
      Object.assign(allFiles, result.files);
    }

    // facets
    for (const facetType of FACET_TYPES) {
      const srcDir = join(extractedTakt, options.lang, srcFacetPath(facetType));
      if (existsSync(srcDir)) {
        const destDir = join(targetPath, destFacetPath(facetType, resolvedLayout));
        if (!isUpdate && existsSync(destDir)) {
          rmSync(destDir, { recursive: true });
        }
        const result = syncDirectory(
          srcDir, destDir,
          srcDir, destDir,
          isUpdate ? manifest : null, msg, options.cwd,
        );
        Object.assign(allFiles, result.files);
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

        // Prepare a temp copy with language selection applied
        const skillTmp = join(tmpDir, "skill-prep", skill);
        if (existsSync(skillTmp)) rmSync(skillTmp, { recursive: true });
        cpSync(skillSrc, skillTmp, { recursive: true });

        // Select SKILL.md based on language
        const skillLangMd = join(skillTmp, `SKILL.${options.lang}.md`);
        const skillMdPath = join(skillTmp, "SKILL.md");
        if (existsSync(skillLangMd)) {
          cpSync(skillLangMd, skillMdPath);
        }
        // Remove language-specific SKILL files from temp
        for (const l of ["ja", "en"] as const) {
          const langFile = join(skillTmp, `SKILL.${l}.md`);
          if (existsSync(langFile)) {
            rmSync(langFile);
          }
        }
        // SKILL.md 内の references/takt パスを置換
        if (options.refsPath !== DEFAULT_REFS_PATH) {
          if (existsSync(skillMdPath)) {
            const content = readFileSync(skillMdPath, "utf-8");
            const updated = content.replaceAll(DEFAULT_REFS_PATH, options.refsPath);
            writeFileSync(skillMdPath, updated, "utf-8");
          }
        }

        const skillDest = join(agentSkillsDir, skill);
        if (!isUpdate && existsSync(skillDest)) {
          rmSync(skillDest, { recursive: true });
        }
        const result = syncDirectory(
          skillTmp, skillDest,
          skillTmp, skillDest,
          isUpdate ? manifest : null, msg, options.cwd,
        );
        Object.assign(allFiles, result.files);
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
      const needsRefDownload = isUpdate
        ? manifest.taktRefHash !== TAKT_REF_HASH
        : !existsSync(join(refsDir, "builtins"));
      if (needsRefDownload) {
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

            // builtins/ を syncDirectory でコピー
            const builtinsSrc = join(taktRoot, "builtins");
            if (existsSync(builtinsSrc)) {
              const builtinsDest = join(refsDir, "builtins");
              const result = syncDirectory(
                builtinsSrc, builtinsDest,
                builtinsSrc, builtinsDest,
                isUpdate ? manifest : null, msg, options.cwd,
              );
              Object.assign(allFiles, result.files);
            }

            // docs/faceted-prompting.ja.md をコピー
            const fpSrc = join(taktRoot, "docs", "faceted-prompting.ja.md");
            if (existsSync(fpSrc)) {
              const docsDir = join(refsDir, "docs");
              mkdirSync(docsDir, { recursive: true });
              const fpDest = join(docsDir, "faceted-prompting.ja.md");
              const fpKey = relative(options.cwd, fpDest).split("\\").join("/");
              const fpHash = computeFileHash(fpSrc);

              if (!existsSync(fpDest)) {
                cpSync(fpSrc, fpDest);
                info(msg.fileAdded(fpKey));
              } else if (isUpdate) {
                const recordedHash = manifest.files[fpKey];
                if (recordedHash === undefined) {
                  warn(msg.fileSkippedCustomized(fpKey));
                } else {
                  const currentHash = computeFileHash(fpDest);
                  if (currentHash === recordedHash) {
                    cpSync(fpSrc, fpDest);
                    info(msg.fileUpdated(fpKey));
                  } else {
                    warn(msg.fileSkippedCustomized(fpKey));
                  }
                }
              } else {
                cpSync(fpSrc, fpDest);
              }
              allFiles[fpKey] = fpHash;
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
        // Preserve existing file hashes from manifest for refs
        if (isUpdate) {
          for (const [key, hash] of Object.entries(manifest.files)) {
            if (key.startsWith(options.refsPath)) {
              allFiles[key] = hash;
            }
          }
        }
      }
    }

    // アーカイブの package.json から devDependencies を取得
    const sddPkgPath = join(extractedDir, "package.json");
    const sddDevDependencies: Record<string, string> = {};
    if (existsSync(sddPkgPath)) {
      const sddPkg = JSON.parse(readFileSync(sddPkgPath, "utf-8"));
      const deps = sddPkg.devDependencies ?? {};
      for (const [key, value] of Object.entries(deps)) {
        sddDevDependencies[key] = value as string;
      }
    }

    // package.json に npm scripts と devDependencies を追加
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
      const devDeps = pkg.devDependencies ?? {};
      const depsAdded: string[] = [];
      const depsUpdatedKeys: string[] = [];
      for (const [key, value] of Object.entries(sddDevDependencies)) {
        if (devDeps[key] === undefined) {
          devDeps[key] = value;
          depsAdded.push(key);
        } else if (devDeps[key] !== value) {
          devDeps[key] = value;
          depsUpdatedKeys.push(key);
        }
      }
      pkg.devDependencies = devDeps;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      if (added.length > 0) {
        info(msg.scriptsAdded(added.length));
      }
      if (skipped.length > 0) {
        warn(msg.scriptsSkipped(skipped));
      }
      if (depsAdded.length > 0) {
        info(msg.depsAdded(depsAdded));
      }
      if (depsUpdatedKeys.length > 0) {
        info(msg.depsUpdated(depsUpdatedKeys));
      }
    } else {
      const pkg = {
        private: true,
        scripts: { ...SDD_SCRIPTS },
        devDependencies: { ...sddDevDependencies },
      };
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      info(msg.scriptsCreated);
    }

    // マニフェスト書き込み
    const newManifest: Manifest = {
      version: version,
      installedAt: new Date().toISOString(),
      lang: options.lang,
      taktRefHash: TAKT_REF_HASH,
      files: allFiles,
    };
    writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + "\n", "utf-8");
    info(msg.manifestCreated);

    info(isUpdate ? msg.updateComplete : msg.complete);
    console.log(msg.usageExamples);
    console.log("");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
