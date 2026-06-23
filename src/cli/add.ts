import { GitSource } from "../registry/git-source";
import { validatePattern } from "../core/validate";
import { materialize, writeOrigin } from "../artifact/materialize";
import { syncAgents } from "../artifact/router";
import { pingInstall } from "../registry/telemetry";

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
  writeOrigin(pattern.manifest.name, ref, cwd);
  syncAgents(cwd);
  console.log(`installed pattern "${pattern.manifest.name}" → ${dest}`);

  // Best-effort popularity signal (ADR-0001); never blocks or breaks install.
  await pingInstall(ref);
}
