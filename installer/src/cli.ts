import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Lang, isLang } from "./i18n.js";
import { getMessages } from "./i18n.js";
import { install } from "./install.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, "..");

interface ParsedArgs {
  lang: Lang;
  force: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    lang: "en",
    force: false,
    dryRun: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--lang": {
        const value = argv[++i];
        if (!value || !isLang(value)) {
          console.error(`Error: --lang requires "en" or "ja". Got: ${value ?? "(empty)"}`);
          process.exit(1);
        }
        args.lang = value as Lang;
        break;
      }
      case "--force":
        args.force = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    const pkg = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf-8"),
    );
    console.log(pkg.version);
    return;
  }

  if (args.help) {
    const msg = getMessages(args.lang);
    console.log(msg.helpText);
    return;
  }

  await install({
    lang: args.lang,
    force: args.force,
    dryRun: args.dryRun,
    cwd: process.cwd(),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
