import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Lang } from "./i18n.js";
import { getMessages } from "./i18n.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, "..");

const MIN_NODE_VERSION = { major: 20, minor: 19, patch: 0 } as const;

function assertSupportedNodeVersion(): void {
  const match = process.versions.node.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return;

  const [, majorText, minorText, patchText] = match;
  const current = {
    major: Number(majorText),
    minor: Number(minorText),
    patch: Number(patchText),
  };

  const supported =
    current.major > MIN_NODE_VERSION.major
    || (current.major === MIN_NODE_VERSION.major && current.minor > MIN_NODE_VERSION.minor)
    || (
      current.major === MIN_NODE_VERSION.major
      && current.minor === MIN_NODE_VERSION.minor
      && current.patch >= MIN_NODE_VERSION.patch
    );

  if (supported) return;

  console.error(
    `Error: create-takt-sdd requires Node.js >= ${MIN_NODE_VERSION.major}.${MIN_NODE_VERSION.minor}.${MIN_NODE_VERSION.patch}. `
      + `Current: ${process.versions.node}`,
  );
  process.exit(1);
}

type RetiredCliMode = "help" | "version" | "guidance";

export function parseRetiredCliMode(argv: readonly string[]): RetiredCliMode {
  if (argv.includes("--help") || argv.includes("-h")) return "help";
  if (argv.includes("--version") || argv.includes("-v")) return "version";
  return "guidance";
}

function resolveMessageLanguage(argv: readonly string[]): Lang {
  const langIndex = argv.indexOf("--lang");
  const value = langIndex >= 0 ? argv[langIndex + 1] : undefined;
  return value === "ja" ? "ja" : "en";
}

async function main(): Promise<void> {
  assertSupportedNodeVersion();
  const argv = process.argv.slice(2);
  const mode = parseRetiredCliMode(argv);

  if (mode === "version") {
    const pkg = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf-8"),
    );
    console.log(pkg.version);
    return;
  }

  const msg = getMessages(resolveMessageLanguage(argv));

  if (mode === "help") {
    console.log(msg.retiredHelpText);
    return;
  }

  console.error(msg.retiredGuidance);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
