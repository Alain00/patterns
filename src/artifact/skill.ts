import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONSUME_SKILL, SKILL_INSTALL_DIR } from "../core/bundle";

/** Absolute path to the consume skill that ships with this tool. */
function consumeSkillSource(): string {
  // src/artifact/skill.ts → ../../ = repo root → skills/<consume>
  return fileURLToPath(new URL(`../../skills/${CONSUME_SKILL}`, import.meta.url));
}

/**
 * Install the consume skill into a target repo at `.claude/skills/<consume>/`, so any
 * agent harness that auto-discovers project skills picks it up. DESCRIPTIVE ONLY, like
 * the rest of the artifact layer — it never touches src/.
 *
 * Clean overwrite, so a re-install (or `update`) always carries the latest skill.
 * Returns the install path, or null if the skill source can't be located (e.g. a
 * compiled binary shipped without the skills tree) — callers treat that as a no-op.
 */
export function installConsumeSkill(projectDir: string): string | null {
  const src = consumeSkillSource();
  if (!existsSync(src)) return null;
  const dest = join(projectDir, SKILL_INSTALL_DIR, CONSUME_SKILL);
  mkdirSync(dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  return dest;
}
