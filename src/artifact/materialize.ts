import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR } from "../core/bundle.js";
import type { Pattern } from "../core/schema.js";

/**
 * Write a pattern's knowledge bundle into a target project — DESCRIPTIVE ONLY.
 * Copies the bundle to <project>/.patterns/<name>/ and never touches src/ (ADR-0002).
 *
 * Returns the install path. Caller is responsible for (re)writing the router.
 */
export function materialize(pattern: Pattern, projectDir: string): string {
  const dest = join(projectDir, INSTALL_DIR, pattern.manifest.name);
  mkdirSync(join(projectDir, INSTALL_DIR), { recursive: true });
  cpSync(pattern.root, dest, { recursive: true });
  return dest;
}
