/**
 * cli/command-catalog.mjs
 *
 * Single source of truth for the public command catalog of the takt-sdd global CLI.
 * Defines SUPPORTED_WORKFLOWS, EXCLUDED_WORKFLOWS, RETIRED_WORKFLOWS,
 * classification predicates, and help text generation derived from catalog constants.
 *
 * @module command-catalog
 */

/**
 * Statically-defined set of supported workflow names exposed by the global CLI.
 * - kiro (12 entries)
 * Total: 12 entries.
 *
 * Invariant: no entry starts with "cc-sdd-" or "opsx-".
 *
 * @type {readonly string[]}
 */
export const SUPPORTED_WORKFLOWS = Object.freeze([
  // kiro workflows (12)
  "kiro-discovery",
  "kiro-spec-init",
  "kiro-spec-requirements",
  "kiro-spec-design",
  "kiro-spec-tasks",
  "kiro-spec-quick",
  "kiro-spec-batch",
  "kiro-spec-status",
  "kiro-impl",
  "kiro-validate-gap",
  "kiro-validate-design",
  "kiro-validate-impl",
]);

/**
 * Classification of workflow assets that are NOT exposed as global CLI commands
 * and are NOT bundled in the package (internal only).
 *
 * - internal: AI quality gate workflows (3 entries) — used internally by other
 *   workflows, not intended for direct user invocation.
 *
 * Every .takt/{en,ja}/workflows/*.yaml basename must appear in either
 * SUPPORTED_WORKFLOWS or EXCLUDED_WORKFLOWS.internal. Unclassified assets
 * cause drift tests to fail, forcing an explicit classification decision on review.
 *
 * Note: kiro-steering and kiro-steering-custom have no workflow assets — they are
 * staged surface, not bundled, so they belong in neither list.
 *
 * @type {Readonly<Record<"internal", readonly string[]>>}
 */
export const EXCLUDED_WORKFLOWS = Object.freeze({
  internal: Object.freeze([
    "kiro-ai-quality-gate",
    "kiro-discovery-ai-quality-gate",
    "kiro-spec-ai-quality-gate",
  ]),
});

/**
 * Retired workflow names, grouped by retirement reason.
 *
 * - legacy: cc-sdd-* workflows (10 entries) — retired in v2.0.0; rejected with
 *   an explicit error when invoked via the global CLI.
 * - opsx: opsx-* workflows (5 entries) — retired; will be re-provided in a
 *   future release.
 *
 * These workflows are NOT bundled in the package and must not appear in
 * .takt/{en,ja}/workflows/.
 *
 * @type {Readonly<Record<"legacy" | "opsx", readonly string[]>>}
 */
export const RETIRED_WORKFLOWS = Object.freeze({
  legacy: Object.freeze([
    "cc-sdd-design",
    "cc-sdd-full",
    "cc-sdd-impl",
    "cc-sdd-requirements",
    "cc-sdd-steering",
    "cc-sdd-steering-custom",
    "cc-sdd-tasks",
    "cc-sdd-validate-design",
    "cc-sdd-validate-gap",
    "cc-sdd-validate-impl",
  ]),
  opsx: Object.freeze([
    "opsx-propose",
    "opsx-apply",
    "opsx-archive",
    "opsx-explore",
    "opsx-full",
  ]),
});

const _supportedSet = new Set(SUPPORTED_WORKFLOWS);
const _retiredLegacySet = new Set(RETIRED_WORKFLOWS.legacy);
const _retiredOpsxSet = new Set(RETIRED_WORKFLOWS.opsx);

/**
 * Returns true if the given workflow name is in the public supported catalog.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSupportedWorkflow(name) {
  return _supportedSet.has(name);
}

/**
 * Returns the retirement category of the given workflow name, or undefined if
 * the workflow is not retired.
 *
 * - "legacy": cc-sdd-* workflows retired in v2.0.0 (no future re-provision)
 * - "opsx": opsx-* workflows retired, will be re-provided in a future release
 * - undefined: not a retired workflow
 *
 * @param {string} name
 * @returns {"legacy" | "opsx" | undefined}
 */
export function isRetiredWorkflow(name) {
  if (_retiredLegacySet.has(name)) return "legacy";
  if (_retiredOpsxSet.has(name)) return "opsx";
  return undefined;
}

/**
 * Generates the help text for the global CLI, deriving all command names from
 * the catalog constants (no duplicated literals).
 *
 * Covers: normal package-bundled workflow execution, eject customization,
 * deprecated init guidance, and global options (--cwd, --help, --version).
 *
 * @param {string} version - The package version string to include in the header.
 * @returns {string}
 */
export function buildHelpText(version) {
  const kiroCommands = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("kiro-"));

  const lines = [
    `takt-sdd ${version}`,
    "",
    "Usage:",
    "  takt-sdd [--cwd <dir>] <command> [options]",
    "",
    "Commands:",
    "  Normal execution:",
    "    Kiro SDD workflows:",
    ...kiroCommands.map((name) => `      ${name}`),
    "",
    "    run <supported-workflow>",
    "                       Run any supported workflow by name",
    "",
    "    Run workflows directly from bundled workflows/facets in the installed package.",
    "    Project-local .takt copies are not required for ordinary use.",
    "",
    "  Customization:",
    "    eject [--lang en|ja] [--all-languages] [--force] [--dry-run]",
    "                       Copy bundled workflows/facets for project-owned customization",
    "                       Use `takt-sdd eject --help` for copy safety options.",
    "",
    "  Retired commands:",
    "    init [--help]",
    "                       Deprecated guidance-only command; no asset copy, manifest,",
    "                       script, or package.json writes. Use `takt-sdd init --help`.",
    "",
    "Global Options:",
    "  --cwd <dir>          Set the target project root directory",
    "  --help, -h           Show this help message",
    "  --version, -v        Show the installed package version",
    "",
    "Note: Legacy cc-sdd and opsx workflow families have been retired in v2.0.0.",
    "      Run `takt-sdd --help` for the current command surface.",
  ];

  return lines.join("\n");
}
