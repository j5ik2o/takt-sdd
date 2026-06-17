/**
 * cli/eject-command.mjs
 *
 * EjectCommand: option parsing and target language resolution for
 * `takt-sdd eject`, plus copy planning, dry-run reporting, and apply.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getProjectConfigLanguage,
  resolveLanguage,
} from "./asset-resolution.mjs";
import { UsageError } from "./init-adapter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultPackageRoot = resolve(__dirname, "..");

const SUPPORTED_LANGS = Object.freeze(["en", "ja"]);
const SUPPORTED_LANG_SET = new Set(SUPPORTED_LANGS);
const EJECT_ASSET_SECTIONS = Object.freeze(["workflows", "facets"]);

function readPackageVersion(packageRoot) {
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf-8"));
  return pkg.version;
}

function stdoutLine(message) {
  process.stdout.write(`${message}\n`);
}

function isSupportedLang(value) {
  return SUPPORTED_LANG_SET.has(value);
}

function toPortablePath(relativePath) {
  return relativePath.replaceAll("\\", "/");
}

function assertSafeAssetRelativePath(relativePath) {
  const portablePath = toPortablePath(relativePath);
  const segments = portablePath.split("/");
  if (
    portablePath === "" ||
    isAbsolute(relativePath) ||
    segments.some((segment) => segment === "..")
  ) {
    throw new UsageError(`Unsafe bundled asset path: ${portablePath}`);
  }
}

function collectAssetFiles(baseDir) {
  if (!existsSync(baseDir)) return [];

  const assets = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const sourcePath = join(dir, entry.name);
      const fileRelativePath = relative(baseDir, sourcePath);
      assertSafeAssetRelativePath(fileRelativePath);

      if (entry.isDirectory()) {
        walk(sourcePath);
      } else if (entry.isFile()) {
        assets.push({
          sourcePath,
          fileRelativePath: toPortablePath(fileRelativePath),
        });
      }
    }
  };

  walk(baseDir);
  return assets.sort((left, right) =>
    left.fileRelativePath.localeCompare(right.fileRelativePath),
  );
}

function splitPortablePath(portablePath) {
  return portablePath.split("/").filter((segment) => segment.length > 0);
}

function hasSameContent(sourcePath, targetPath) {
  try {
    if (!statSync(targetPath).isFile()) return false;
    return readFileSync(sourcePath).equals(readFileSync(targetPath));
  } catch {
    return false;
  }
}

function classifyEjectAction(sourcePath, targetPath, force) {
  if (!existsSync(targetPath)) return "copy";
  if (hasSameContent(sourcePath, targetPath)) return "skip";
  return force ? "overwrite" : "collision";
}

function countActions(plan) {
  const counts = {
    copy: 0,
    skip: 0,
    collision: 0,
    overwrite: 0,
  };

  for (const item of plan.items) {
    counts[item.action] += 1;
  }

  return counts;
}

function itemsByAction(plan, action) {
  return plan.items.filter((item) => item.action === action);
}

function printActionSection(label, items) {
  stdoutLine(`${label}: ${items.length}`);
  for (const item of items) {
    stdoutLine(`  ${item.relativePath}`);
  }
}

function printPlan(plan, { dryRun }) {
  if (dryRun) {
    stdoutLine("Dry run: no files will be created or changed.");
  }

  stdoutLine("Eject plan:");
  printActionSection("copy", itemsByAction(plan, "copy"));
  printActionSection("skip (no-op)", itemsByAction(plan, "skip"));
  printActionSection("overwrite", itemsByAction(plan, "overwrite"));
  printActionSection("collision", itemsByAction(plan, "collision"));
}

function printCollisionFailure(plan, { dryRun }) {
  if (!dryRun) {
    stdoutLine("Eject aborted: collisions were found and no files were written.");
  }

  printActionSection("collision", plan.collisions);
  stdoutLine("Use --force to overwrite differing project-owned files.");
}

function applyEjectPlan(plan) {
  for (const item of plan.items) {
    if (item.action !== "copy" && item.action !== "overwrite") continue;

    mkdirSync(dirname(item.targetPath), { recursive: true });
    copyFileSync(item.sourcePath, item.targetPath);
  }
}

function printSuccessResult(plan, projectRoot, languages) {
  const counts = countActions(plan);

  stdoutLine("Eject completed.");
  stdoutLine(`copied: ${counts.copy}`);
  stdoutLine(`skipped: ${counts.skip}`);
  stdoutLine(`overwritten: ${counts.overwrite}`);
  stdoutLine("Ejected files are project-owned and will not be automatically updated.");
  stdoutLine("takt-sdd eject does not create or change .takt/config.yaml.");

  if (
    languages.length === 1 &&
    languages[0] === "ja" &&
    getProjectConfigLanguage(projectRoot) !== "ja"
  ) {
    stdoutLine(
      "For ja-only eject, set language: ja in .takt/config.yaml yourself if the project should use Japanese workflows by default.",
    );
  }
}

/**
 * Build help text for `takt-sdd eject`.
 *
 * @param {string} version
 * @returns {string}
 */
export function buildEjectHelpText(version) {
  return [
    `takt-sdd ${version}`,
    "",
    "Usage:",
    "  takt-sdd eject [--lang en|ja] [--all-languages] [--force] [--dry-run]",
    "",
    "Copy bundled workflows/facets into project-owned .takt files only when",
    "customization is needed.",
    "",
    "Options:",
    "  --lang en|ja        Eject assets for one language",
    "  --all-languages     Eject assets for both en and ja",
    "  --force             Allow overwriting changed target files",
    "  --dry-run           Show the planned work without writing files",
    "  --help, -h          Show this help message",
    "",
    "If no language option is provided, the resolved project language is used.",
  ].join("\n");
}

/**
 * Parse `takt-sdd eject` command arguments.
 *
 * @param {readonly string[]} argv
 * @returns {{
 *   readonly help: boolean,
 *   readonly languages: readonly ("en" | "ja")[] | "resolved",
 *   readonly force: boolean,
 *   readonly dryRun: boolean,
 * }}
 */
export function parseEjectArgs(argv) {
  let lang;
  let allLanguages = false;
  let force = false;
  let dryRun = false;

  const args = Array.from(argv);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      return {
        help: true,
        languages: "resolved",
        force: false,
        dryRun: false,
      };
    }

    if (arg === "--lang") {
      const value = args[++i];
      if (value === undefined || value.startsWith("-")) {
        throw new UsageError("--lang requires a value: --lang en|ja");
      }
      if (!isSupportedLang(value)) {
        throw new UsageError(`--lang must be one of: en, ja (received: ${value})`);
      }
      lang = value;
      continue;
    }

    if (arg === "--all-languages") {
      allLanguages = true;
      continue;
    }

    if (arg === "--force") {
      force = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new UsageError(`Unknown option: ${arg}`);
    }

    throw new UsageError(`Unexpected argument: ${arg}`);
  }

  if (lang !== undefined && allLanguages) {
    throw new UsageError("Cannot combine --lang with --all-languages");
  }

  return {
    help: false,
    languages: allLanguages ? SUPPORTED_LANGS : lang === undefined ? "resolved" : [lang],
    force,
    dryRun,
  };
}

/**
 * Resolve the target languages for eject. The default path uses the shared
 * read-only project language resolver.
 *
 * @param {{
 *   readonly languages: readonly ("en" | "ja")[] | "resolved",
 * }} options
 * @param {string} projectRoot
 * @returns {readonly ("en" | "ja")[]}
 */
export function resolveEjectTargetLanguages(options, projectRoot) {
  if (options.languages === "resolved") {
    return [resolveLanguage(projectRoot).lang];
  }

  return Array.from(options.languages);
}

/**
 * Build a read-only eject copy plan for bundled workflows/facets.
 *
 * @param {{ readonly projectRoot: string, readonly packageRoot: string }} ctx
 * @param {{
 *   readonly languages: readonly ("en" | "ja")[] | "resolved",
 *   readonly force: boolean,
 *   readonly dryRun: boolean,
 * }} options
 * @returns {{
 *   readonly items: readonly {
 *     readonly action: "copy" | "skip" | "collision" | "overwrite",
 *     readonly lang: "en" | "ja",
 *     readonly sourcePath: string,
 *     readonly targetPath: string,
 *     readonly relativePath: string,
 *   }[],
 *   readonly collisions: readonly {
 *     readonly action: "collision",
 *     readonly lang: "en" | "ja",
 *     readonly sourcePath: string,
 *     readonly targetPath: string,
 *     readonly relativePath: string,
 *   }[],
 * }}
 */
export function buildEjectPlan(ctx, options) {
  const items = [];
  const languages = resolveEjectTargetLanguages(options, ctx.projectRoot);

  for (const lang of languages) {
    for (const section of EJECT_ASSET_SECTIONS) {
      const sourceBase = join(ctx.packageRoot, ".takt", lang, section);
      const targetBase = join(ctx.projectRoot, ".takt", lang, section);

      for (const asset of collectAssetFiles(sourceBase)) {
        const relativePath = `.takt/${lang}/${section}/${asset.fileRelativePath}`;
        assertSafeAssetRelativePath(asset.fileRelativePath);

        const targetPath = join(
          targetBase,
          ...splitPortablePath(asset.fileRelativePath),
        );
        const action = classifyEjectAction(
          asset.sourcePath,
          targetPath,
          options.force,
        );

        items.push({
          action,
          lang,
          sourcePath: asset.sourcePath,
          targetPath,
          relativePath,
        });
      }
    }
  }

  items.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    items,
    collisions: items.filter((item) => item.action === "collision"),
  };
}

/**
 * Run `takt-sdd eject`.
 *
 * @param {readonly string[]} argv
 * @param {{ readonly projectRoot: string, readonly packageRoot: string }} ctx
 * @returns {Promise<number>}
 */
export async function runEject(argv, ctx) {
  const options = parseEjectArgs(argv);
  const packageRoot = ctx?.packageRoot ?? defaultPackageRoot;
  const projectRoot = ctx.projectRoot;

  if (options.help) {
    stdoutLine(buildEjectHelpText(readPackageVersion(packageRoot)));
    return 0;
  }

  const languages = resolveEjectTargetLanguages(options, projectRoot);
  const plan = buildEjectPlan(
    { projectRoot, packageRoot },
    { ...options, languages },
  );

  if (options.dryRun) {
    printPlan(plan, { dryRun: true });
    if (plan.collisions.length > 0) {
      printCollisionFailure(plan, { dryRun: true });
      return 1;
    }
    return 0;
  }

  if (plan.collisions.length > 0) {
    printCollisionFailure(plan, { dryRun: false });
    return 1;
  }

  applyEjectPlan(plan);
  printSuccessResult(plan, projectRoot, languages);
  return 0;
}
