/**
 * cli/init-adapter.mjs
 *
 * RetiredInitCommand: no-write migration guidance for `takt-sdd init`.
 *
 * The old init command copied bundled assets into projects and delegated to the
 * installer core. The command is now intentionally retired: help succeeds, every
 * non-help invocation returns guidance, and no project files are touched.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, "..");

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

export class InitError extends Error {
  constructor(message) {
    super(message);
    this.name = "InitError";
  }
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf-8"));
  return pkg.version;
}

function stdoutLine(message) {
  process.stdout.write(`${message}\n`);
}

function stderrLine(message) {
  process.stderr.write(`${message}\n`);
}

export function buildInitHelpText(version) {
  return [
    `takt-sdd ${version}`,
    "",
    "Deprecated command:",
    "  takt-sdd init",
    "",
    "`takt-sdd init` no longer copies .takt assets, writes a manifest, creates",
    "scripts/kiro-staged.mjs, or edits package.json.",
    "",
    "Current usage:",
    "  takt-sdd kiro-*        Run workflows directly from bundled workflows/facets",
    "                         in the installed package",
    "  takt-sdd eject         Copy bundled workflows/facets only when you need",
    "                         project-owned customization",
    "",
    "Behavior:",
    "  takt-sdd init --help   Show this deprecated help and exit 0",
    "  takt-sdd init -h       Show this deprecated help and exit 0",
    "  takt-sdd init ...      Print retired guidance and exit 1 without writes",
  ].join("\n");
}

export function buildInitRetiredGuidance() {
  return [
    "`takt-sdd init` is retired and did not write any project files.",
    "",
    "Bundled workflows/facets are used directly from the installed package during",
    "normal `takt-sdd kiro-*` execution. Project-local copies are no longer needed",
    "for ordinary use.",
    "",
    "If you need to customize workflows or facets, run `takt-sdd eject` and edit",
    "the ejected project-owned files.",
  ].join("\n");
}

export function runRetiredInit(argv) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    stdoutLine(buildInitHelpText(readPackageVersion()));
    return 0;
  }

  stderrLine(buildInitRetiredGuidance());
  return 1;
}

export function parseInitArgs(argv) {
  return { retired: true, argv: Array.from(argv) };
}

export function resolveLanguagePreference() {
  return { lang: "en", source: "default" };
}

export async function runInit() {
  return runRetiredInit([]);
}
