/**
 * cli/eject-command.mjs
 *
 * EjectCommand: option parsing and target language resolution for
 * `takt-sdd eject`.
 *
 * This task intentionally stops before copy planning or file writes.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveLanguage } from "./asset-resolution.mjs";
import { UsageError } from "./init-adapter.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const defaultPackageRoot = resolve(__dirname, "..");

const SUPPORTED_LANGS = Object.freeze(["en", "ja"]);
const SUPPORTED_LANG_SET = new Set(SUPPORTED_LANGS);

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
 * Placeholder command runner for help, validation, and target language
 * resolution. Copy planning and writes are implemented in later tasks.
 *
 * @param {readonly string[]} argv
 * @param {{ readonly projectRoot: string, readonly packageRoot: string }} ctx
 * @returns {Promise<number>}
 */
export async function runEject(argv, ctx) {
  const options = parseEjectArgs(argv);
  const packageRoot = ctx?.packageRoot ?? defaultPackageRoot;

  if (options.help) {
    stdoutLine(buildEjectHelpText(readPackageVersion(packageRoot)));
    return 0;
  }

  resolveEjectTargetLanguages(options, ctx.projectRoot);
  return 0;
}
