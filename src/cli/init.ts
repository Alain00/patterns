import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLE_DIRS } from "../core/bundle.js";
import { serializeManifest } from "../core/parse.js";
import type { Pattern } from "../core/schema.js";

/** Scaffold a new, empty pattern bundle directory ready for hand-authoring. */
export function init(name: string, cwd = process.cwd()): void {
  const root = join(cwd, name);
  mkdirSync(root, { recursive: true });
  for (const d of BUNDLE_DIRS) mkdirSync(join(root, d), { recursive: true });

  const pattern: Pattern = {
    root,
    manifest: {
      name,
      version: "0.1.0",
      description: "TODO: one line — what this pattern is and when to use it",
      stack: [],
      structure: [],
      rules: [],
      recipes: [],
      adrs: [],
    },
  };
  serializeManifest(pattern);

  writeFileSync(join(root, "README.md"), `# ${name}\n\nTODO: what it is, trade-offs, how to use.\n`);
  writeFileSync(join(root, "AGENTS.md"), `# ${name} — for agents\n\nTODO: how to use and extend this pattern.\n`);

  console.log(`created pattern "${name}" at ${root}`);
}
