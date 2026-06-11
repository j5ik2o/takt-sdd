/**
 * cli/workflow-runner.mjs
 *
 * WorkflowRunner — preflight, strict workflow resolution, packageRoot takt resolution,
 * argument assembly, and spawn.
 *
 * Exports:
 *   - PreflightError         — thrown when preflight fails (exit code 1)
 *   - preflight(ctx, workflowName) → PreflightResult — validates environment before spawn
 *   - resolveWorkflowPathStrict(projectRoot, lang, name) → string | undefined
 *   - resolveTaktBin(packageRoot) → { nodeExec, taktCliJs }
 *   - buildWorkflowArgs(workflowPath, forwarded) → string[]
 *   - runWorkflow(workflowName, forwarded, ctx, spawnImpl?) → Promise<number>
 *
 * Key invariants:
 *   - preflight failures NEVER reach spawn
 *   - takt binary is always resolved from packageRoot (not PATH, not projectRoot, not scripts/takt.sh)
 *   - --pipeline and --skip-git are always present in spawn args
 *   - No language fallback (ja config → only ja assets are tried)
 *   - config.yaml absence is not an error
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { spawn as nodeSpawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────────────────────
// Typed error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown by preflight when the project environment is not ready for workflow execution.
 * CliMain maps this to exit code 1 with the message written to stderr.
 */
export class PreflightError extends Error {
  constructor(message) {
    super(message);
    this.name = "PreflightError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveWorkflowPathStrict
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try to resolve a workflow asset using strict 2-candidate strategy:
 *   1. <projectRoot>/.takt/workflows/<name>.yaml  (language-neutral root slot)
 *   2. <projectRoot>/.takt/<lang>/workflows/<name>.yaml  (language-specific slot)
 *
 * No language fallback: if lang is "ja", only ja-slot and root-slot are tried.
 * An "en" asset is NEVER returned for a "ja" resolution request.
 *
 * @param {string} projectRoot
 * @param {"en" | "ja"} lang
 * @param {string} name
 * @returns {string | undefined}
 */
export function resolveWorkflowPathStrict(projectRoot, lang, name) {
  const candidate1 = join(projectRoot, ".takt", "workflows", `${name}.yaml`);
  if (existsSync(candidate1)) return candidate1;

  const candidate2 = join(projectRoot, ".takt", lang, "workflows", `${name}.yaml`);
  if (existsSync(candidate2)) return candidate2;

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveTaktBin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the takt CLI script deterministically from the global package's own
 * node_modules (packageRoot side). Uses createRequire so we never touch PATH,
 * projectRoot, or scripts/takt.sh.
 *
 * @param {string} packageRoot - Absolute path to the root of the takt-sdd package
 * @returns {{ nodeExec: string, taktCliJs: string }}
 */
export function resolveTaktBin(packageRoot) {
  const req = createRequire(join(packageRoot, "package.json"));
  const taktPkgPath = req.resolve("takt/package.json");
  const taktPkgDir = dirname(taktPkgPath);
  const taktPkg = JSON.parse(readFileSync(taktPkgPath, "utf-8"));

  // Prefer the "takt-cli" bin entry (points to dist/app/cli/index.js)
  const binField = taktPkg.bin;
  if (!binField) {
    throw new Error("takt package.json has no bin field");
  }

  const cliRelPath = binField["takt-cli"] || binField["takt"];
  if (!cliRelPath) {
    throw new Error("takt package.json has no 'takt-cli' or 'takt' bin entry");
  }

  const taktCliJs = resolve(taktPkgDir, cliRelPath);
  return { nodeExec: process.execPath, taktCliJs };
}

// ─────────────────────────────────────────────────────────────────────────────
// buildWorkflowArgs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the argument list for takt invocation.
 *
 * Always includes: --pipeline --skip-git -w <workflowPath>
 * Flags (args starting with - or --) are forwarded in order.
 * Positional args (not starting with -) are joined with space and appended as a
 * single -t value. If there are no positionals, -t is omitted.
 *
 * @param {string} workflowPath - Absolute path to the workflow YAML
 * @param {readonly string[]} forwarded - Args passed after the workflow name
 * @returns {string[]}
 */
export function buildWorkflowArgs(workflowPath, forwarded) {
  const flags = [];
  const positionals = [];

  for (const arg of forwarded) {
    if (arg.startsWith("-")) {
      flags.push(arg);
    } else {
      positionals.push(arg);
    }
  }

  const args = ["--pipeline", "--skip-git", "-w", workflowPath, ...flags];

  if (positionals.length > 0) {
    args.push("-t", positionals.join(" "));
  }

  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: read language from config.yaml (read-only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try to read language preference from .takt/config.yaml.
 * Returns null if file is absent, unreadable, or has no matching line.
 * config.yaml absence is never an error.
 *
 * @param {string} projectRoot
 * @returns {"en" | "ja" | null}
 */
function readConfigYamlLang(projectRoot) {
  const configPath = join(projectRoot, ".takt", "config.yaml");
  if (!existsSync(configPath)) return null;
  try {
    const content = readFileSync(configPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^language:\s*(en|ja)\s*$/);
      if (match) return /** @type {"en"|"ja"} */ (match[1]);
    }
  } catch {
    // unreadable — fall through
  }
  return null;
}

/**
 * Read language from .takt/.manifest.json.
 * Returns null if absent, unreadable, or lang is not "en"/"ja".
 *
 * @param {string} projectRoot
 * @returns {"en" | "ja" | null}
 */
function readManifestLang(projectRoot) {
  const manifestPath = join(projectRoot, ".takt", ".manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    if (manifest.lang === "en" || manifest.lang === "ja") return manifest.lang;
  } catch {
    // malformed — fall through
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// preflight
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all preflight checks before spawning takt.
 * Throws PreflightError on first failure.
 *
 * Steps (per design):
 *   1. Determine language: config.yaml (read-only) > manifest.lang > "en"
 *   2. Strict workflow resolution: if not resolvable → init guidance
 *   3. opsx-* workflows: check for openspec binary in projectRoot/node_modules/.bin
 *   4. project package.json SDD devDependencies: report missing binaries
 *
 * Precondition: workflowName is already catalog-validated (CliMain's responsibility).
 *
 * @param {{ projectRoot: string, packageRoot: string }} ctx
 * @param {string} workflowName
 * @returns {{ lang: "en" | "ja", workflowPath: string, missingDependencies: string[] }}
 */
export function preflight(ctx, workflowName) {
  const { projectRoot } = ctx;

  // Step 1: Determine language
  const configLang = readConfigYamlLang(projectRoot);
  const manifestLang = readManifestLang(projectRoot);
  const lang = configLang ?? manifestLang ?? "en";

  // Step 2: Strict workflow resolution
  const workflowPath = resolveWorkflowPathStrict(projectRoot, lang, workflowName);
  if (workflowPath === undefined) {
    throw new PreflightError(
      `Workflow '${workflowName}' could not be resolved for language '${lang}'. ` +
        `Run \`takt-sdd init .\` to initialize or update the project assets.`,
    );
  }

  // Step 3: opsx-* workflows require openspec binary
  if (workflowName.startsWith("opsx-")) {
    const openspecBin = join(projectRoot, "node_modules", ".bin", "openspec");
    if (!existsSync(openspecBin)) {
      throw new PreflightError(
        `OpenSpec binary not found at '${openspecBin}'. ` +
          `Run \`npm install\` in your project to install the required dependencies.`,
      );
    }
  }

  // Step 4: Check SDD devDependencies declared in project package.json
  const missingDependencies = [];
  const pkgJsonPath = join(projectRoot, "package.json");
  if (existsSync(pkgJsonPath)) {
    let projectPkg = null;
    try {
      projectPkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    } catch {
      // malformed — skip check
    }
    if (projectPkg !== null) {
      const allDeps = {
        ...projectPkg.devDependencies,
        ...projectPkg.dependencies,
      };
      // Binary name mapping: package → binary
      const sddBinMap = {
        takt: "takt",
        "@fission-ai/openspec": "openspec",
        "cc-sdd": "cc-sdd",
      };
      for (const [pkg, bin] of Object.entries(sddBinMap)) {
        if (allDeps[pkg] !== undefined) {
          const binPath = join(projectRoot, "node_modules", ".bin", bin);
          if (!existsSync(binPath)) {
            missingDependencies.push(bin);
          }
        }
      }
    }
  }

  if (missingDependencies.length > 0) {
    throw new PreflightError(
      `Missing project-local binaries: ${missingDependencies.join(", ")}. ` +
        `Run \`npm install\` in your project to install the required dependencies.`,
    );
  }

  return { lang, workflowPath, missingDependencies: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// runWorkflow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a workflow: preflight → resolve takt binary → build args → spawn.
 *
 * @param {string} workflowName - Catalog-validated workflow name
 * @param {readonly string[]} forwarded - Args from CLI after the workflow name
 * @param {{ projectRoot: string, packageRoot: string }} ctx
 * @param {Function} [spawnImpl] - Test injection point. Defaults to node:child_process spawn.
 *   Signature: (nodeExec, args, opts) → EventEmitter with "close" event
 * @returns {Promise<number>} Resolved with takt's exit code
 */
export async function runWorkflow(workflowName, forwarded, ctx, spawnImpl) {
  // Run preflight — throws PreflightError if environment is not ready
  const { workflowPath } = preflight(ctx, workflowName);

  // Resolve takt binary from packageRoot (never from PATH or projectRoot)
  const { nodeExec, taktCliJs } = resolveTaktBin(ctx.packageRoot);

  // Build argument list
  const args = buildWorkflowArgs(workflowPath, forwarded);

  // Spawn takt
  const spawnFn = spawnImpl ?? nodeSpawn;
  const child = spawnFn(nodeExec, [taktCliJs, ...args], {
    cwd: ctx.projectRoot,
    stdio: "inherit",
  });

  return new Promise((resolve) => {
    child.on("close", (code, signal) => {
      if (signal !== null) {
        // Signal termination → non-zero exit
        resolve(1);
      } else {
        resolve(code ?? 1);
      }
    });
  });
}
