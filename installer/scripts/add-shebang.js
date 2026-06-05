import { readFileSync, writeFileSync, chmodSync, cpSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "..", "dist", "cli.js");
const kiroStagedSourcePath = resolve(__dirname, "..", "..", "scripts", "kiro-staged.mjs");
const kiroStagedAssetPath = resolve(__dirname, "..", "dist", "assets", "scripts", "kiro-staged.mjs");

const content = readFileSync(cliPath, "utf-8");
if (!content.startsWith("#!/")) {
  writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
}
chmodSync(cliPath, 0o755);

mkdirSync(dirname(kiroStagedAssetPath), { recursive: true });
cpSync(kiroStagedSourcePath, kiroStagedAssetPath);

console.log("Prepared dist/cli.js and dist/assets/scripts/kiro-staged.mjs");
