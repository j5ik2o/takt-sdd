#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function configuredLanguage(root) {
  const configPath = resolve(root, ".takt", "config.yaml");
  if (!existsSync(configPath)) {
    return undefined;
  }
  const match = readFileSync(configPath, "utf8").match(/^language:\s*(en|ja)\s*$/m);
  return match?.[1];
}

export function resolveWorkflowPath(root, workflowName) {
  const preferredLanguage = configuredLanguage(root);
  const languageOrder = preferredLanguage === "en" ? ["en", "ja"] : ["ja", "en"];
  const workflowCandidates = [
    resolve(root, ".takt", "workflows", `${workflowName}.yaml`),
    ...languageOrder.map((language) => resolve(root, ".takt", language, "workflows", `${workflowName}.yaml`)),
  ];
  return workflowCandidates.find((path) => existsSync(path));
}

function stripTaskFlagForHelp(args) {
  if (!args.includes("--help") && !args.includes("-h")) {
    return args;
  }
  return args.filter((arg) => arg !== "-t" && arg !== "--task");
}

export function buildTaktArgs(workflowPath, forwardedArgs) {
  const argsForTakt = collapseTaskPayload(stripTaskFlagForHelp(forwardedArgs));
  const taskArgIndex = argsForTakt.findIndex((arg) => arg === "-t" || arg === "--task");
  return taskArgIndex === -1
    ? [...argsForTakt, "-w", workflowPath]
    : [...argsForTakt.slice(0, taskArgIndex), "-w", workflowPath, ...argsForTakt.slice(taskArgIndex)];
}

function collapseTaskPayload(args) {
  const taskArgIndex = args.findIndex((arg) => arg === "-t" || arg === "--task");
  if (taskArgIndex === -1 || taskArgIndex === args.length - 1) {
    return args;
  }

  const taskPayload = args.slice(taskArgIndex + 1).join(" ");
  return [...args.slice(0, taskArgIndex + 1), taskPayload];
}

export function main(argv = process.argv.slice(2)) {
  const [workflowName, ...forwardedArgs] = argv;

  if (!workflowName) {
    console.error("Usage: node scripts/kiro-staged.mjs <workflow-name> [takt args...]");
    return 1;
  }

  const workflowPath = resolveWorkflowPath(repoRoot, workflowName);

  if (!workflowPath) {
    console.error(`Kiro workflow '${workflowName}' is not installed yet.`);
    console.error("This command is part of the staged Kiro workflow surface.");
    console.error("Install or merge the downstream Kiro workflow implementation before running it.");
    return 1;
  }

  const taktWrapper = resolve(repoRoot, "scripts", "takt.sh");
  const command = existsSync(taktWrapper) ? taktWrapper : "takt";
  const result = spawnSync(command, buildTaktArgs(workflowPath, forwardedArgs), { stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
