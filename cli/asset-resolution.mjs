/**
 * cli/asset-resolution.mjs
 *
 * AssetResolution — read-only language and workflow asset source resolution.
 *
 * Exports:
 *   - resolveLanguage(projectRoot) -> { lang, source }
 *   - getProjectConfigLanguage(projectRoot) -> "en" | "ja" | undefined
 *   - resolveWorkflowAsset({ projectRoot, packageRoot, lang, workflowName })
 *       -> { workflowPath, kind, lang } | undefined
 *
 * Key invariants:
 *   - All filesystem access is read-only.
 *   - Language priority is config > manifest > default en.
 *   - Workflow priority is project root > project language > package language.
 *   - A ja resolution request never falls back to en assets.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPPORTED_LANGS = new Set(["en", "ja"]);

function toSupportedLang(value) {
  if (value === "en" || value === "ja") return value;
  return undefined;
}

function readUtf8IfExists(filePath) {
  if (!existsSync(filePath)) return undefined;
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Read only .takt/config.yaml language. Manifest fallback is intentionally not
 * used here because eject guidance needs config-specific state.
 *
 * @param {string} projectRoot
 * @returns {"en" | "ja" | undefined}
 */
export function getProjectConfigLanguage(projectRoot) {
  const content = readUtf8IfExists(join(projectRoot, ".takt", "config.yaml"));
  if (content === undefined) return undefined;

  for (const line of content.split("\n")) {
    const match = line.match(/^\s*language:\s*["']?(en|ja)["']?\s*(?:#.*)?$/);
    if (match) return match[1];
  }

  return undefined;
}

function getManifestLanguage(projectRoot) {
  const content = readUtf8IfExists(join(projectRoot, ".takt", ".manifest.json"));
  if (content === undefined) return undefined;

  try {
    const manifest = JSON.parse(content);
    return toSupportedLang(manifest.lang);
  } catch {
    return undefined;
  }
}

/**
 * Resolve project language with read-only precedence:
 * .takt/config.yaml language > .takt/.manifest.json lang > en.
 *
 * @param {string} projectRoot
 * @returns {{ lang: "en" | "ja", source: "config" | "manifest" | "default" }}
 */
export function resolveLanguage(projectRoot) {
  const configLang = getProjectConfigLanguage(projectRoot);
  if (configLang !== undefined) {
    return { lang: configLang, source: "config" };
  }

  const manifestLang = getManifestLanguage(projectRoot);
  if (manifestLang !== undefined) {
    return { lang: manifestLang, source: "manifest" };
  }

  return { lang: "en", source: "default" };
}

function workflowResult(workflowPath, kind, lang) {
  return { workflowPath, kind, lang };
}

/**
 * Resolve workflow source with read-only precedence:
 * project .takt/workflows > project .takt/<lang>/workflows > package
 * .takt/<lang>/workflows.
 *
 * @param {{
 *   readonly projectRoot: string,
 *   readonly packageRoot: string,
 *   readonly lang: "en" | "ja",
 *   readonly workflowName: string,
 * }} input
 * @returns {{
 *   readonly workflowPath: string,
 *   readonly kind: "project-root" | "project-language" | "package",
 *   readonly lang: "en" | "ja",
 * } | undefined}
 */
export function resolveWorkflowAsset(input) {
  const { projectRoot, packageRoot, lang, workflowName } = input;
  if (!SUPPORTED_LANGS.has(lang)) return undefined;

  const projectRootWorkflow = join(projectRoot, ".takt", "workflows", `${workflowName}.yaml`);
  if (existsSync(projectRootWorkflow)) {
    return workflowResult(projectRootWorkflow, "project-root", lang);
  }

  const projectLangWorkflow = join(projectRoot, ".takt", lang, "workflows", `${workflowName}.yaml`);
  if (existsSync(projectLangWorkflow)) {
    return workflowResult(projectLangWorkflow, "project-language", lang);
  }

  const packageWorkflow = join(packageRoot, ".takt", lang, "workflows", `${workflowName}.yaml`);
  if (existsSync(packageWorkflow)) {
    return workflowResult(packageWorkflow, "package", lang);
  }

  return undefined;
}
