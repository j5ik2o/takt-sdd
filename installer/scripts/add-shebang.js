import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, "..", "dist", "cli.js");

const content = readFileSync(cliPath, "utf-8");
if (!content.startsWith("#!/")) {
  writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
}
chmodSync(cliPath, 0o755);

console.log("Added shebang to dist/cli.js");
