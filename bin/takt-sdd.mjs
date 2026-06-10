#!/usr/bin/env node
import { main } from "../cli/main.mjs";
process.exit(await main(process.argv.slice(2)));
