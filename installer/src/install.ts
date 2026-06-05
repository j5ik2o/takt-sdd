import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { createWriteStream, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Lang, getMessages } from "./i18n.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

function getInstallerVersion(): string {
  const pkgPath = resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version as string;
}

const REPO = "j5ik2o/takt-sdd";
const TARGET_DIR = ".takt";
const PIECE_DIR = "workflows";
const KIRO_STAGED_SCRIPT_INSTALL_PATH = "scripts/kiro-staged.mjs";
const LEGACY_OPSX_SCRIPT_INSTALL_PATH = "scripts/opsx-cli.sh";
const OPENSPEC_PACKAGE = "@fission-ai/openspec";
const OPENSPEC_VERSION = "1.3.1";
const OPENSPEC_CONFIG_PATH = "openspec/config.yaml";
const KIRO_STAGED_SCRIPT_CONTENT = [
  "#!/usr/bin/env node",
  "",
  "import { existsSync } from \"node:fs\";",
  "import { dirname, resolve } from \"node:path\";",
  "import { spawnSync } from \"node:child_process\";",
  "import { fileURLToPath } from \"node:url\";",
  "",
  "const [, , workflowName, ...forwardedArgs] = process.argv;",
  "",
  "if (!workflowName) {",
  "  console.error(\"Usage: node scripts/kiro-staged.mjs <workflow-name> [takt args...]\");",
  "  process.exit(1);",
  "}",
  "",
  "const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), \"..\");",
  "const workflowCandidates = [",
  "  resolve(repoRoot, \".takt\", \"workflows\", `${workflowName}.yaml`),",
  "  resolve(repoRoot, \".takt\", \"ja\", \"workflows\", `${workflowName}.yaml`),",
  "  resolve(repoRoot, \".takt\", \"en\", \"workflows\", `${workflowName}.yaml`),",
  "];",
  "",
  "if (!workflowCandidates.some((path) => existsSync(path))) {",
  "  console.error(`Kiro workflow '${workflowName}' is not installed yet.`);",
  "  console.error(\"This command is part of the staged Kiro workflow surface.\");",
  "  console.error(\"Install or merge the downstream Kiro workflow implementation before running it.\");",
  "  process.exit(1);",
  "}",
  "",
  "const taktWrapper = resolve(repoRoot, \"scripts\", \"takt.sh\");",
  "const command = existsSync(taktWrapper) ? taktWrapper : \"takt\";",
  "const args = [...forwardedArgs, \"-w\", workflowName];",
  "const result = spawnSync(command, args, { stdio: \"inherit\" });",
  "",
  "if (result.error) {",
  "  console.error(result.error.message);",
  "  process.exit(1);",
  "}",
  "",
  "process.exit(result.status ?? 1);",
  "",
].join("\n");
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
  "cc-sdd:full": "takt --pipeline --skip-git -w cc-sdd-full -t",
  "cc-sdd:requirements": "takt --pipeline --skip-git -w cc-sdd-requirements -t",
  "cc-sdd:validate-gap": "takt --pipeline --skip-git -w cc-sdd-validate-gap -t",
  "cc-sdd:design": "takt --pipeline --skip-git -w cc-sdd-design -t",
  "cc-sdd:validate-design": "takt --pipeline --skip-git -w cc-sdd-validate-design -t",
  "cc-sdd:tasks": "takt --pipeline --skip-git -w cc-sdd-tasks -t",
  "cc-sdd:impl": "takt --pipeline --skip-git -w cc-sdd-impl -t",
  "cc-sdd:validate-impl": "takt --pipeline --skip-git -w cc-sdd-validate-impl -t",
  "cc-sdd:steering": "takt --pipeline --skip-git -w cc-sdd-steering -t",
  "cc-sdd:steering-custom": "takt --pipeline --skip-git -w cc-sdd-steering-custom -t",
  "opsx:full": "takt --pipeline --skip-git -w opsx-full -t",
  "opsx:propose": "takt --pipeline --skip-git -w opsx-propose -t",
  "opsx:apply": "takt --pipeline --skip-git -w opsx-apply -t",
  "opsx:archive": "takt --pipeline --skip-git -w opsx-archive -t",
  "opsx:explore": "takt --skip-git -w opsx-explore",
};

export interface InstallOptions {
  lang: Lang;
  force: boolean;
  dryRun: boolean;
  tag: string | undefined;
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

function computeContentHash(content: string): string {
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

function syncRelativeFiles(
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

function syncGeneratedFile(
  destBase: string,
  relFile: string,
  content: string,
  manifest: Manifest | null,
  msg: ReturnType<typeof getMessages>,
  cwd: string,
): SyncResult {
  const destPath = join(destBase, relFile);
  const manifestKey = relative(cwd, destPath).split("\\").join("/");
  const contentHash = computeContentHash(content);
  const files: Record<string, string> = { [manifestKey]: contentHash };

  if (!existsSync(destPath)) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, content, "utf-8");
    info(msg.fileAdded(manifestKey));
  } else if (manifest !== null) {
    const recordedHash = manifest.files[manifestKey];
    if (recordedHash === undefined) {
      warn(msg.fileSkippedCustomized(manifestKey));
    } else {
      const currentHash = computeFileHash(destPath);
      if (currentHash === recordedHash) {
        writeFileSync(destPath, content, "utf-8");
        info(msg.fileUpdated(manifestKey));
      } else {
        warn(msg.fileSkippedCustomized(manifestKey));
      }
    }
  } else {
    writeFileSync(destPath, content, "utf-8");
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

function getOpenSpecCliPath(): string {
  const packageEntry = require.resolve(OPENSPEC_PACKAGE);
  return resolve(dirname(packageEntry), "..", "bin", "openspec.js");
}

function getNpmCliPath(): string {
  return resolve(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js");
}

function formatExecError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const stderr = Reflect.get(error, "stderr");
    if (typeof stderr === "string" && stderr.trim() !== "") return stderr.trim();
    if (stderr instanceof Buffer && stderr.length > 0) return stderr.toString("utf-8").trim();

    const stdout = Reflect.get(error, "stdout");
    if (typeof stdout === "string" && stdout.trim() !== "") return stdout.trim();
    if (stdout instanceof Buffer && stdout.length > 0) return stdout.toString("utf-8").trim();

    const message = Reflect.get(error, "message");
    if (typeof message === "string" && message.trim() !== "") return message.trim();
  }
  return String(error);
}

function initializeOpenSpecProject(
  cwd: string,
  openspecVersionSpec: string,
  msg: ReturnType<typeof getMessages>,
): void {
  info(msg.openspecInitializing(openspecVersionSpec));
  try {
    const args = openspecVersionSpec === OPENSPEC_VERSION
      ? [getOpenSpecCliPath(), "init", "--tools", "none", "--force", "."]
      : [
        getNpmCliPath(),
        "exec",
        "--yes",
        `--package=${OPENSPEC_PACKAGE}@${openspecVersionSpec}`,
        "--",
        "openspec",
        "init",
        "--tools",
        "none",
        "--force",
        ".",
      ];
    execFileSync(process.execPath, args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    errorExit(msg.openspecInitFailed(formatExecError(error)));
  }
  info(msg.openspecInitialized(OPENSPEC_CONFIG_PATH));
}

function removeLegacyOpsxScript(
  cwd: string,
  manifest: Manifest | null,
  msg: ReturnType<typeof getMessages>,
): void {
  if (manifest === null) return;

  const legacyScriptPath = join(cwd, LEGACY_OPSX_SCRIPT_INSTALL_PATH);
  if (!existsSync(legacyScriptPath)) return;

  const manifestKey = LEGACY_OPSX_SCRIPT_INSTALL_PATH;
  const recordedHash = manifest.files[manifestKey];
  if (recordedHash === undefined) return;

  const currentHash = computeFileHash(legacyScriptPath);
  if (currentHash !== recordedHash) {
    warn(msg.fileSkippedCustomized(manifestKey));
    return;
  }

  rmSync(legacyScriptPath, { force: true });
  const legacyScriptDir = dirname(legacyScriptPath);
  if (existsSync(legacyScriptDir) && readdirSync(legacyScriptDir).length === 0) {
    rmSync(legacyScriptDir, { recursive: true, force: true });
  }
  info(msg.fileRemoved(manifestKey));
}

export async function install(options: InstallOptions): Promise<void> {
  const msg = getMessages(options.lang);
  const targetPath = join(options.cwd, TARGET_DIR);
  const manifestPath = join(targetPath, MANIFEST_FILE);
  const openspecConfigPath = join(options.cwd, OPENSPEC_CONFIG_PATH);

  try {
    execSync("which tar", { stdio: "ignore" });
  } catch {
    errorExit(msg.tarNotFound);
  }

  const manifest = loadManifest(manifestPath);
  const isUpdate = manifest !== null;
  const workflowsExist = existsSync(join(targetPath, PIECE_DIR));
  const isRecoverablePartialInstall = !isUpdate && workflowsExist && !existsSync(openspecConfigPath);

  if (!isUpdate && workflowsExist && !options.force && !isRecoverablePartialInstall) {
    errorExit(msg.existsError("npx create-takt-sdd"));
  }
  if (isRecoverablePartialInstall) {
    warn(msg.recoveringPartialInstall);
  }

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
    const extractedLegacyOpsxPath = join(extractedDir, LEGACY_OPSX_SCRIPT_INSTALL_PATH);
    const hasLegacyOpsxScript = existsSync(extractedLegacyOpsxPath);

    if (!existsSync(extractedTakt)) {
      errorExit(msg.archiveError);
    }

    const resolvedLayout = options.layout === "auto" ? detectLayout() : options.layout;
    info(msg.layoutDetected(resolvedLayout));

    const sddPkgPath = join(extractedDir, "package.json");
    const sddDevDependencies: Record<string, string> = {};
    if (existsSync(sddPkgPath)) {
      const sddPkg = JSON.parse(readFileSync(sddPkgPath, "utf-8"));
      const deps = sddPkg.devDependencies ?? {};
      for (const [key, value] of Object.entries(deps)) {
        sddDevDependencies[key] = value as string;
      }
    }
    const openspecVersionSpec = sddDevDependencies[OPENSPEC_PACKAGE];
    const usesOfficialOpenSpec = openspecVersionSpec !== undefined;

    if (options.dryRun) {
      info(msg.dryRunHeader);
      const piecesSrcDry = join(extractedTakt, options.lang, PIECE_DIR);
      if (existsSync(piecesSrcDry)) {
        for (const file of collectFiles(piecesSrcDry, piecesSrcDry)) {
          console.log(msg.dryRunItem(join(TARGET_DIR, PIECE_DIR, file)));
        }
      }
      for (const facetType of FACET_TYPES) {
        const srcDir = join(extractedTakt, options.lang, srcFacetPath(facetType));
        if (existsSync(srcDir)) {
          const destPrefix = destFacetPath(facetType, resolvedLayout);
          for (const file of collectFiles(srcDir, srcDir)) {
            console.log(msg.dryRunItem(join(TARGET_DIR, destPrefix, file)));
          }
        }
      }
      if (usesOfficialOpenSpec) {
        console.log(msg.dryRunItem(OPENSPEC_CONFIG_PATH));
      } else if (hasLegacyOpsxScript) {
        console.log(msg.dryRunItem(LEGACY_OPSX_SCRIPT_INSTALL_PATH));
      }
      console.log(msg.dryRunItem(KIRO_STAGED_SCRIPT_INSTALL_PATH));
      console.log("");
      info(msg.dryRunSkipped);
      return;
    }

    info(isUpdate ? msg.updating : msg.installing);
    mkdirSync(targetPath, { recursive: true });

    const allFiles: Record<string, string> = {};

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

    if (!usesOfficialOpenSpec && hasLegacyOpsxScript) {
      const scriptFilesResult = syncRelativeFiles(
        extractedDir,
        options.cwd,
        [LEGACY_OPSX_SCRIPT_INSTALL_PATH],
        isUpdate ? manifest : null,
        msg,
        options.cwd,
      );
      Object.assign(allFiles, scriptFilesResult.files);
    }

    if (!usesOfficialOpenSpec && !hasLegacyOpsxScript) {
      errorExit(msg.requiredFileMissing(LEGACY_OPSX_SCRIPT_INSTALL_PATH));
    }

    const kiroStagedScriptResult = syncGeneratedFile(
      options.cwd,
      KIRO_STAGED_SCRIPT_INSTALL_PATH,
      KIRO_STAGED_SCRIPT_CONTENT,
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

    if (usesOfficialOpenSpec && !existsSync(openspecConfigPath)) {
      initializeOpenSpecProject(options.cwd, openspecVersionSpec, msg);
    }
    if (usesOfficialOpenSpec) {
      removeLegacyOpsxScript(options.cwd, manifest, msg);
    }

    const newManifest: Manifest = {
      version: version,
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
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
