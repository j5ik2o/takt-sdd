import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { createWriteStream, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Lang, getMessages } from "./i18n.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getInstallerVersion(): string {
  const pkgPath = resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version as string;
}

const REPO = "j5ik2o/takt-sdd";
const TARGET_DIR = ".takt";
const PIECE_DIR = "workflows";
const KIRO_STAGED_SCRIPT_INSTALL_PATH = "scripts/kiro-staged.mjs";

const SDD_DEPENDENCY_ALLOWLIST = ["takt"] as const;

/**
 * Manifest key patterns for retired assets.
 * Covers:
 *   - .takt/workflows/(cc-sdd-|opsx-)*.yaml  (workflow yamls, both languages)
 *   - .takt/facets/{type}/(cc-sdd-|opsx-)*   (modern layout facets, including nested subdirs)
 *   - .takt/{type}/(cc-sdd-|opsx-)*          (legacy layout facets, including nested subdirs)
 *   - retired-exclusive shared facets without a cc-sdd-/opsx- prefix
 *     (ai-review-fix-loop-judge.md, batch-plan-implement-loop-judge.md; both layouts)
 *   - scripts/opsx-cli.sh                     (legacy opsx helper script)
 * Does NOT match: kiro-* workflows, openspec/, user-owned files.
 */
export const RETIRED_MANIFEST_KEY_PATTERNS: readonly RegExp[] = [
  /^\.takt\/workflows\/(cc-sdd-|opsx-).*\.yaml$/,
  /^\.takt\/(?:facets\/)?[a-z-]+\/(cc-sdd-|opsx-).*/,
  /^\.takt\/(?:facets\/)?instructions\/(ai-review-fix-loop-judge|batch-plan-implement-loop-judge)\.md$/,
  /^scripts\/opsx-cli\.sh$/,
] as const;

/**
 * Return the list of manifest keys that are candidates for retired-asset cleanup.
 * Returns [] when manifest is null (fresh install — cleanup must not fire).
 */
export function planRetiredRemovals(manifest: Manifest | null, _cwd: string): readonly string[] {
  if (manifest === null) return [];
  return Object.keys(manifest.files).filter((key) =>
    RETIRED_MANIFEST_KEY_PATTERNS.some((pattern) => pattern.test(key)),
  );
}

/**
 * Remove retired assets from disk.
 * Generalizes the former bespoke legacy script removal to cover all RETIRED_MANIFEST_KEY_PATTERNS.
 *
 * For each candidate key:
 *   - If the on-disk file hash matches the manifest record → delete + empty-parent cleanup + log.
 *   - If hash differs (customized) → warn and leave in place (req 5.2).
 *   - If the key is not in the manifest → skip (no record, nothing to clean).
 */
export function removeRetiredFiles(
  cwd: string,
  manifest: Manifest,
  msg: ReturnType<typeof getMessages>,
): void {
  const candidates = planRetiredRemovals(manifest, cwd);
  for (const key of candidates) {
    const filePath = join(cwd, key);
    if (!existsSync(filePath)) continue;

    const recordedHash = manifest.files[key];
    if (recordedHash === undefined) continue;

    const currentHash = computeFileHash(filePath);
    if (currentHash !== recordedHash) {
      warn(msg.fileSkippedCustomized(key));
      continue;
    }

    rmSync(filePath, { force: true });
    const parentDir = dirname(filePath);
    if (existsSync(parentDir) && readdirSync(parentDir).length === 0) {
      rmSync(parentDir, { recursive: true, force: true });
    }
    info(msg.fileRemoved(key));
  }
}

export function resolveSddDependencySet(pkg: {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}): Record<string, string> {
  const merged = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  const result: Record<string, string> = {};
  for (const name of SDD_DEPENDENCY_ALLOWLIST) {
    if (merged[name] !== undefined) {
      result[name] = merged[name];
    }
  }
  return result;
}

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
  for (const file of readdirSync(piecesDir).filter((f) => f.endsWith(".yaml"))) {
    const filePath = join(piecesDir, file);
    let content = readFileSync(filePath, "utf-8");
    for (const type of FACET_TYPES) {
      content = content.replaceAll(`../facets/${type}/`, `../${type}/`);
    }
    writeFileSync(filePath, content, "utf-8");
  }
}

const SDD_SCRIPTS: Record<string, string> = {
  "kiro:discovery": "node scripts/kiro-staged.mjs kiro-discovery --pipeline --skip-git -t",
  "kiro:spec:init": "node scripts/kiro-staged.mjs kiro-spec-init --pipeline --skip-git -t",
  "kiro:spec:requirements": "node scripts/kiro-staged.mjs kiro-spec-requirements --pipeline --skip-git -t",
  "kiro:validate:gap": "node scripts/kiro-staged.mjs kiro-validate-gap --pipeline --skip-git -t",
  "kiro:spec:design": "node scripts/kiro-staged.mjs kiro-spec-design --pipeline --skip-git -t",
  "kiro:validate:design": "node scripts/kiro-staged.mjs kiro-validate-design --pipeline --skip-git -t",
  "kiro:spec:tasks": "node scripts/kiro-staged.mjs kiro-spec-tasks --pipeline --skip-git -t",
  "kiro:spec:quick": "node scripts/kiro-staged.mjs kiro-spec-quick --pipeline --skip-git -t",
  "kiro:spec:batch": "node scripts/kiro-staged.mjs kiro-spec-batch --pipeline --skip-git -t",
  "kiro:spec:status": "node scripts/kiro-staged.mjs kiro-spec-status --pipeline --skip-git -t",
  "kiro:impl": "node scripts/kiro-staged.mjs kiro-impl --pipeline --skip-git -t",
  "kiro:validate:impl": "node scripts/kiro-staged.mjs kiro-validate-impl --pipeline --skip-git -t",
  "kiro:steering": "node scripts/kiro-staged.mjs kiro-steering --pipeline --skip-git -t",
  "kiro:steering-custom": "node scripts/kiro-staged.mjs kiro-steering-custom --pipeline --skip-git -t",
};

export interface InstallOptions {
  lang: Lang;
  force: boolean;
  dryRun: boolean;
  tag: string | undefined;
  layout: "auto" | "modern" | "legacy";
  cwd: string;
}

export interface InstallSource {
  readonly rootDir: string;  // `.takt/`・`scripts/kiro-staged.mjs`・`package.json` を含む staged root
  readonly version: string;  // manifest に記録する asset version
}

export type CoreInstallOptions = Omit<InstallOptions, "tag">;

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
              res.resume();
              request(location);
              return;
            }
          }
          if (res.statusCode !== 200) {
            res.resume();
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
  const data = await fetchJson(`https://api.github.com/repos/${REPO}/releases?per_page=100`);
  const releases = JSON.parse(data) as Array<{ tag_name?: string; prerelease?: boolean }>;
  const tagName = releases.find((release) =>
    release.prerelease !== true && release.tag_name?.startsWith("v")
  )?.tag_name;
  if (tagName === undefined) {
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
              res.resume();
              request(location);
              return;
            }
          }
          if (res.statusCode !== 200) {
            res.resume();
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

function isDefaultTagDownloadFallback(error: unknown): boolean {
  return error instanceof Error && /^Download failed: HTTP (403|404)$/.test(error.message);
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

export function syncRelativeFiles(
  srcBase: string,
  destBase: string,
  relativePaths: readonly string[],
  manifest: Manifest | null,
  msg: ReturnType<typeof getMessages>,
  cwd: string,
): SyncResult {
  const files: Record<string, string> = {};

  for (const relFile of relativePaths) {
    const srcPath = join(srcBase, relFile);
    if (!existsSync(srcPath)) continue;

    const destPath = join(destBase, relFile);
    const manifestKey = relative(cwd, destPath).split("\\").join("/");
    const srcHash = computeFileHash(srcPath);
    files[manifestKey] = srcHash;

    if (!existsSync(destPath)) {
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
      info(msg.fileAdded(manifestKey));
    } else if (manifest !== null) {
      const recordedHash = manifest.files[manifestKey];
      if (recordedHash === undefined) {
        warn(msg.fileSkippedCustomized(manifestKey));
      } else {
        const currentHash = computeFileHash(destPath);
        if (currentHash === recordedHash) {
          cpSync(srcPath, destPath);
          info(msg.fileUpdated(manifestKey));
        } else {
          warn(msg.fileSkippedCustomized(manifestKey));
        }
      }
    } else {
      cpSync(srcPath, destPath);
    }
  }

  return { files };
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
  if (!existsSync(srcDir)) return { files: {} };
  return syncRelativeFiles(srcBase, destBase, collectFiles(srcDir, srcBase), manifest, msg, cwd);
}


export async function installFromSource(options: CoreInstallOptions, source: InstallSource): Promise<void> {
  const msg = getMessages(options.lang);
  const targetPath = join(options.cwd, TARGET_DIR);
  const manifestPath = join(targetPath, MANIFEST_FILE);

  const taktDir = join(source.rootDir, TARGET_DIR);
  const kiroStagedPath = join(source.rootDir, KIRO_STAGED_SCRIPT_INSTALL_PATH);
  const packagedAssetBase = join(__dirname, "assets");
  const packagedKiroStagedPath = join(packagedAssetBase, KIRO_STAGED_SCRIPT_INSTALL_PATH);

  if (!existsSync(taktDir)) {
    errorExit(msg.archiveError);
  }

  const hasKiroStagedScript = existsSync(kiroStagedPath) || existsSync(packagedKiroStagedPath);

  const manifest = loadManifest(manifestPath);
  const isUpdate = manifest !== null;
  const workflowsExist = existsSync(join(targetPath, PIECE_DIR));

  if (!isUpdate && workflowsExist && !options.force) {
    errorExit(msg.existsError("npx create-takt-sdd"));
  }

  const resolvedLayout = options.layout === "auto" ? detectLayout() : options.layout;
  info(msg.layoutDetected(resolvedLayout));

  const sddPkgPath = join(source.rootDir, "package.json");
  const sddDevDependencies: Record<string, string> = {};
  if (existsSync(sddPkgPath)) {
    const sddPkg = JSON.parse(readFileSync(sddPkgPath, "utf-8"));
    Object.assign(sddDevDependencies, resolveSddDependencySet(sddPkg));
  }

  if (options.dryRun) {
    info(msg.dryRunHeader);
    const piecesSrcDry = join(taktDir, options.lang, PIECE_DIR);
    if (existsSync(piecesSrcDry)) {
      for (const file of collectFiles(piecesSrcDry, piecesSrcDry)) {
        console.log(msg.dryRunItem(join(TARGET_DIR, PIECE_DIR, file)));
      }
    }
    for (const facetType of FACET_TYPES) {
      const srcDir = join(taktDir, options.lang, srcFacetPath(facetType));
      if (existsSync(srcDir)) {
        const destPrefix = destFacetPath(facetType, resolvedLayout);
        for (const file of collectFiles(srcDir, srcDir)) {
          console.log(msg.dryRunItem(join(TARGET_DIR, destPrefix, file)));
        }
      }
    }
    if (hasKiroStagedScript) {
      console.log(msg.dryRunItem(KIRO_STAGED_SCRIPT_INSTALL_PATH));
    } else {
      errorExit(msg.requiredFileMissing(KIRO_STAGED_SCRIPT_INSTALL_PATH));
    }
    // Show retired-asset removal plan (update only; fresh install has no candidates)
    const retiredPlan = planRetiredRemovals(manifest, options.cwd);
    if (retiredPlan.length > 0) {
      console.log("");
      info("[dry-run] The following retired files would be removed:");
      for (const key of retiredPlan) {
        console.log(msg.dryRunItem(key));
      }
    }
    console.log("");
    info(msg.dryRunSkipped);
    return;
  }

  info(isUpdate ? msg.updating : msg.installing);
  mkdirSync(targetPath, { recursive: true });

  const allFiles: Record<string, string> = {};

  // Need a tmp dir for legacy pieces rewriting (temporary copy only)
  const legacyTmpDir = mkdtempSync(join(tmpdir(), "takt-sdd-legacy-"));
  try {
    const piecesSrc = join(taktDir, options.lang, PIECE_DIR);
    if (existsSync(piecesSrc)) {
      const piecesDest = join(targetPath, PIECE_DIR);
      if (!isUpdate && existsSync(piecesDest)) {
        rmSync(piecesDest, { recursive: true });
      }
      let effectiveSrc = piecesSrc;
      if (resolvedLayout === "legacy") {
        const legacyPiecesTmp = join(legacyTmpDir, "legacy-pieces");
        cpSync(piecesSrc, legacyPiecesTmp, { recursive: true });
        rewritePiecePathsForLegacy(legacyPiecesTmp);
        effectiveSrc = legacyPiecesTmp;
      }
      const result = syncDirectory(
        effectiveSrc, piecesDest,
        effectiveSrc, piecesDest,
        isUpdate ? manifest : null, msg, options.cwd,
      );
      Object.assign(allFiles, result.files);
    }

    for (const facetType of FACET_TYPES) {
      const srcDir = join(taktDir, options.lang, srcFacetPath(facetType));
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

    if (!hasKiroStagedScript) {
      errorExit(msg.requiredFileMissing(KIRO_STAGED_SCRIPT_INSTALL_PATH));
    }

    const kiroStagedScriptResult = syncRelativeFiles(
      existsSync(kiroStagedPath) ? source.rootDir : packagedAssetBase,
      options.cwd,
      [KIRO_STAGED_SCRIPT_INSTALL_PATH],
      isUpdate ? manifest : null,
      msg,
      options.cwd,
    );
    Object.assign(allFiles, kiroStagedScriptResult.files);

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

    if (isUpdate) {
      removeRetiredFiles(options.cwd, manifest!, msg);
    }

    const newManifest: Manifest = {
      version: source.version,
      installedAt: new Date().toISOString(),
      lang: options.lang,
      files: allFiles,
    };
    writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2) + "\n", "utf-8");
    info(msg.manifestCreated);

    info(isUpdate ? msg.updateComplete : msg.complete);
    console.log(msg.usageExamples);
    console.log("");
  } finally {
    rmSync(legacyTmpDir, { recursive: true, force: true });
  }
}

export async function install(options: InstallOptions): Promise<void> {
  const msg = getMessages(options.lang);

  try {
    execSync("which tar", { stdio: "ignore" });
  } catch {
    errorExit(msg.tarNotFound);
  }

  info(msg.downloading);

  const tmpDir = mkdtempSync(join(tmpdir(), "takt-sdd-"));
  const archivePath = join(tmpDir, "archive.tar.gz");

  try {
    const installerVersion = getInstallerVersion();
    let tag = await resolveTag(options.tag, installerVersion);
    let version = tag.startsWith("v") ? tag.slice(1) : tag;
    info(msg.downloadingVersion(tag));
    try {
      const tarballUrl = `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`;
      await download(tarballUrl, archivePath);
    } catch (error) {
      if (options.tag !== undefined || !isDefaultTagDownloadFallback(error)) {
        throw error;
      }
      tag = await fetchLatestTag();
      version = tag.startsWith("v") ? tag.slice(1) : tag;
      info(msg.downloadingVersion(tag));
      const tarballUrl = `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`;
      await download(tarballUrl, archivePath);
    }

    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: "ignore" });

    const extractedDir = join(tmpDir, `takt-sdd-${version}`);

    const { tag: _tag, ...coreOptions } = options;
    await installFromSource(coreOptions, { rootDir: extractedDir, version });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
