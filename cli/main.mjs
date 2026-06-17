/**
 * cli/main.mjs
 *
 * CliMain — global argument parsing, command classification, dispatch, and exit code conversion.
 *
 * Exports:
 *   - main(argv) → Promise<number>   — entry point; returns process exit code
 *
 * Command classification priority (design):
 *   init → run <workflow> (normalised to direct command) → retired rejection →
 *   catalog match → unknown command guidance
 *
 * Typed errors (UsageError / InitError from init-adapter, PreflightError from
 * workflow-runner) are caught here and written to stderr → exit 1.
 *
 * Setup error: if installer/dist/install.js is absent (fresh checkout, not yet
 * built), an explicit friendly error advising `npm run build:installer` is shown
 * instead of leaking ERR_MODULE_NOT_FOUND.
 *
 * No args → print help, return 1 (same as unknown command).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  isSupportedWorkflow,
  isRetiredWorkflow,
  buildHelpText,
} from "./command-catalog.mjs";

import {
  UsageError,
  InitError,
  buildInitHelpText,
  parseInitArgs,
  runInit,
} from "./init-adapter.mjs";

import {
  PreflightError,
  runWorkflow,
} from "./workflow-runner.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// packageRoot: the directory that contains cli/ (i.e. the repo/package root)
const packageRoot = resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the package version from <packageRoot>/package.json.
 * @returns {string}
 */
function readPackageVersion() {
  const pkgPath = join(packageRoot, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

/**
 * Write a line to stderr.
 * @param {string} msg
 */
function stderrLine(msg) {
  process.stderr.write(msg + "\n");
}

/**
 * Write a line to stdout.
 * @param {string} msg
 */
function stdoutLine(msg) {
  process.stdout.write(msg + "\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Global option parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse global options from argv.
 * Consumes: --cwd <dir>, --help / -h, --version / -v
 * Returns the remaining argv (subcommand + its args) and parsed global options.
 *
 * @param {readonly string[]} argv
 * @returns {{ cwd: string | undefined, help: boolean, version: boolean, rest: string[] }}
 */
function parseGlobalOptions(argv) {
  let cwd;
  let help = false;
  let version = false;
  const rest = [];

  const args = Array.from(argv);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--cwd") {
      const val = args[++i];
      if (val === undefined || val.startsWith("-")) {
        // --cwd requires a value
        throw new UsageError("--cwd requires a directory argument: --cwd <dir>");
      }
      cwd = val;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
      i++;
    } else if (arg === "--version" || arg === "-v") {
      version = true;
      i++;
    } else {
      // First non-global token: remainder is subcommand + its args
      rest.push(...args.slice(i));
      break;
    }
  }

  return { cwd, help, version, rest };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compiled install core availability check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check that installer/dist/install.js exists.
 * Throws a friendly UsageError if it is absent (fresh checkout, not yet built).
 */
function checkInstallerBuilt() {
  const installJsPath = join(packageRoot, "installer", "dist", "install.js");
  if (!existsSync(installJsPath)) {
    throw new UsageError(
      "The compiled install core is missing (installer/dist/install.js not found).\n" +
        "Run `npm run build:installer` to build it before using this command.",
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main dispatch function for the takt-sdd global CLI.
 *
 * @param {readonly string[]} argv - argv slice (process.argv.slice(2) from bin entry)
 * @returns {Promise<number>} exit code
 */
export async function main(argv) {
  let globalOpts;
  try {
    globalOpts = parseGlobalOptions(argv);
  } catch (err) {
    if (err instanceof UsageError) {
      stderrLine(`Error: ${err.message}`);
      return 1;
    }
    throw err;
  }

  const { cwd, help, version, rest } = globalOpts;

  // Build CliContext
  const projectRoot = resolve(cwd ?? process.cwd());
  /** @type {{ projectRoot: string, packageRoot: string }} */
  const ctx = { projectRoot, packageRoot };

  // --help / -h
  if (help) {
    const ver = readPackageVersion();
    stdoutLine(buildHelpText(ver));
    return 0;
  }

  // --version / -v
  if (version) {
    const ver = readPackageVersion();
    stdoutLine(ver);
    return 0;
  }

  // No command → print help, return 1
  if (rest.length === 0) {
    const ver = readPackageVersion();
    stdoutLine(buildHelpText(ver));
    return 1;
  }

  const [command, ...commandArgs] = rest;

  try {
    // ── init ──────────────────────────────────────────────────────────────────
    if (command === "init") {
      if (commandArgs.includes("--help") || commandArgs.includes("-h")) {
        const ver = readPackageVersion();
        stdoutLine(buildInitHelpText(ver));
        return 0;
      }
      checkInstallerBuilt();
      const initOpts = parseInitArgs(commandArgs);
      const absoluteTargetDir = resolve(projectRoot, initOpts.targetDir);
      return await runInit(
        { ...initOpts, targetDir: absoluteTargetDir },
        ctx,
      );
    }

    // ── run <workflow> ────────────────────────────────────────────────────────
    // Normalise "run <workflow> [args]" to the same dispatch path as direct command.
    let effectiveCommand = command;
    let effectiveArgs = commandArgs;

    if (command === "run") {
      if (commandArgs.length === 0) {
        throw new UsageError(
          "'run' requires a workflow name. Usage: takt-sdd run <workflow>",
        );
      }
      [effectiveCommand, ...effectiveArgs] = commandArgs;
    }

    // ── retired workflow rejection ────────────────────────────────────────────
    const retiredKind = isRetiredWorkflow(effectiveCommand);
    if (retiredKind === "legacy") {
      stderrLine(
        `Error: \`cc-sdd-*\` workflows were retired in v2.0.0 and are no longer available.\n` +
          `Use \`takt-sdd --help\` to see the current kiro-* command surface.`,
      );
      return 1;
    }
    if (retiredKind === "opsx") {
      stderrLine(
        `Error: \`opsx-*\` workflows have been retired and will be re-provided in a future release.\n` +
          `Use \`takt-sdd --help\` to see the current kiro-* command surface.`,
      );
      return 1;
    }

    // ── catalog match → dispatch to workflow runner ───────────────────────────
    if (isSupportedWorkflow(effectiveCommand)) {
      checkInstallerBuilt();
      return await runWorkflow(effectiveCommand, effectiveArgs, ctx);
    }

    // ── unknown command ───────────────────────────────────────────────────────
    stderrLine(
      `Error: unknown command '${effectiveCommand}'. Run \`takt-sdd --help\` to see available commands.`,
    );
    return 1;
  } catch (err) {
    if (err instanceof UsageError) {
      stderrLine(`Error: ${err.message}`);
      return 1;
    }
    if (err instanceof InitError) {
      stderrLine(`Error: ${err.message}`);
      return 1;
    }
    if (err instanceof PreflightError) {
      stderrLine(`Error: ${err.message}`);
      return 1;
    }
    // Unexpected error — show message (not full stack for typed errors)
    stderrLine(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
