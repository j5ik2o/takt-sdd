/**
 * cli/init-adapter.mjs
 *
 * InitAdapter: packaged asset source init command for takt-sdd global CLI.
 *
 * Exports:
 *   - UsageError         — thrown for invalid CLI arguments (exit code 1)
 *   - InitError          — thrown for init runtime errors (exit code 1)
 *   - parseInitArgs(argv) — parse init sub-command argv
 *   - resolveLanguagePreference(explicitLang, targetDir) — language priority resolution
 *   - runInit(options, ctx, deps) — run init; deps is a test seam for core injection
 *
 * No network imports (node:http / node:https) in this module.
 * All install policy is delegated to installer/dist/install.js (installFromSource).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Typed error classes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown for invalid user input (missing required arg, unsupported flag, etc.).
 * CliMain maps this to exit code 1 with a usage message.
 */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

/**
 * Thrown for init runtime errors (target dir not found, core errors, etc.).
 * CliMain maps this to exit code 1.
 */
export class InitError extends Error {
  constructor(message) {
    super(message);
    this.name = "InitError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// parseInitArgs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse the argv slice for the `init` sub-command.
 *
 * Accepted: <dir> (required positional), --lang en|ja, --force, --dry-run
 * Rejected: --tag (explicit UsageError), --layout (not exposed)
 * Unknown flags produce UsageError.
 *
 * @param {readonly string[]} argv - argv slice after "init" has been consumed
 * @returns {{ targetDir: string, lang: "en" | "ja" | undefined, force: boolean, dryRun: boolean }}
 */
export function parseInitArgs(argv) {
  let targetDir;
  let lang;
  let force = false;
  let dryRun = false;

  const args = Array.from(argv);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--tag") {
      throw new UsageError(
        "--tag is not supported by global init (packaged assets are the canonical source)",
      );
    }
    if (arg === "--lang") {
      const val = args[++i];
      if (val !== "en" && val !== "ja") {
        throw new UsageError(
          `--lang must be 'en' or 'ja', got: ${JSON.stringify(val)}`,
        );
      }
      lang = val;
      i++;
      continue;
    }
    if (arg === "--force") {
      force = true;
      i++;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      i++;
      continue;
    }
    if (arg === "--layout") {
      throw new UsageError(
        "--layout is not supported by takt-sdd init (layout is fixed to 'modern')",
      );
    }
    if (arg.startsWith("-")) {
      throw new UsageError(`Unknown option: ${arg}`);
    }
    // positional
    if (targetDir !== undefined) {
      throw new UsageError(`Unexpected positional argument: ${arg}`);
    }
    targetDir = arg;
    i++;
  }

  if (targetDir === undefined) {
    throw new UsageError(
      "Missing required argument: <dir>\n  Usage: takt-sdd init <dir> [--lang en|ja] [--force] [--dry-run]",
    );
  }

  return { targetDir, lang, force, dryRun };
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveLanguagePreference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the language to install.
 *
 * Priority (descending):
 *   1. explicitLang ("en"|"ja") — from --lang flag
 *   2. .takt/config.yaml `language:` key (read-only, regex per design)
 *   3. .takt/.manifest.json `lang` field
 *   4. default: "en"
 *
 * config.yaml is NEVER created or modified by this function.
 * The regex for config.yaml matches: ^language:\s*(en|ja)\s*$  (per line)
 *
 * @param {"en" | "ja" | undefined} explicitLang
 * @param {string} targetDir - absolute path to the target project directory
 * @returns {{ lang: "en" | "ja", source: "flag" | "config" | "manifest" | "default" }}
 */
export function resolveLanguagePreference(explicitLang, targetDir) {
  // Priority 1: explicit --lang flag
  if (explicitLang === "en" || explicitLang === "ja") {
    return { lang: explicitLang, source: "flag" };
  }

  // Priority 2: .takt/config.yaml language: line
  const configPath = join(targetDir, ".takt", "config.yaml");
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      for (const line of content.split("\n")) {
        const match = line.match(/^language:\s*(en|ja)\s*$/);
        if (match) {
          return { lang: /** @type {"en"|"ja"} */ (match[1]), source: "config" };
        }
      }
    } catch {
      // unreadable config — fall through
    }
  }

  // Priority 3: .takt/.manifest.json lang field
  const manifestPath = join(targetDir, ".takt", ".manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      if (manifest.lang === "en" || manifest.lang === "ja") {
        return { lang: manifest.lang, source: "manifest" };
      }
    } catch {
      // malformed manifest — fall through
    }
  }

  // Priority 4: default
  return { lang: "en", source: "default" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Real installFromSource (loaded lazily to allow test injection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the real installFromSource from compiled install core.
 * @returns {Promise<Function>}
 */
async function loadRealInstallFromSource() {
  const installJsPath = resolve(__dirname, "..", "installer", "dist", "install.js");
  const mod = await import(installJsPath);
  return mod.installFromSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// runInit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the init command.
 *
 * @param {object} options
 * @param {string} options.targetDir   - Absolute path to the target project directory
 * @param {"en" | "ja" | undefined} options.lang - Explicit --lang value (undefined if not set)
 * @param {boolean} options.force
 * @param {boolean} options.dryRun
 *
 * @param {object} ctx
 * @param {string} ctx.projectRoot   - (unused by init; kept for CliContext compatibility)
 * @param {string} ctx.packageRoot   - Root of the global package (where .takt/en|ja/ lives)
 *
 * @param {object} [deps]
 * @param {Function} [deps.installFromSource]
 *   Test seam: inject a fake installFromSource to avoid real file I/O in unit tests.
 *   Default is the real compiled core (installer/dist/install.js).
 *   Pattern mirrors WorkflowRunner's documented spawnImpl injection point.
 *
 * @returns {Promise<number>} exit code (0 on success)
 */
export async function runInit(options, ctx, deps) {
  const { targetDir, lang: explicitLang, force, dryRun } = options;
  const { packageRoot } = ctx;

  // Precondition: targetDir must exist
  if (!existsSync(targetDir)) {
    throw new InitError(`Target directory does not exist: ${targetDir}`);
  }

  // Resolve language
  const { lang, source: langSource } = resolveLanguagePreference(explicitLang, targetDir);

  // Warn if existing config.yaml declares a different language (read-only check)
  const configPath = join(targetDir, ".takt", "config.yaml");
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, "utf-8");
      let configLang;
      for (const line of configContent.split("\n")) {
        const match = line.match(/^language:\s*(en|ja)\s*$/);
        if (match) {
          configLang = match[1];
          break;
        }
      }
      if (configLang !== undefined && configLang !== lang) {
        console.warn(
          `[takt-sdd] Warning: .takt/config.yaml declares language: ${configLang}, ` +
            `but installing with lang=${lang} ` +
            `(source: ${langSource}). config.yaml will not be modified.`,
        );
      }
    } catch {
      // Unreadable config — skip warning
    }
  }

  // Resolve installFromSource: test seam first, then real compiled core
  let installFromSource = deps?.installFromSource;
  if (!installFromSource) {
    installFromSource = await loadRealInstallFromSource();
  }

  // Read package version from packageRoot
  const pkgJson = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf-8"),
  );
  const version = pkgJson.version;

  // Call shared install core (packaged source — no network/GitHub code path here)
  await installFromSource(
    { lang, force, dryRun, layout: "modern", cwd: targetDir },
    { rootDir: packageRoot, version },
  );

  // Post-success guidance: instruct user to run npm install (never auto-execute)
  if (!dryRun) {
    console.log(
      "\nNext step: run `npm install` in your project to install the required dependencies.",
    );
  }

  return 0;
}
