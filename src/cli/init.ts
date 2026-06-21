import { mkdirSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { BUNDLE_DIRS } from "../core/bundle";
import { serializeManifest } from "../core/parse";
import type { Pattern } from "../core/schema";
import { firstPositional, parseArgs, strFlag } from "./args";

const DEFAULT_DESCRIPTION = "TODO: one line — what this pattern is and when to use it";

/**
 * Scaffold a new, empty pattern bundle directory ready for hand-authoring.
 * Options (see `patterns init --help`): --version, --description.
 */
export function init(args: string[] = [], cwd = process.cwd()): void {
  const p = parseArgs(args);
  const arg = firstPositional(p);
  if (!arg) {
    process.stderr.write(`"init" requires <name>\n`);
    process.exit(1);
  }

  // Honor an absolute path (like `emit` does); the manifest name is always the
  // bundle's own directory name, never the full path the user typed.
  const root = isAbsolute(arg) ? arg : join(cwd, arg);
  const name = basename(arg);
  mkdirSync(root, { recursive: true });
  for (const d of BUNDLE_DIRS) mkdirSync(join(root, d), { recursive: true });

  const pattern: Pattern = {
    root,
    manifest: {
      name,
      version: strFlag(p, "version") ?? "0.1.0",
      description: strFlag(p, "description") ?? DEFAULT_DESCRIPTION,
      stack: [],
      structure: [],
      rules: [],
      recipes: [],
      adrs: [],
      boundaries: [],
    },
  };
  serializeManifest(pattern);

  writeFileSync(join(root, "README.md"), `# ${name}\n\nTODO: what it is, trade-offs, how to use.\n`);
  writeFileSync(join(root, "AGENTS.md"), `# ${name} — for agents\n\nTODO: how to use and extend this pattern.\n`);

  console.log(`created pattern "${name}" at ${root}`);
}
