#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [, , workflowName, ...forwardedArgs] = process.argv;

if (!workflowName) {
  console.error("Usage: node scripts/kiro-staged.mjs <workflow-name> [takt args...]");
  process.exit(1);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflowCandidates = [
  resolve(repoRoot, ".takt", "workflows", `${workflowName}.yaml`),
  resolve(repoRoot, ".takt", "ja", "workflows", `${workflowName}.yaml`),
  resolve(repoRoot, ".takt", "en", "workflows", `${workflowName}.yaml`),
];

if (!workflowCandidates.some((path) => existsSync(path))) {
  console.error(`Kiro workflow '${workflowName}' is not installed yet.`);
  console.error("This command is part of the staged Kiro workflow surface.");
  console.error("Install or merge the downstream Kiro workflow implementation before running it.");
  process.exit(1);
}

const taktWrapper = resolve(repoRoot, "scripts", "takt.sh");
const command = existsSync(taktWrapper) ? taktWrapper : "takt";
const args = [...forwardedArgs, "-w", workflowName];
const result = spawnSync(command, args, { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
