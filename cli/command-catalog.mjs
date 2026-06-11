/**
 * cli/command-catalog.mjs
 *
 * Single source of truth for the public command catalog of the takt-sdd global CLI.
 * Defines SUPPORTED_WORKFLOWS, EXCLUDED_WORKFLOWS, classification predicates,
 * and help text generation derived from catalog constants.
 *
 * @module command-catalog
 */

/**
 * Statically-defined set of supported workflow names exposed by the global CLI.
 * - kiro (12 entries)
 * - opsx (5 entries)
 * Total: 17 entries.
 *
 * Invariant: no entry starts with "cc-sdd-" (requirement 5.7).
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
  // opsx workflows (5)
  "opsx-propose",
  "opsx-apply",
  "opsx-archive",
  "opsx-explore",
  "opsx-full",
]);

/**
 * Classification of workflow assets that are bundled in the package but NOT
 * exposed as global CLI commands.
 *
 * - legacy: cc-sdd-* workflows (10 entries) — rejected with an explicit error
 *   when invoked via the global CLI (requirement 5.4, 5.7).
 * - internal: AI quality gate workflows (3 entries) — used internally by other
 *   workflows, not intended for direct user invocation.
 *
 * Every .takt/{en,ja}/workflows/*.yaml basename must appear in either
 * SUPPORTED_WORKFLOWS or one of these excluded categories. Unclassified assets
 * cause drift tests to fail, forcing an explicit classification decision on review.
 *
 * Note: kiro-steering and kiro-steering-custom have no workflow assets — they are
 * staged surface, not bundled, so they belong in neither list.
 *
 * @type {Readonly<Record<"legacy" | "internal", readonly string[]>>}
 */
export const EXCLUDED_WORKFLOWS = Object.freeze({
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
  internal: Object.freeze([
    "kiro-ai-quality-gate",
    "kiro-discovery-ai-quality-gate",
    "kiro-spec-ai-quality-gate",
  ]),
});

const _supportedSet = new Set(SUPPORTED_WORKFLOWS);

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
 * Returns true if the given workflow name is a legacy cc-sdd-* workflow.
 * Legacy workflows are explicitly rejected by the global CLI (requirement 5.4, 5.7).
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isLegacyWorkflow(name) {
  return /^cc-sdd-/.test(name);
}

/**
 * Generates the help text for the global CLI, deriving all command names from
 * the catalog constants (no duplicated literals).
 *
 * Covers: init, kiro-* commands, opsx-* commands, run <supported-workflow>,
 * and global options (--cwd, --help, --version).
 *
 * @param {string} version - The package version string to include in the header.
 * @returns {string}
 */
export function buildHelpText(version) {
  const kiroCommands = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("kiro-"));
  const opsxCommands = SUPPORTED_WORKFLOWS.filter((name) => name.startsWith("opsx-"));

  const lines = [
    `takt-sdd ${version}`,
    "",
    "Usage:",
    "  takt-sdd [--cwd <dir>] <command> [options]",
    "",
    "Commands:",
    "  init <dir>           Initialize a project with bundled .takt assets",
    "",
    "  Kiro SDD workflows:",
    ...kiroCommands.map((name) => `    ${name}`),
    "",
    "  OpenSpec workflows:",
    ...opsxCommands.map((name) => `    ${name}`),
    "",
    "  run <supported-workflow>",
    "                       Run any supported workflow by name",
    "",
    "Global Options:",
    "  --cwd <dir>          Set the target project root directory",
    "  --help, -h           Show this help message",
    "  --version, -v        Show the installed package version",
    "",
    "Note: Legacy cc-sdd-* workflows are not supported by the global CLI.",
    "      Use the npm scripts in your project for cc-sdd compatibility.",
  ];

  return lines.join("\n");
}
