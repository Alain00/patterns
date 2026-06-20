import { GitSource } from "../registry/git-source.js";
import { validatePattern } from "../core/validate.js";
import { materialize } from "../artifact/materialize.js";
import { writeRouter } from "../artifact/router.js";

/** Fetch a pattern from a git ref and materialize it into the current project (descriptive only). */
export async function add(ref: string, cwd = process.cwd()): Promise<void> {
  const source = new GitSource();
  const pattern = await source.resolve(ref);

  const issues = validatePattern(pattern);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e.message}`);
    throw new Error(`pattern "${pattern.manifest.name}" failed validation`);
  }

  const dest = materialize(pattern, cwd);
  writeRouter(cwd);
  console.log(`installed pattern "${pattern.manifest.name}" → ${dest}`);
}
