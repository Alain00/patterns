#!/usr/bin/env bun
import { run } from "../src/cli/index.js";

run(process.argv.slice(2)).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
